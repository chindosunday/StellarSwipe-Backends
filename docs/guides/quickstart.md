# Quick Start Guide

Get started with StellarSwipe API in minutes.

## Prerequisites

- Node.js 18+ or Python 3.8+
- StellarSwipe account
- API key (get from [Developer Dashboard](https://app.stellarswipe.com/developer))

## Installation

### TypeScript/JavaScript

```bash
npm install @stellarswipe/sdk
```

### Python (Optional)

```bash
pip install stellarswipe
```

## Authentication

Get your API key from the Developer Dashboard and set it as an environment variable:

```bash
export STELLARSWIPE_API_KEY="your-api-key-here"
```

## Your First Request

### TypeScript/JavaScript

```typescript
import { StellarSwipeClient } from '@stellarswipe/sdk';

const client = new StellarSwipeClient(process.env.STELLARSWIPE_API_KEY);

// Get active trading signals
const signals = await client.signals.list({
  status: 'ACTIVE',
  limit: 10,
});

console.log(`Found ${signals.signals.length} active signals`);
signals.signals.forEach(signal => {
  console.log(`${signal.assetPair}: ${signal.action} at ${signal.entryPrice}`);
});
```

### cURL

```bash
curl -X GET "https://api.stellarswipe.com/signals?status=ACTIVE&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Execute Your First Trade

```typescript
// 1. Find a signal
const signals = await client.signals.list({
  assetPair: 'USDC/XLM',
  status: 'ACTIVE',
  sortBy: 'confidence',
  order: 'desc',
});

const bestSignal = signals.signals[0];

// 2. Validate the trade
const validation = await client.trades.validate({
  userId: 'your-user-id',
  signalId: bestSignal.id,
  amount: 100,
});

if (!validation.valid) {
  console.error('Trade validation failed:', validation.errors);
  process.exit(1);
}

console.log(`Estimated cost: $${validation.estimatedCost}`);
console.log(`Estimated fees: $${validation.estimatedFees}`);
console.log(`Price impact: ${validation.priceImpact}%`);

// 3. Execute the trade
const trade = await client.trades.execute({
  userId: 'your-user-id',
  signalId: bestSignal.id,
  amount: 100,
});

console.log(`Trade executed: ${trade.id}`);
console.log(`Entry price: ${trade.entryPrice}`);
console.log(`Status: ${trade.status}`);
```

## Monitor Your Portfolio

```typescript
// Get portfolio summary
const portfolio = await client.portfolio.get('your-user-id');

console.log(`Total value: $${portfolio.totalValue}`);
console.log(`Total P&L: $${portfolio.totalPnL}`);
console.log(`ROI: ${portfolio.roi}%`);

// Get current positions
const positions = await client.portfolio.getPositions('your-user-id');

positions.forEach(position => {
  console.log(`${position.assetCode}: $${position.value} (${position.percentage}%)`);
  console.log(`  Unrealized P&L: $${position.unrealizedPnL}`);
});

// Get open trades
const openTrades = await client.trades.getOpenPositions('your-user-id');

console.log(`\nOpen trades: ${openTrades.length}`);
openTrades.forEach(trade => {
  const pnl = trade.pnl || 0;
  const roi = trade.roi || 0;
  console.log(`  ${trade.assetPair}: P&L $${pnl} (ROI: ${roi}%)`);
});
```

## Close a Trade

```typescript
// Close a specific trade
const closedTrade = await client.trades.close({
  userId: 'your-user-id',
  tradeId: 'trade-id',
});

console.log(`Trade closed at: ${closedTrade.exitPrice}`);
console.log(`Final P&L: $${closedTrade.pnl}`);
console.log(`ROI: ${closedTrade.roi}%`);

// Or partially close a position
const partiallyClosedTrade = await client.trades.partialClose({
  userId: 'your-user-id',
  tradeId: 'trade-id',
  percentage: 50, // close 50% of position
});
```

## Error Handling

Always wrap API calls in try-catch blocks:

```typescript
import {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
} from '@stellarswipe/sdk';

try {
  const trade = await client.trades.execute(tradeData);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited, retry after:', error.retryAfter, 'seconds');
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Rate Limits

- **1000 requests per hour** for authenticated users
- Rate limit info is returned in response headers
- The SDK automatically handles rate limits with retry logic

## Next Steps

- [Authentication Guide](./authentication.md) - Secure API key management
- [Best Practices](./best-practices.md) - Production-ready patterns
- [Code Examples](../examples/) - More advanced examples
- [API Reference](../api-reference/openapi.yaml) - Complete API documentation

## Need Help?

- 📚 [Documentation](https://docs.stellarswipe.com)
- 💬 [Discord Community](https://discord.gg/stellarswipe)
- 📧 Email: support@stellarswipe.com
