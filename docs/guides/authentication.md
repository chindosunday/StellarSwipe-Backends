# Authentication Guide

Learn how to securely authenticate with the StellarSwipe API.

## Overview

StellarSwipe uses API keys for authentication. All API requests must include an API key in the `Authorization` header using the Bearer authentication scheme.

## Getting Your API Key

1. Log in to your [StellarSwipe account](https://app.stellarswipe.com)
2. Navigate to the [Developer Dashboard](https://app.stellarswipe.com/developer)
3. Click "Create API Key"
4. Give your key a descriptive name
5. Select the appropriate permissions
6. Copy your API key immediately (it won't be shown again)

## API Key Types

### Read-Only Keys
- View signals and market data
- Check portfolio and trades
- No trading permissions

### Trading Keys
- All read permissions
- Execute and close trades
- Manage portfolio

### Admin Keys
- All trading permissions
- Create signals (for providers)
- Manage account settings

## Using API Keys

### TypeScript/JavaScript SDK

```typescript
import { StellarSwipeClient } from '@stellarswipe/sdk';

// Option 1: Simple initialization
const client = new StellarSwipeClient('your-api-key');

// Option 2: Full configuration
const client = new StellarSwipeClient({
  apiKey: process.env.STELLARSWIPE_API_KEY,
  baseUrl: 'https://api.stellarswipe.com',
  timeout: 30000,
});

// Option 3: Update API key later
client.setApiKey('new-api-key');
```

### cURL

```bash
curl -X GET "https://api.stellarswipe.com/signals" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Python (Optional)

```python
from stellarswipe import StellarSwipeClient

client = StellarSwipeClient(api_key='your-api-key')
```

## Security Best Practices

### 1. Store API Keys Securely

**Never hardcode API keys in your source code.**

✅ **Good**: Use environment variables

```typescript
// .env file
STELLARSWIPE_API_KEY=your-api-key

// Your code
const client = new StellarSwipeClient(process.env.STELLARSWIPE_API_KEY);
```

❌ **Bad**: Hardcoded keys

```typescript
const client = new StellarSwipeClient('sk_live_abc123xyz'); // DON'T DO THIS
```

### 2. Use Different Keys for Different Environments

```bash
# .env.development
STELLARSWIPE_API_KEY=sk_test_development_key

# .env.staging
STELLARSWIPE_API_KEY=sk_test_staging_key

# .env.production
STELLARSWIPE_API_KEY=sk_live_production_key
```

### 3. Rotate Keys Regularly

- Rotate production keys every 90 days
- Rotate immediately if a key is compromised
- Keep old keys active for 24 hours during rotation

```typescript
// Gradual key rotation
const oldClient = new StellarSwipeClient(process.env.OLD_API_KEY);
const newClient = new StellarSwipeClient(process.env.NEW_API_KEY);

try {
  // Try new key first
  const data = await newClient.signals.list();
} catch (error) {
  // Fall back to old key
  const data = await oldClient.signals.list();
}
```

### 4. Limit Key Permissions

- Use read-only keys for analytics and monitoring
- Use trading keys only when necessary
- Never use admin keys in client-side code

### 5. Monitor Key Usage

Check your [API Key Dashboard](https://app.stellarswipe.com/developer/keys) regularly:

- Review request logs
- Monitor for suspicious activity
- Set up alerts for unusual patterns

## API Key Management

### Revoking a Key

If a key is compromised:

1. Go to Developer Dashboard
2. Find the compromised key
3. Click "Revoke"
4. Generate a new key
5. Update your applications

### Key Metadata

Add metadata to track key usage:

```typescript
// When creating a key via API (admin only)
const keyMetadata = {
  name: 'Production Trading Bot',
  environment: 'production',
  application: 'trading-bot-v2',
  permissions: ['read', 'trade'],
};
```

## Testing Authentication

### Verify API Key

```typescript
try {
  const portfolio = await client.portfolio.get('your-user-id');
  console.log('✅ API key is valid');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('❌ Invalid API key');
  }
}
```

### Test Different Permission Levels

```typescript
// Test read permission
try {
  await client.signals.list();
  console.log('✅ Read permission: OK');
} catch (error) {
  console.error('❌ Read permission: FAILED');
}

// Test trade permission
try {
  await client.trades.validate({
    userId: 'test-user',
    signalId: 'test-signal',
    amount: 1,
  });
  console.log('✅ Trade permission: OK');
} catch (error) {
  console.error('❌ Trade permission: FAILED');
}
```

## Environment-Specific Configuration

### Development

```typescript
const client = new StellarSwipeClient({
  apiKey: process.env.STELLARSWIPE_API_KEY,
  baseUrl: 'https://api-dev.stellarswipe.com',
  timeout: 60000, // Longer timeout for debugging
  retryOptions: {
    maxRetries: 0, // No retries in development
  },
});
```

### Production

```typescript
const client = new StellarSwipeClient({
  apiKey: process.env.STELLARSWIPE_API_KEY,
  baseUrl: 'https://api.stellarswipe.com',
  timeout: 30000,
  retryOptions: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  },
});
```

## Webhook Authentication

For webhooks (see [Webhooks Guide](./webhooks.md)), verify requests using signatures:

```typescript
import { createHmac } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhooks/stellarswipe', (req, res) => {
  const signature = req.headers['x-stellarswipe-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});
```

## Troubleshooting

### "Invalid API Key" Error

- Check that your key is correct
- Verify the key hasn't been revoked
- Ensure you're using the right environment (dev/prod)

### "Permission Denied" Error

- Check your key has the required permissions
- Verify you're not using a read-only key for trading

### "Rate Limit Exceeded" Error

- You've exceeded 1000 requests/hour
- Wait for the rate limit to reset
- Implement caching to reduce requests
- Consider upgrading to a higher tier

## Next Steps

- [Webhooks Guide](./webhooks.md) - Set up real-time notifications
- [Best Practices](./best-practices.md) - Production-ready patterns
- [API Reference](../api-reference/openapi.yaml) - Complete API documentation
