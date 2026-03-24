export class ChatResponseDto {
  messageId: string;
  conversationId: string;
  role: 'assistant' | 'system';
  content: string;
  modelUsed: string;
  timestamp: Date;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  responseTime: number; // milliseconds
  citations?: Array<{
    title: string;
    url: string;
    relevance: string;
  }>;
  suggestedFollowUps?: string[];
}
