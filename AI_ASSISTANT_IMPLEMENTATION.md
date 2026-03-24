# AI Assistant / Chatbot Implementation Guide

## Overview

This document provides a complete guide to the AI Assistant (Chatbot) implementation for StellarSwipe. The system enables users to ask questions about trading, signals, and platform features, powered by OpenAI (GPT) or Anthropic (Claude) APIs.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ChatBot Controller                    │
│          (Handles HTTP Requests/Responses)               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   ChatBot Service                        │
│        (Core Business Logic & Orchestration)             │
└──┬──────────────────┬──────────────────┬────────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
│ LLM Provider│ │Context Builder│ │Response Formatter│
│ (OpenAI/   │ │(User Context  │ │(Format & Enrich │
│ Anthropic) │ │ Management)   │ │ Response)       │
└─────────────┘ └──────────────┘ └─────────────────┘
        │              │                   │
        └──────────────┴───────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
        ▼                          ▼
    ┌──────────────┐      ┌─────────────────┐
    │ Conversation │      │  Chat Messages  │
    │   Entity     │      │    Entity       │
    └──────────────┘      └─────────────────┘
        │                       │
        └───────────────────────┘
                 │
                 ▼
          ┌──────────────┐
          │   Database   │
          │  (PostgreSQL)│
          └──────────────┘
```

## Project Structure

```
src/ai-assistant/
├── ai-assistant.module.ts           # Module definition
├── chat-bot.controller.ts            # REST endpoints
├── chat-bot.service.ts               # Core service
├── chat-bot.service.spec.ts         # Unit tests
│
├── entities/
│   ├── conversation.entity.ts        # Conversation model
│   ├── chat-message.entity.ts        # Message model
│   └── user-context.entity.ts        # User context model
│
├── dto/
│   ├── chat-request.dto.ts           # Request DTO
│   ├── chat-response.dto.ts          # Response DTO
│   └── conversation-history.dto.ts  # History DTO
│
├── interfaces/
│   ├── llm-provider.interface.ts     # LLM interface
│   └── context-manager.interface.ts  # Context interface
│
├── providers/
│   ├── base-llm.provider.ts          # Base LLM class
│   ├── openai.provider.ts            # OpenAI implementation
│   └── anthropic.provider.ts         # Anthropic implementation
│
├── prompts/
│   ├── system-prompt.ts              # Main system prompt
│   ├── trading-expert.ts             # Trading-specific prompts
│   └── faq-handler.ts                # FAQ database & search
│
└── utils/
    ├── context-builder.ts            # Context management
    └── response-formatter.ts         # Response formatting
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install openai @anthropic-ai/sdk
npm install --save-dev @types/node
```

### 2. Environment Variables

Create or update your `.env` file:

```env
# LLM Providers
OPENAI_API_KEY=sk_live_xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stellarswipe
DB_USER=postgres
DB_PASSWORD=password

# API Configuration
NODE_ENV=development
PORT=3000
```

### 3. Database Migration

Run the migration to create tables:

```bash
npm run typeorm migration:run
```

Or using NestJS CLI:

```bash
npm run migrate
```

### 4. Module Registration

Add the AI Assistant module to your main app module:

```typescript
// src/app.module.ts
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';

@Module({
  imports: [
    // ... other imports
    AiAssistantModule,
  ],
})
export class AppModule {}
```

## API Endpoints

### 1. Create Conversation

**POST** `/api/v1/ai-assistant/conversations`

Request:
```json
{
  "title": "Trading Strategy Discussion"
}
```

Response:
```json
{
  "id": "conv-123",
  "userId": "user-456",
  "title": "Trading Strategy Discussion",
  "status": "active",
  "messageCount": 0,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

### 2. Send Message

**POST** `/api/v1/ai-assistant/chat`

Request:
```json
{
  "conversationId": "conv-123",
  "message": "What is dollar-cost averaging?",
  "preferredModel": "gpt-4",
  "topic": "trading"
}
```

Response:
```json
{
  "messageId": "msg-789",
  "conversationId": "conv-123",
  "role": "assistant",
  "content": "Dollar-cost averaging (DCA) is an investment strategy...",
  "modelUsed": "gpt-4",
  "timestamp": "2024-01-01T10:01:00Z",
  "tokenUsage": {
    "prompt": 150,
    "completion": 200,
    "total": 350
  },
  "responseTime": 1250,
  "suggestedFollowUps": [
    "How do I implement DCA on StellarSwipe?",
    "What are the advantages of DCA?"
  ]
}
```

### 3. List Conversations

**GET** `/api/v1/ai-assistant/conversations?skip=0&take=10`

Response:
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "title": "Trading Strategy Discussion",
      "messageCount": 5,
      "lastActivityAt": "2024-01-01T10:30:00Z"
    }
  ],
  "total": 1
}
```

### 4. Get Conversation History

**GET** `/api/v1/ai-assistant/conversations/:conversationId`

Response:
```json
{
  "conversationId": "conv-123",
  "title": "Trading Strategy Discussion",
  "messageCount": 2,
  "createdAt": "2024-01-01T10:00:00Z",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What is DCA?",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Dollar-cost averaging...",
      "timestamp": "2024-01-01T10:01:00Z",
      "modelUsed": "gpt-4"
    }
  ]
}
```

### 5. Archive Conversation

**POST** `/api/v1/ai-assistant/conversations/:conversationId/archive`

### 6. Delete Conversation

**DELETE** `/api/v1/ai-assistant/conversations/:conversationId`

### 7. Health Check

**GET** `/api/v1/ai-assistant/health`

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "providers": [
    { "name": "OpenAI", "status": "configured" },
    { "name": "Anthropic", "status": "configured" }
  ]
}
```

