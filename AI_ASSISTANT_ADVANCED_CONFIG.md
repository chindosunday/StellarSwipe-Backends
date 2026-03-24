# AI Assistant Advanced Configuration

Complete configuration guide for fine-tuning the AI Assistant behavior.

## System Prompts

### Modifying System Prompt

Edit `src/ai-assistant/prompts/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `You are an expert AI assistant for StellarSwipe...
// Customize this based on your requirements
`;
```

**Key elements to include:**
- System role and expertise area
- Target audience (beginner/advanced)
- Response format expectations
- Safety guidelines and disclaimers
- Platform-specific context

### Context-Specific Prompts

Create domain-specific prompts for different scenarios:

```typescript
// For risk management questions
export const RISK_MANAGEMENT_PROMPT = `
You are a risk management expert focused on protecting trading capital...
Important principles:
- Always prioritize capital preservation
- Every trade should have a stop-loss
- Position sizing is critical
- Avoid over-leveraging
`;

// For technical analysis questions
export const TECHNICAL_ANALYSIS_PROMPT = `
You are a technical analysis expert...
Key indicators to discuss:
- Support and resistance levels
- Moving averages
- RSI and MACD
- Chart patterns
`;
```

Then update service to use context-based prompts:

```typescript
private selectSystemPrompt(topic?: string): string {
  switch (topic) {
    case 'risk':
      return RISK_MANAGEMENT_PROMPT;
    case 'technical':
      return TECHNICAL_ANALYSIS_PROMPT;
    default:
      return SYSTEM_PROMPT;
  }
}
```

## LLM Provider Configuration

### OpenAI Advanced Options

```typescript
// In openai.provider.ts sendMessage method

const response = await this.client.chat.completions.create({
  model: 'gpt-4',
  messages: formattedMessages,
  temperature: 0.7,           // 0=deterministic, 1=creative (0.5-0.8 typical)
  max_tokens: 2000,           // Limit response length
  top_p: 0.9,                 // Nucleus sampling (0-1)
  frequency_penalty: 0.5,     // Penalize repetition (-2 to 2)
  presence_penalty: 0.5,      // Encourage new topics (-2 to 2)
  
  // Optional advanced parameters:
  logit_bias: {               // Bias token probabilities
    // "token_id": 100 // Increase probability
  },
  
  // For function calling (future enhancement):
  functions: [
    {
      name: 'execute_trade',
      description: 'Execute a trading action',
      parameters: { ... }
    }
  ],
  
  // For response format:
  response_format: { type: 'json_object' }, // Require JSON output
});
```

### Anthropic Advanced Options

```typescript
// In anthropic.provider.ts sendMessage method

const response = await this.client.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 2048,
  system: systemPrompt,
  
  // Streaming responses (future enhancement)
  stream: false,
  
  // Temperature control
  temperature: 0.7,
  
  // Top-p (nucleus) sampling
  top_p: 1.0,
  
  // For vision capabilities (future)
  messages: formattedMessages,
  // Can include: vision_type: "image"
});
```

### Temperature Settings Guide

```
Temperature    Behavior           Use Case
0.0           Deterministic       Factual questions, calculations
0.3-0.5       Focused            Technical information, FAQs
0.7           Balanced           General conversation (DEFAULT)
0.9-1.0       Creative           Brainstorming, creative writing
```

## Context Management Configuration

### Enriching User Context

Customize `context-builder.ts` to extract more information:

```typescript
// Add new topic keywords
private readonly topicKeywords = {
  signals: ['signal', 'provider', 'follow', 'subscription'],
  trading: ['trade', 'strategy', 'buy', 'sell', 'position'],
  risk: ['risk', 'stop-loss', 'loss', 'drawdown'],
  stellar: ['stellar', 'xlm', 'lumens', 'blockchain'],
  defi: ['lending', 'yield', 'farming', 'pool'],
  institutional: ['enterprise', 'api', 'webhook', 'integration'],
};

// Add new expertise indicators
private readonly expertiseIndicators = {
  advanced: [
    'liquidity', 'slippage', 'impermanent loss',
    'volatility smile', 'greeks', 'stochastic'
  ],
  intermediate: [
    'support', 'resistance', 'macd', 'rsi',
    'fibonacci', 'bollinger'
  ],
  beginner: [
    'buy', 'sell', 'price', 'chart', 'trend'
  ],
};
```

