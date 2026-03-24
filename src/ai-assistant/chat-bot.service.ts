import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UserContext } from './entities/user-context.entity';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ConversationHistoryDto } from './dto/conversation-history.dto';
import { LLMProviderInterface, LLMMessage } from './interfaces/llm-provider.interface';
import { ContextBuilderService } from './utils/context-builder';
import { ResponseFormatterService } from './utils/response-formatter';
import { SYSTEM_PROMPT, TRADING_EXPERT_PROMPT } from './prompts/system-prompt';
import { searchFAQ } from './prompts/faq-handler';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private llmProviders: Map<string, LLMProviderInterface> = new Map();

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(UserContext)
    private userContextRepository: Repository<UserContext>,
    private contextBuilder: ContextBuilderService,
    private responseFormatter: ResponseFormatterService,
    private openAiProvider: OpenAiProvider,
    private anthropicProvider: AnthropicProvider,
  ) {
    this.initializeLLMProviders();
  }

  private initializeLLMProviders(): void {
    try {
      this.llmProviders.set('openai', this.openAiProvider);
      this.llmProviders.set('anthropic', this.anthropicProvider);
      this.logger.debug('LLM providers initialized');
    } catch (error) {
      this.logger.error('Failed to initialize LLM providers', error);
    }
  }

  async processMessage(
    userId: string,
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      // Validate conversation exists and belongs to user
      const conversation = await this.validateConversation(
        userId,
        request.conversationId,
      );

      // Fetch conversation history
      const history = await this.chatMessageRepository.find({
        where: { conversationId: request.conversationId },
        order: { createdAt: 'ASC' },
        take: 20, // Last 20 messages for context
      });

      // Save user message
      const userMessage = await this.saveMessage(
        request.conversationId,
        'user',
        request.message,
        'user',
      );

      // Build context
      const userContext = await this.contextBuilder.getUserContext(userId);
      let enrichedContext = await this.contextBuilder.buildContextFromHistory(
        history,
      );
      enrichedContext = await this.contextBuilder.enrichContextWithUserData(
        userId,
        enrichedContext,
      );

      // Check if FAQ can answer this
      const faqResults = searchFAQ(request.message);
      let selectedPrompt = SYSTEM_PROMPT;
      let usesFAQ = false;

      if (faqResults.length > 0 && faqResults[0].relevanceScore > 0.6) {
        usesFAQ = true;
        // Provide enhanced response with FAQ data
        const faqResponse = this.formatFAQResponse(faqResults);
        const assistantMessage = await this.saveMessage(
          request.conversationId,
          'assistant',
          faqResponse,
          'system',
        );

        // Update topic context
        if (request.topic) {
          await this.contextBuilder.addTopicToContext(userId, request.topic);
        }

        return this.responseFormatter.formatResponse(
          {
            content: faqResponse,
            modelUsed: 'faq-system',
            tokenUsage: {
              prompt: 0,
              completion: 0,
              total: 0,
            },
          },
          request.conversationId,
          assistantMessage.id,
          0,
        );
      }

      // Use LLM for complex queries
      const provider = this.selectProvider(request.preferredModel);
      const llmMessages = this.convertHistoryToLLMMessages(history, userMessage);

      const startTime = Date.now();
      const llmResponse = await provider.sendMessage(
        llmMessages,
        selectedPrompt + '\n\nUser Context:\n' + enrichedContext,
        {
          model: request.preferredModel,
          temperature: 0.7,
          maxTokens: 2000,
        },
      );
      const responseTime = Date.now() - startTime;

      // Save assistant response
      const assistantMessage = await this.saveMessage(
        request.conversationId,
        'assistant',
        llmResponse.content,
        llmResponse.modelUsed,
        llmResponse.tokenUsage.total,
        responseTime,
      );

      // Update conversation metadata
      await this.updateConversationStats(
        request.conversationId,
        request.topic || 'general',
      );

      // Update user context
      if (request.topic) {
        await this.contextBuilder.addTopicToContext(userId, request.topic);
      }

      const citations = this.responseFormatter.extractCitations(llmResponse.content);

      return this.responseFormatter.formatResponse(
        { ...llmResponse, citations },
        request.conversationId,
        assistantMessage.id,
        responseTime,
      );
    } catch (error) {
      this.logger.error('Error processing message', error);
      throw error;
    }
  }

  async createConversation(userId: string, title?: string): Promise<Conversation> {
    try {
      const conversation = this.conversationRepository.create({
        userId,
        title: title || `Conversation ${new Date().toLocaleDateString()}`,
        metadata: {
          createdBy: 'user',
          version: 1,
        },
      });

      return await this.conversationRepository.save(conversation);
    } catch (error) {
      this.logger.error('Error creating conversation', error);
      throw new InternalServerErrorException('Failed to create conversation');
    }
  }

  async getConversationHistory(
    userId: string,
    conversationId: string,
  ): Promise<ConversationHistoryDto> {
    try {
      const conversation = await this.validateConversation(userId, conversationId);

      const messages = await this.chatMessageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
      });

      return {
        conversationId: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        lastActivityAt: conversation.lastActivityAt,
        messageCount: conversation.messageCount,
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
          modelUsed: msg.modelUsed,
        })),
      };
    } catch (error) {
      this.logger.error('Error retrieving conversation history', error);
      throw error;
    }
  }

  async listConversations(userId: string, skip: number = 0, take: number = 10): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    try {
      const [conversations, total] = await this.conversationRepository.findAndCount({
        where: { userId, status: 'active' },
        order: { lastActivityAt: 'DESC' },
        skip,
        take,
      });

      return { conversations, total };
    } catch (error) {
      this.logger.error('Error listing conversations', error);
      throw error;
    }
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      const conversation = await this.validateConversation(userId, conversationId);
      conversation.status = 'deleted';
      await this.conversationRepository.save(conversation);
    } catch (error) {
      this.logger.error('Error deleting conversation', error);
      throw error;
    }
  }

  async archiveConversation(userId: string, conversationId: string): Promise<void> {
    try {
      const conversation = await this.validateConversation(userId, conversationId);
      conversation.status = 'archived';
      await this.conversationRepository.save(conversation);
    } catch (error) {
      this.logger.error('Error archiving conversation', error);
      throw error;
    }
  }

  private async validateConversation(
    userId: string,
    conversationId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    modelUsed: string,
    tokenUsage?: number,
    responseTime?: number,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      id: uuidv4(),
      conversationId,
      role,
      content,
      modelUsed,
      tokenUsage,
      responseTime,
      metadata: {
        sanitized: false,
      },
    });

    return await this.chatMessageRepository.save(message);
  }

  private convertHistoryToLLMMessages(
    history: ChatMessage[],
    newMessage: ChatMessage,
  ): LLMMessage[] {
    const messages: LLMMessage[] = history
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    messages.push({
      role: newMessage.role,
      content: newMessage.content,
    });

    return messages;
  }

  private selectProvider(preferredModel?: string): LLMProviderInterface {
    if (preferredModel?.includes('gpt')) {
      return this.llmProviders.get('openai');
    }
    if (preferredModel?.includes('claude')) {
      return this.llmProviders.get('anthropic');
    }

    // Default to OpenAI if not specified
    return this.llmProviders.get('openai');
  }

  private formatFAQResponse(faqResults: any[]): string {
    const topResult = faqResults[0];
    let response = `**${topResult.question}**\n\n${topResult.answer}\n\n`;

    if (faqResults.length > 1) {
      response += '**Related questions:**\n';
      faqResults.slice(1, 3).forEach((faq) => {
        response += `- ${faq.question}\n`;
      });
    }

    return response;
  }

  private async updateConversationStats(
    conversationId: string,
    topic: string,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (conversation) {
      conversation.messageCount += 2; // User message + assistant response
      conversation.lastActivityAt = new Date();

      if (!conversation.metadata) {
        conversation.metadata = {};
      }
      if (!conversation.metadata.topicsDiscussed) {
        conversation.metadata.topicsDiscussed = [];
      }

      if (
        !conversation.metadata.topicsDiscussed.includes(topic) &&
        topic !== 'general'
      ) {
        conversation.metadata.topicsDiscussed.push(topic);
      }

      await this.conversationRepository.save(conversation);
    }
  }
}
