export class ConversationHistoryDto {
  conversationId: string;
  title: string;
  createdAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    modelUsed?: string;
  }>;
}
