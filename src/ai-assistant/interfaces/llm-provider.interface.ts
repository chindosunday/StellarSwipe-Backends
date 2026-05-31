export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  modelUsed: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  citations?: Array<{
    title: string;
    url: string;
    relevance: string;
  }>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMProviderInterface {
  sendMessage(
    messages: LLMMessage[],
    systemPrompt: string,
    options?: LLMOptions,
  ): Promise<LLMResponse>;
  validateApiKey(): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  calculateTokens(content: string): number;
}
