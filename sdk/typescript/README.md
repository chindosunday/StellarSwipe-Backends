# StellarSwipe TypeScript/JavaScript SDK

Official TypeScript/JavaScript SDK for the StellarSwipe copy trading platform on Stellar.

## Installation

```bash
npm install @stellarswipe/sdk
```

or with yarn:

```bash
yarn add @stellarswipe/sdk
```

## Quick Start

```typescript
import { StellarSwipeClient } from '@stellarswipe/sdk';

const client = new StellarSwipeClient('your-api-key');

// Get signal feed
const signals = await client.signals.list({
  limit: 20,
  assetPair: 'USDC/XLM',
});

// Execute trade
const trade = await client.trades.execute({
  userId: 'user-123',
  signalId: signals.signals[0].id,
  amount: 1000,
});

// Get portfolio
const portfolio = await client.portfolio.get('user-123');
console.log(portfolio.totalValue);
```

## Features

- ✅ **Full Type Safety** - Complete TypeScript definitions
- ✅ **Automatic Retries** - Built-in retry logic with exponential backoff
- ✅ **Error Handling** - Comprehensive error types
- ✅ **Request Validation** - Validate trades before execution
- ✅ **Rate Limiting** - Automatic handling of rate limits
- ✅ **Timeout Management** - Configurable request timeouts

## Authentication

Get your API key from the [Developer Dashboard](https://app.stellarswipe.com/developer).

```typescript
const client = new StellarSwipeClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.stellarswipe.com', // optional
  timeout: 30000, // optional, default 30s
  retryOptions: { // optional
    maxRetries: 3,
    initialDelay: 1000,
  },
});
```

## API Reference

### Signals

#### List Signals

```typescript
const signalFeed = await client.signals.list({
  limit: 20,
  cursor: 'cursor-string',
  assetPair: 'USDC/XLM',
  providerId: 'provider-123',
  status: 'ACTIVE',
  sortBy: 'performance',
  order: 'desc',
});
```

#### Get Single Signal

```typescript
const signal = await client.signals.get('signal-id');
```

#### Create Signal

```typescript
const signal = await client.signals.create({
  providerId: 'provider-123',
  assetPair: 'USDC/XLM',
  action: 'BUY',
  entryPrice: 0.15,
  targetPrice: 0.18,
  stopLoss: 0.14,
  confidence: 85,
  reasoning: 'Bullish momentum detected',
});
```

### Trades

#### Execute Trade

```typescript
const trade = await client.trades.execute({
  userId: 'user-123',
  signalId: 'signal-id',
  amount: 1000,
  slippage: 0.01, // optional
});
```

#### Validate Trade

```typescript
const validation = await client.trades.validate({
  userId: 'user-123',
  signalId: 'signal-id',
  amount: 1000,
});

if (validation.valid) {
  console.log('Estimated cost:', validation.estimatedCost);
}
```

#### Close Trade

```typescript
const closedTrade = await client.trades.close({
  userId: 'user-123',
  tradeId: 'trade-id',
});
```

#### Partial Close

```typescript
const trade = await client.trades.partialClose({
  userId: 'user-123',
  tradeId: 'trade-id',
  percentage: 50, // close 50% of position
});
```

#### Get Trade

```typescript
const trade = await client.trades.get('trade-id', 'user-123');
```

#### List User Trades

```typescript
const trades = await client.trades.list({
  userId: 'user-123',
  status: 'OPEN',
  limit: 50,
  offset: 0,
});
```

#### Get Trade Summary

```typescript
const summary = await client.trades.getSummary('user-123');
console.log('Win rate:', summary.winRate);
console.log('Total P&L:', summary.totalPnL);
```

#### Get Open Positions

```typescript
const positions = await client.trades.getOpenPositions('user-123');
```

### Portfolio

#### Get Portfolio

```typescript
const portfolio = await client.portfolio.get('user-123');
console.log('Total value:', portfolio.totalValue);
console.log('ROI:', portfolio.roi);
```

#### Get Positions

```typescript
const positions = await client.portfolio.getPositions('user-123');
```

#### Get History

```typescript
const history = await client.portfolio.getHistory('user-123', 1, 20);
```

#### Export Portfolio

```typescript
const exportData = await client.portfolio.export('user-123', {
  format: 'csv',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

#### Portfolio Rebalancing

```typescript
// Set target allocation
await client.portfolio.setTargetAllocation('user-123', {
  allocations: [
    { assetCode: 'USDC', targetPercentage: 50 },
    { assetCode: 'XLM', targetPercentage: 30 },
    { assetCode: 'AQUA', targetPercentage: 20 },
  ],
  driftThresholdPercent: 5,
  autoRebalance: false,
});

// Analyze drift
const drift = await client.portfolio.analyzeDrift('user-123');

// Create rebalancing plan
const plan = await client.portfolio.createRebalancingPlan('user-123');

// Approve plan
await client.portfolio.approvePlan('user-123', plan.id);
```

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import {
  StellarSwipeError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@stellarswipe/sdk';

try {
  const trade = await client.trades.execute(data);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (error instanceof NetworkError) {
    console.error('Network error, retrying...');
  }
}
```

## Retry Configuration

Customize retry behavior:

```typescript
const client = new StellarSwipeClient({
  apiKey: 'your-api-key',
  retryOptions: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
});
```

## Examples

See the [examples](./examples) directory for complete working examples:

- [Basic Usage](./examples/basic-usage.ts) - Simple examples of all SDK features
- [Trading Bot](./examples/trading-bot.ts) - Automated trading bot implementation
- [Portfolio Rebalancing](./examples/portfolio-rebalancing.ts) - Portfolio management

## Documentation

- [API Documentation](https://docs.stellarswipe.com/api)
- [Developer Guides](https://docs.stellarswipe.com/guides)
- [Integration Examples](https://docs.stellarswipe.com/examples)

## Requirements

- Node.js 18+
- TypeScript 5+ (for TypeScript projects)

## License

MIT

## Support

- Documentation: https://docs.stellarswipe.com
- Email: support@stellarswipe.com
- Discord: https://discord.gg/stellarswipe
