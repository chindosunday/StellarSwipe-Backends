# AI Assistant Quick Start Guide

Get the AI Chat Assistant up and running in 5 minutes! 🚀

## Prerequisites

- Node.js 16+
- PostgreSQL 12+
- OpenAI or Anthropic API key

## Step 1: Install Dependencies (1 min)

```bash
npm install openai @anthropic-ai/sdk
```

## Step 2: Configure Environment (1 min)

Add to your `.env` file:

```env
# LLM Providers (get from openai.com or anthropic.com)
OPENAI_API_KEY=sk_live_your_key_here
ANTHROPIC_API_KEY=sk-ant_your_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stellarswipe
DB_USER=postgres
DB_PASSWORD=your_password
```

## Step 3: Run Database Migration (1 min)

```bash
npm run typeorm migration:run
```

Verify tables were created:
```bash
psql -U postgres -d stellarswipe -c "\dt conversations chat_messages user_contexts"
```

## Step 4: Import Module (1 min)

Update `src/app.module.ts`:

```typescript
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';

@Module({
  imports: [
    // ... your other imports
    AiAssistantModule,  // ← Add this line
  ],
})
export class AppModule {}
```

## Step 5: Start Server (1 min)

```bash
npm run start:dev
```

You should see:
```
[Nest] 12345  - 03/24/2024, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 03/24/2024, 10:00:00 AM     LOG [InstanceLoader] AiAssistantModule dependencies initialized
```

## Quick Test

### 1. Create a Conversation

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Chat"}'
```

Response:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": "user-123",
  "title": "My First Chat",
  "status": "active",
  "messageCount": 0
}
```

### 2. Send a Message

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "message": "What is cryptocurrency?",
    "preferredModel": "gpt-4"
  }'
```

Response:
```json
{
  "messageId": "msg-abc123",
  "content": "Cryptocurrency is a digital or virtual form of currency...",
  "modelUsed": "gpt-4",
  "responseTime": 1250,
  "suggestedFollowUps": [
    "How does blockchain work?",
    "What are the risks of cryptocurrency?"
  ]
}
```

### 3. See Conversation History

```bash
curl -X GET http://localhost:3000/api/v1/ai-assistant/conversations/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Questions

### Q: Which LLM should I use?

**OpenAI (GPT-4)**
- Pros: Faster, cheaper, well-established
- Best for: General questions, fast responses
- Models: `gpt-4`, `gpt-3.5-turbo`

**Anthropic (Claude)**
- Pros: Longer context, better reasoning
- Best for: Complex analysis, in-depth explanations
- Models: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`

In requests, specify: `"preferredModel": "gpt-4"` or `"preferredModel": "claude-3-opus"`

### Q: How much will this cost?

**OpenAI Pricing** (approximate):
- GPT-4: ~$0.03 per 1K prompt tokens, ~$0.06 per 1K completion tokens
- GPT-3.5-Turbo: ~$0.0015 per 1K prompt tokens, ~$0.002 per 1K completion tokens

**Anthropic Pricing** (approximate):
- Claude 3 Opus: ~$0.015 per 1K prompt tokens, ~$0.075 per 1K completion tokens
- Claude 3 Sonnet: ~$0.003 per 1K prompt tokens, ~$0.015 per 1K completion tokens

Each question typically uses 500-2000 tokens total.

### Q: Can I switch between OpenAI and Anthropic?

Yes! Either in the request:
```json
{"preferredModel": "claude-3-opus"}  // Uses Anthropic
{"preferredModel": "gpt-4"}          // Uses OpenAI
```

Or change the default in `chat-bot.service.ts`:
```typescript
private selectProvider(preferredModel?: string): LLMProviderInterface {
  // Change "openai" to "anthropic" to default to Claude
  return this.llmProviders.get('openai');
}
```

### Q: How do I get better answers?

1. **Be specific**: "What is DCA?" → "What is dollar-cost averaging and how can I use it for cryptocurrency trading on StellarSwipe?"

2. **Provide context**: Include your experience level
   ```json
   {
     "message": "I'm a beginner looking to start trading...",
     "topic": "signals"
   }
   ```

3. **Use follow-ups**: The API suggests follow-up questions—use them!

### Q: Database not connecting?

Check:
```bash
# Verify PostgreSQL is running
sudo service postgresql status

# Check credentials
psql -U postgres -h localhost

# Create database if needed
createdb stellarswipe
```

### Q: Getting "401 Unauthorized"?

Make sure:
1. Your JWT token is valid and not expired
2. Token is included in `Authorization: Bearer TOKEN` header
3. User account exists and is active

### Q: Too slow or timing out?

- LLM APIs can be slow (2-10 seconds typical)
- Add timeout: Set `responseTime` limit in config
- Implement caching for FAQ responses

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/conversations` | Create conversation |
| POST | `/chat` | Send message |
| GET | `/conversations` | List all |
| GET | `/conversations/:id` | Get history |
| POST | `/conversations/:id/archive` | Archive |
| DELETE | `/conversations/:id` | Delete |
| GET | `/health` | Check status |

## Next Steps

1. **Read** the full documentation: `AI_ASSISTANT_IMPLEMENTATION.md`
2. **Run tests**: `npm test -- chat-bot.service.spec.ts`
3. **Monitor** usage in production
4. **Gather** user feedback
5. **Iterate** on prompts and features

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'openai'` | Run `npm install openai @anthropic-ai/sdk` |
| `API key error` | Verify `OPENAI_API_KEY` in `.env` is set correctly |
| `Database connection failed` | Check PostgreSQL is running and credentials are correct |
| `Conversation not found` | Verify you're using the correct `conversationId` from creation |
| `Timeout error` | LLM APIs are slow; increase timeout to 30+ seconds |

## Performance Tips

```typescript
// In requests, you can optimize:

// 1. Shorter responses
{
  "message": "...",
  "context": "I prefer concise answers (max 200 words)"
}

// 2. Specific model (Claude 3 Haiku is faster/cheaper)
{
  "message": "...",
  "preferredModel": "claude-3-haiku"
}

// 3. Set max tokens
{
  "message": "...",
  "maxTokens": 500  // Limit response length
}
```

## Security Reminders

✅ Always use HTTPS in production  
✅ Never commit API keys—use environment variables  
✅ Validate user authentication on every request  
✅ Enable rate limiting per user  
✅ Sanitize user input  
✅ Log but don't store sensitive data  

## Support

- 📖 Full docs: `AI_ASSISTANT_IMPLEMENTATION.md`
- ✅ Checklist: `AI_ASSISTANT_CHECKLIST.md`
- 🐛 Issues: Check `chat-bot.service.spec.ts` for tests
- 💬 More help: Check code comments marked with `//`

---

**Ready?** Type your first question to the AI! 🤖

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "YOUR_CONV_ID", "message": "Hello!"}'
```

Happy coding! 🎉
