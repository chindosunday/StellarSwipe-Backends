import { Injectable, BadRequestException } from '@nestjs/common';
import { LLMMessage, LLMResponse, LLMOptions, LLMProviderInterface } from '../interfaces/llm-provider.interface';

@Injectable()
export abstract class BaseLLMProvider implements LLMProviderInterface {
  protected apiKey: string;
  protected modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.validateInitialization();
  }

  protected validateInitialization(): void {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new BadRequestException('API key is required for LLM provider');
    }
  }

  abstract sendMessage(
    messages: LLMMessage[],
    systemPrompt: string,
    options?: LLMOptions,
  ): Promise<LLMResponse>;

  abstract validateApiKey(): Promise<boolean>;

  abstract getAvailableModels(): Promise<string[]>;

  /**
   * Simple token estimation (approximately 4 characters = 1 token)
   * Override in subclasses for more accurate counting
   */
  calculateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  protected buildMessages(
    systemPrompt: string,
    messages: LLMMessage[],
  ): LLMMessage[] {
    return [{ role: 'system', content: systemPrompt }, ...messages];
  }

  protected mergeOptions(defaults: LLMOptions, overrides?: LLMOptions): LLMOptions {
    return {
      temperature: overrides?.temperature ?? defaults.temperature ?? 0.7,
      maxTokens: overrides?.maxTokens ?? defaults.maxTokens ?? 2000,
      topP: overrides?.topP ?? defaults.topP ?? 1,
      frequencyPenalty: overrides?.frequencyPenalty ?? defaults.frequencyPenalty ?? 0,
      presencePenalty: overrides?.presencePenalty ?? defaults.presencePenalty ?? 0,
      model: overrides?.model ?? defaults.model ?? this.modelName,
    };
  }
}
