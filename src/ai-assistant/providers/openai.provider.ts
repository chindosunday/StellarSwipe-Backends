import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLLMProvider } from './base-llm.provider';
import { LLMMessage, LLMResponse, LLMOptions } from '../interfaces/llm-provider.interface';

// Note: You'll need to install: npm install openai
// This example assumes using the official OpenAI API client

@Injectable()
export class OpenAiProvider extends BaseLLMProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: any; // OpenAI client

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('OPENAI_API_KEY');
    super(apiKey, 'gpt-4');
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Dynamic import to avoid hard dependency
      const OpenAI = require('openai').default || require('openai');
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
      this.logger.debug('OpenAI client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI client', error);
      throw error;
    }
  }

  async sendMessage(
    messages: LLMMessage[],
    systemPrompt: string,
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const mergedOptions = this.mergeOptions(
        {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        },
        options,
      );

      const formattedMessages = this.buildMessages(systemPrompt, messages);

      const response = await this.client.chat.completions.create({
        model: mergedOptions.model,
        messages: formattedMessages,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        top_p: mergedOptions.topP,
        frequency_penalty: mergedOptions.frequencyPenalty,
        presence_penalty: mergedOptions.presencePenalty,
      });

      const content = response.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;

      return {
        content,
        modelUsed: response.model,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Error sending message to OpenAI', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.length > 0;
    } catch (error) {
      this.logger.error('API key validation failed', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      // Note: This would require listing models endpoint
      // For now, returning known GPT models
      return ['gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'];
    } catch (error) {
      this.logger.error('Failed to retrieve available models', error);
      throw error;
    }
  }

  calculateTokens(content: string): number {
    // OpenAI uses approximately 1 token per 4 characters, but can be more precise
    // This is a simplified estimation
    const words = content.split(/\s+/).length;
    return Math.ceil(words * 1.3); // Rough approximation: 1 token per 0.75 words
  }
}