## Key Features

### 1. Multi-Provider Support

- **OpenAI**: GPT-4, GPT-3.5-Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

Switch providers by specifying model in request:
```json
{
  "conversationId": "conv-123",
  "message": "...",
  "preferredModel": "claude-3-opus"
}
```

### 2. Context Management

User context is automatically built from:
- Conversation history
- User profile and interests
- Previous topics discussed
- Expertise level inference

### 3. FAQ System

Fast responses for common questions using built-in FAQ database:
- Getting Started
- Trading Signals
- Portfolio Management
- Stellar Integration
- Technical Support
- Compliance

### 4. Response Enhancements

- Automatic follow-up question suggestions
- Citation extraction and formatting
- Markdown formatting
- Token usage tracking
- Response time monitoring

### 5. Conversation Management

- Create multiple conversations
- Archive old conversations
- Delete conversations (soft delete)
- Full message history tracking
- Metadata and topic tracking

## Configuration

### System Prompts

Main system prompt defines assistant behavior:

```typescript
export const SYSTEM_PROMPT = `
You are an expert AI assistant for StellarSwipe...
`;
```

### LLM Options

Customize LLM behavior:

```typescript
interface LLMOptions {
  model?: string;           // Model name
  temperature?: number;     // 0-1, default 0.7
  maxTokens?: number;       // Max response tokens
  topP?: number;           // Nucleus sampling
  frequencyPenalty?: number; // -2 to 2
  presencePenalty?: number;  // -2 to 2
}
```

### Context Manager

Automatically tracks and enriches conversation context:

```typescript
// Infers user expertise from questions
inferExpertiseLevel(messages): 'beginner' | 'intermediate' | 'advanced'

// Extracts topics from conversation
extractTopics(messages): string[]

// Finds repeated topics needing reinforcement
findRepeatedTopics(messages): string[]
```

## Testing

Run unit tests:

```bash
npm test -- chat-bot.service.spec.ts
```

Key test scenarios:
- Create conversation
- Validate conversation ownership
- List conversations with pagination
- Delete conversation (mark as deleted)
- Archive conversation

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Missing required fields | Provide all required parameters |
| 401 Unauthorized | Invalid/missing JWT | Ensure authentication token is valid |
| 404 Not Found | Conversation doesn't exist | Use correct conversation ID |
| 500 Server Error | LLM API failure | Check API keys and rate limits |

### API Key Validation

Providers automatically validate API keys on initialization:

```typescript
// In BaseProvider
this.validateInitialization(); // Throws if API key missing
```

## Performance Considerations

### Token Management

- Track token usage per request
- Monitor total usage across conversations
- Implement rate limiting per user

### Response Caching

Cache FAQ responses for identical queries:
- 5 minute TTL
- User-specific context exclusion
- Invalidate on FAQ updates

### Database Indexing

Optimized queries with indexes:
- `(userId, createdAt)` - List conversations
- `(conversationId, createdAt)` - Get history
- `userId` - User context lookups

## Security Considerations

### Input Validation

- Max message length: 5000 characters
- HTML/XSS sanitization
- SQL injection prevention (TypeORM)

### Output Sanitization

- Remove sensitive patterns (API keys, private keys)
- Markdown escaping
- XSS prevention

### Authentication

- JWT-based authentication
- User ID validation
- Conversation ownership verification

## Monitoring & Logging

### Key Metrics

- Response time per request
- Token usage statistics
- Provider availability
- Error rates

### Logging

```typescript
private readonly logger = new Logger(ClassName.name);
this.logger.error('Error message', error);
```

## Future Enhancements

### Phase 2
- [ ] Streaming responses
- [ ] Advanced RAG (Retrieval-Augmented Generation)
- [ ] User feedback and rating system
- [ ] Fine-tuned models per domain

### Phase 3
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Real-time market data integration
- [ ] Advanced analytics dashboard

## Troubleshooting

### Issue: "API key is required"

**Solution**: Verify environment variables are set and loaded:
```bash
echo $OPENAI_API_KEY
```

### Issue: Connection timeout to LLM provider

**Solution**: 
- Check internet connectivity
- Verify API key is valid
- Check rate limits for your account

### Issue: "Conversation not found"

**Solution**: 
- Ensure conversation ID is correct
- Verify you own the conversation
- Check conversation hasn't been deleted

### Issue: Database migration fails

**Solution**:
```bash
# Drop and recreate
npm run typeorm migration:revert

# Then run again
npm run typeorm migration:run
```

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check logs in `src/logs/`
4. Contact development team

---

**Last Updated**: March 24, 2024  
**Version**: 1.0.0  
**Status**: Production Ready
