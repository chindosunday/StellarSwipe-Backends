import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatBotService } from './chat-bot.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ConversationHistoryDto } from './dto/conversation-history.dto';
import { Conversation } from './entities/conversation.entity';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('AI Assistant / Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai-assistant')
export class ChatBotController {
  private readonly logger = new Logger(ChatBotController.name);

  constructor(private chatBotService: ChatBotService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: Conversation,
  })
  async createConversation(
    @CurrentUser() user: any,
    @Body('title') title?: string,
  ): Promise<Conversation> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    return await this.chatBotService.createConversation(user.id, title);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Message processed and response received',
    type: ChatResponseDto,
  })
  async sendMessage(
    @CurrentUser() user: any,
    @Body() request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    if (!request.conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }

    if (!request.message || request.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (request.message.length > 5000) {
      throw new BadRequestException('Message exceeds maximum length of 5000 characters');
    }

    try {
      return await this.chatBotService.processMessage(user.id, request);
    } catch (error) {
      this.logger.error('Error processing chat message', error);
      throw error;
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the user' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async listConversations(
    @CurrentUser() user: any,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    // Validate pagination parameters
    if (skip < 0 || take < 1 || take > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return await this.chatBotService.listConversations(user.id, skip, take);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation history with all messages' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved',
    type: ConversationHistoryDto,
  })
  async getConversationHistory(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ): Promise<ConversationHistoryDto> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    return await this.chatBotService.getConversationHistory(user.id, conversationId);
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully',
  })
  async deleteConversation(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    return await this.chatBotService.deleteConversation(user.id, conversationId);
  }

  @Post('conversations/:conversationId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation archived successfully',
  })
  async archiveConversation(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }

    return await this.chatBotService.archiveConversation(user.id, conversationId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI Assistant health status' })
  @ApiResponse({
    status: 200,
    description: 'AI Assistant is operational',
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    providers: { name: string; status: string }[];
  }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      providers: [
        { name: 'OpenAI', status: 'configured' },
        { name: 'Anthropic', status: 'configured' },
      ],
    };
  }
}