### User Preference Profiles

Extend `UserContext` entity for richer profiles:

```typescript
@Column({ type: 'jsonb', default: {} })
preferences: {
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh';
  responseLength?: 'short' | 'medium' | 'long';
  technicalLevel?: 'basic' | 'intermediate' | 'advanced';
  focusAreas?: string[];
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  communicationStyle?: 'academic' | 'casual' | 'technical';
}
```

Update context builder to use these preferences:

```typescript
private enrichContextWithPreferences(context: string, user: UserContext): string {
  const prefs = user.preferences;
  let enriched = context;
  
  if (prefs.communicationStyle === 'academic') {
    enriched += '\nUse academic language with citations.';
  } else if (prefs.communicationStyle === 'casual') {
    enriched += '\nUse conversational, friendly language.';
  }
  
  enriched += `\nTechnical level: ${prefs.technicalLevel}`;
  
  return enriched;
}
```

## Response Formatting

### Custom Response Processing

Extend `response-formatter.ts`:

```typescript
// Add markdown enhancements
private enhanceMarkdown(content: string): string {
  // Add table formatting
  content = this.formatTables(content);
  
  // Add code block syntax highlighting cues
  content = content.replace(
    /```(\w+)?\n/g, 
    '\n```$1\n'
  );
  
  // Add emoji indicators for key sections
  content = content.replace(
    /^(Warning|Important|Note):/gm,
    '⚠️ $1:'
  );
  
  return content;
}

// Add citation formatting
private formatCitations(citations: any[]): string {
  return citations
    .map((c, i) => `[${ i + 1 }] ${c.title} (${c.relevance})`)
    .join('\n');
}

// Add response signing
private signResponse(content: string, model: string): string {
  const timestamp = new Date().toISOString();
  return `${content}\n\n---\n*Powered by ${model} | ${timestamp}*`;
}
```

## FAQ Database Enhancements

### Adding Custom FAQs

Extend `faq-handler.ts`:

```typescript
export const CUSTOM_FAQS = {
  yourDomain: [
    {
      id: 'custom-1',
      question: 'How do I link my Stellar wallet?',
      answer: 'Go to Settings > Wallets > Add Stellar Wallet...',
      category: 'Integration',
      tags: ['stellar', 'wallet', 'setup'],
    },
    // ... more FAQs
  ],
};

// Improve search with semantic similarity
function semanticSearch(query: string, faqs: any[]): any[] {
  return faqs
    .map(faq => ({
      ...faq,
      score: calculateSemanticSimilarity(query, faq.question),
    }))
    .filter(f => f.score > 0.4)
    .sort((a, b) => b.score - a.score);
}
```

## Rate Limiting

### Configure Per-User Limits

```typescript
// In a new rate-limiter.service.ts
@Injectable()
export class RateLimiterService {
  private userLimits = new Map<string, { count: number; resetTime: number }>();
  
  private readonly LIMITS = {
    free: 10,      // 10 messages per hour
    premium: 100,  // 100 messages per hour
    enterprise: -1, // Unlimited
  };
  
