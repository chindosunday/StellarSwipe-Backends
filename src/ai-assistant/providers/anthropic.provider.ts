import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLLMProvider } from './base-llm.provider';
import { LLMMessage, LLMResponse, LLMOptions } from '../interfaces/llm-provider.interface';

// Note: You'll need to install: npm install @anthropic-ai/sdk

@Injectable()
export class AnthropicProvider extends BaseLLMProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: any; // Anthropic client

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('ANTHROPIC_API_KEY');
    super(apiKey, 'claude-3-opus');
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Dynamic import to avoid hard dependency
      const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
      this.logger.debug('Anthropic client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Anthropic client', error);
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
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
          maxTokens: 2000,
        },
        options,
      );

      // Anthropic expects system as a separate parameter
      const formattedMessages = messages;

      const response = await this.client.messages.create({
        model: mergedOptions.model,
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        system: systemPrompt,
        messages: formattedMessages,
      });

      const content = response.content[0]?.text || '';
      const responseTime = Date.now() - startTime;

      return {
        content,
        modelUsed: response.model,
        tokenUsage: {
          prompt: response.usage?.input_tokens || 0,
          completion: response.usage?.output_tokens || 0,
          total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      this.logger.error('Error sending message to Anthropic', error);
      throw error;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test with a simple message
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Using cheaper model for validation
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return !!response;
    } catch (error) {
      this.logger.error('API key validation failed', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic models (as of knowledge cutoff)
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  calculateTokens(content: string): number {
    // Anthropic uses similar tokenization to OpenAI
    const words = content.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }
}
