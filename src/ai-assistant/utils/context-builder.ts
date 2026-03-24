import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserContext } from '../entities/user-context.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ContextManagerInterface } from '../interfaces/context-manager.interface';

@Injectable()
export class ContextBuilderService implements ContextManagerInterface {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    @InjectRepository(UserContext)
    private userContextRepository: Repository<UserContext>,
  ) {}

  async getUserContext(userId: string): Promise<UserContext | null> {
    return await this.userContextRepository.findOne({
      where: { userId },
    });
  }

  async updateUserContext(
    userId: string,
    contextUpdates: Partial<UserContext>,
  ): Promise<UserContext> {
    let userContext = await this.getUserContext(userId);

    if (!userContext) {
      userContext = this.userContextRepository.create({
        userId,
        ...contextUpdates,
      });
    } else {
      Object.assign(userContext, contextUpdates);
    }

    return await this.userContextRepository.save(userContext);
  }

  async buildContextFromHistory(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    // Extract key discussion topics
    const topics = this.extractTopics(messages);
    if (topics.length > 0) {
      contextParts.push(`Recent topics discussed: ${topics.join(', ')}`);
    }

    // Identify user expertise level from questions
    const expertiseLevel = this.inferExpertiseLevel(messages);
    contextParts.push(`Inferred user level: ${expertiseLevel}`);

    // Track repeated questions (shows confusion)
    const repeatedTopics = this.findRepeatedTopics(messages);
    if (repeatedTopics.length > 0) {
      contextParts.push(`Topics requiring reinforcement: ${repeatedTopics.join(', ')}`);
    }

    return contextParts.join('\n');
  }

  async enrichContextWithUserData(userId: string, context: string): Promise<string> {
    const userContext = await this.getUserContext(userId);

    if (!userContext) {
      return context;
    }

    const enrichments: string[] = [context];

    if (userContext.userProfile) {
      enrichments.push(`User profile: ${userContext.userProfile}`);
    }

    if (userContext.primaryInterest) {
      enrichments.push(`Primary interest: ${userContext.primaryInterest}`);
    }

    if (userContext.preferences?.technicalLevel) {
      enrichments.push(`Technical level preference: ${userContext.preferences.technicalLevel}`);
    }

    if (userContext.recentTopics.length > 0) {
      enrichments.push(`Recently discussed: ${userContext.recentTopics.join(', ')}`);
    }

    return enrichments.join('\n');
  }

  async getRecentTopics(userId: string, limit: number = 5): Promise<string[]> {
    const userContext = await this.getUserContext(userId);
    return userContext?.recentTopics?.slice(0, limit) || [];
  }

  async addTopicToContext(userId: string, topic: string): Promise<void> {
    const userContext = await this.getUserContext(userId);

    if (!userContext) {
      await this.updateUserContext(userId, {
        recentTopics: [topic],
      });
      return;
    }

    // Remove if already exists and add to front
    const topics = userContext.recentTopics.filter((t) => t !== topic);
    topics.unshift(topic);

    // Keep only last 10 topics
    await this.updateUserContext(userId, {
      recentTopics: topics.slice(0, 10),
    });
  }

  private extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();

    // Simple topic extraction - can be enhanced with NLP
    const topicKeywords = {
      signals: ['signal', 'provider', 'follow'],
      trading: ['trade', 'strategy', 'buy', 'sell', 'position'],
      portfolio: ['portfolio', 'holdings', 'performance'],
      stellar: ['stellar', 'lumens', 'xlm', 'blockchain'],
      security: ['secure', 'password', '2fa', 'authentication'],
      market: ['market', 'analysis', 'trend', 'volatility'],
    };

    messages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some((kw) => content.includes(kw))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  private inferExpertiseLevel(messages: ChatMessage[]): string {
    if (messages.length < 3) {
      return 'beginner';
    }

    const userMessages = messages.filter((m) => m.role === 'user');
    const complexityScore = userMessages.reduce((score, msg) => {
      const content = msg.content.toLowerCase();
      // Check for technical terms
      const technicalTerms = [
        'rsi',
        'macd',
        'bollinger',
        'fibonacci',
        'leverage',
        'liquidation',
        'orderbook',
      ];
      const termCount = technicalTerms.filter((term) => content.includes(term)).length;
      return score + termCount;
    }, 0);

    if (complexityScore > 5) return 'advanced';
    if (complexityScore > 2) return 'intermediate';
    return 'beginner';
  }

  private findRepeatedTopics(messages: ChatMessage[]): string[] {
    const topics = this.extractTopics(messages);
    const topicCounts: Record<string, number> = {};

    messages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      topics.forEach((topic) => {
        if (content.includes(topic)) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    });

    return Object.entries(topicCounts)
      .filter(([, count]) => count > 2)
      .map(([topic]) => topic);
  }
}