  async checkLimit(userId: string, tier: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.userLimits.get(userId);
    
    if (!limit || now > limit.resetTime) {
      this.userLimits.set(userId, {
        count: 1,
        resetTime: now + 3600000, // 1 hour
      });
      return true;
    }
    
    if (limit.count < this.LIMITS[tier]) {
      limit.count++;
      return true;
    }
    
    return false;
  }
}
```

Use in controller:

```typescript
@Post('chat')
async sendMessage(
  @CurrentUser() user: any,
  @Body() request: ChatRequestDto,
): Promise<ChatResponseDto> {
  const canProceed = await this.rateLimiter.checkLimit(user.id, user.tier);
  if (!canProceed) {
    throw new BadRequestException('Rate limit exceeded');
  }
  // ... continue
}
```

## Caching Strategy

### Implement Response Caching

```typescript
// In a new cache.service.ts
@Injectable()
export class CacheService {
  private cache = new Map<string, { data: any; ttl: number }>();
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      ttl: Date.now() + ttl,
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Usage in service
async sendMessage(userId: string, request: ChatRequestDto): Promise<ChatResponseDto> {
  // Check cache for FAQ responses
  const cacheKey = `faq:${request.message.toLowerCase()}`;
  const cached = this.cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // ... proceed with LLM call
  
  // Cache if FAQ response
  if (usesFAQ) {
    this.cache.set(cacheKey, result);
  }
  
  return result;
}
```

## Monitoring & Analytics

### Track Custom Metrics

```typescript
// In a new analytics.service.ts
@Injectable()
export class AnalyticsService {
  private metrics = {
    totalMessages: 0,
    totalTokens: 0,
    avgResponseTime: 0,
    modelUsage: new Map<string, number>(),
    topicDistribution: new Map<string, number>(),
    errorCount: 0,
    faqHitRate: 0,
  };
  
  recordMessage(
    model: string,
    topic: string,
    responseTime: number,
    tokens: number,
    wasFAQ: boolean,
  ): void {
    this.metrics.totalMessages++;
    this.metrics.totalTokens += tokens;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.totalMessages - 1) + responseTime) /
      this.metrics.totalMessages;
    
    this.metrics.modelUsage.set(
      model,
      (this.metrics.modelUsage.get(model) || 0) + 1
    );
    
    this.metrics.topicDistribution.set(
      topic,
      (this.metrics.topicDistribution.get(topic) || 0) + 1
    );
    
    if (wasFAQ) {
      this.metrics.faqHitRate =
        (this.metrics.faqHitRate * (this.metrics.totalMessages - 1) + 1) /
        this.metrics.totalMessages;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      modelUsage: Object.fromEntries(this.metrics.modelUsage),
      topicDistribution: Object.fromEntries(this.metrics.topicDistribution),
    };
  }
}
```

## Testing Configuration

### Add Integration Tests

```typescript
// conversation.e2e-spec.ts
describe('AI Assistant E2E', () => {
  let app: INestApplication;
  let chatService: ChatBotService;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    chatService = moduleFixture.get<ChatBotService>(ChatBotService);
    await app.init();
  });
  
  it('should handle conversation flow', async () => {
    // Create conversation
    const conv = await chatService.createConversation('test-user');
    expect(conv).toBeDefined();
    
    // Send message
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai-assistant/chat')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        conversationId: conv.id,
        message: 'What is cryptocurrency?',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.content).toBeDefined();
  });
});
```

## Environment-Specific Configuration

```env
# Development
NODE_ENV=development
LOG_LEVEL=debug
MOCK_LLM=false
CACHE_ENABLED=false

# Staging
NODE_ENV=staging
LOG_LEVEL=info
MOCK_LLM=false
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true

# Production
NODE_ENV=production
LOG_LEVEL=warn
MOCK_LLM=false
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
REQUEST_TIMEOUT=30000
MAX_CONVERSATION_HISTORY=50
```

## Performance Tuning

### Database Query Optimization

```typescript
// Add query optimization in service
async getConversationHistory(
  userId: string,
  conversationId: string,
) {
  return await this.chatMessageRepository.find({
    where: { conversationId },
    order: { createdAt: 'ASC' },
    take: 20,           // Limit messages
    cache: true,        // Enable QueryResultCache
    cacheDuration: 3600, // 1 hour
  });
}
```

### Connection Pooling

```typescript
// In TypeORM config
TypeOrmModule.forRoot({
  // ... other config
  extra: {
    max: 20,           // Maximum connections
    min: 5,            // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
})
```

---

For more information, see `AI_ASSISTANT_IMPLEMENTATION.md` and `AI_ASSISTANT_QUICK_START.md`.

**Last Updated**: March 24, 2024  
**Version**: 1.0.0
