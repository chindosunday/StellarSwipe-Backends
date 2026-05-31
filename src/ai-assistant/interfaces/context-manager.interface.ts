import { UserContext } from '../entities/user-context.entity';
import { ChatMessage } from '../entities/chat-message.entity';

export interface ContextManagerInterface {
  getUserContext(userId: string): Promise<UserContext | null>;
  updateUserContext(userId: string, context: Partial<UserContext>): Promise<UserContext>;
  buildContextFromHistory(messages: ChatMessage[]): Promise<string>;
  enrichContextWithUserData(userId: string, context: string): Promise<string>;
  getRecentTopics(userId: string, limit?: number): Promise<string[]>;
  addTopicToContext(userId: string, topic: string): Promise<void>;
}
