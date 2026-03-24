import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UserContext } from './entities/user-context.entity';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { ContextBuilderService } from './utils/context-builder';
import { ResponseFormatterService } from './utils/response-formatter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatMessage, UserContext]),
    ConfigModule,
  ],
  controllers: [ChatBotController],
  providers: [
    ChatBotService,
    OpenAiProvider,
    AnthropicProvider,
    ContextBuilderService,
    ResponseFormatterService,
  ],
  exports: [ChatBotService],
})
export class AiAssistantModule {}
