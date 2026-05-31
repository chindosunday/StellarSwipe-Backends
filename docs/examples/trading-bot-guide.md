# Building a Trading Bot

This guide shows you how to build an automated trading bot using the StellarSwipe SDK.

## Overview

We'll build a trading bot that:
- Monitors signals in real-time
- Filters signals by confidence and risk criteria
- Validates trades before execution
- Manages multiple positions
- Implements stop-loss and take-profit
- Provides performance analytics

## Prerequisites

- Node.js 18+
- StellarSwipe API key
- Basic TypeScript/JavaScript knowledge
- Understanding of trading concepts

## Project Setup

### 1. Initialize Project

```bash
mkdir stellarswipe-bot
cd stellarswipe-bot
npm init -y
npm install @stellarswipe/sdk dotenv winston
npm install -D typescript @types/node ts-node
```

### 2. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 3. Environment Setup

```bash
# .env
STELLARSWIPE_API_KEY=your-api-key
USER_ID=your-user-id
MIN_CONFIDENCE=75
MAX_POSITIONS=5
POSITION_SIZE=1000
STOP_LOSS_PERCENT=5
TAKE_PROFIT_PERCENT=10
CHECK_INTERVAL=60000
```

## Implementation

### Step 1: Configuration

```typescript
// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  apiKey: process.env.STELLARSWIPE_API_KEY!,
  userId: process.env.USER_ID!,
  minConfidence: parseInt(process.env.MIN_CONFIDENCE || '75', 10),
  maxPositions: parseInt(process.env.MAX_POSITIONS || '5', 10),
  positionSize: parseFloat(process.env.POSITION_SIZE || '1000'),
  stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '5'),
  takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '10'),
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '60000', 10),
};
```

### Step 2: Logger Setup

```typescript
// src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

### Step 3: Signal Filter

```typescript
// src/filters.ts
import { Signal } from '@stellarswipe/sdk';
import { config } from './config';

export interface FilterCriteria {
  minConfidence: number;
  assetPairs?: string[];
  excludeProviders?: string[];
  maxPositionsPerPair?: number;
}

export class SignalFilter {
  constructor(private criteria: FilterCriteria) {}

  shouldExecute(signal: Signal, currentPositions: any[]): boolean {
    // Check confidence
    if (signal.confidence < this.criteria.minConfidence) {
      return false;
    }

    // Check asset pair whitelist
    if (
      this.criteria.assetPairs &&
      !this.criteria.assetPairs.includes(signal.assetPair)
    ) {
      return false;
    }

    // Check excluded providers
    if (
      this.criteria.excludeProviders &&
      this.criteria.excludeProviders.includes(signal.providerId)
    ) {
      return false;
    }

    // Check max positions per pair
    if (this.criteria.maxPositionsPerPair) {
      const positionsInPair = currentPositions.filter(
        (p) => p.assetPair === signal.assetPair
      );
      if (positionsInPair.length >= this.criteria.maxPositionsPerPair) {
        return false;
      }
    }

    return true;
  }
}
```

### Step 4: Position Manager

```typescript
// src/position-manager.ts
import { StellarSwipeClient, Trade } from '@stellarswipe/sdk';
import { config } from './config';
import { logger } from './logger';

export class PositionManager {
  constructor(private client: StellarSwipeClient) {}

  async checkPositions(): Promise<void> {
    const positions = await this.client.trades.getOpenPositions(config.userId);

    for (const position of positions) {
      await this.checkStopLoss(position);
      await this.checkTakeProfit(position);
    }
  }

  private async checkStopLoss(position: Trade): Promise<void> {
    if (!position.entryPrice) return;

    const currentPnLPercent = ((position.pnl || 0) / position.amount) * 100;

    if (Math.abs(currentPnLPercent) >= config.stopLossPercent) {
      logger.warn('Stop loss triggered', {
        tradeId: position.id,
        assetPair: position.assetPair,
        pnl: position.pnl,
        pnlPercent: currentPnLPercent,
      });

      try {
        await this.client.trades.close({
          userId: config.userId,
          tradeId: position.id,
        });

        logger.info('Position closed (stop loss)', {
          tradeId: position.id,
          finalPnL: position.pnl,
        });
      } catch (error) {
        logger.error('Failed to close position', { error, tradeId: position.id });
      }
    }
  }

  private async checkTakeProfit(position: Trade): Promise<void> {
    if (!position.entryPrice) return;

    const currentPnLPercent = ((position.pnl || 0) / position.amount) * 100;

    if (currentPnLPercent >= config.takeProfitPercent) {
      logger.info('Take profit triggered', {
        tradeId: position.id,
        assetPair: position.assetPair,
        pnl: position.pnl,
        pnlPercent: currentPnLPercent,
      });

      try {
        await this.client.trades.close({
          userId: config.userId,
          tradeId: position.id,
        });

        logger.info('Position closed (take profit)', {
          tradeId: position.id,
          finalPnL: position.pnl,
        });
      } catch (error) {
        logger.error('Failed to close position', { error, tradeId: position.id });
      }
    }
  }
}
```

### Step 5: Trading Bot

```typescript
// src/bot.ts
import { StellarSwipeClient, Signal } from '@stellarswipe/sdk';
import { config } from './config';
import { logger } from './logger';
import { SignalFilter } from './filters';
import { PositionManager } from './position-manager';

export class TradingBot {
  private client: StellarSwipeClient;
  private filter: SignalFilter;
  private positionManager: PositionManager;
  private isRunning: boolean = false;

  constructor() {
    this.client = new StellarSwipeClient({
      apiKey: config.apiKey,
      retryOptions: {
        maxRetries: 3,
        initialDelay: 1000,
      },
    });

    this.filter = new SignalFilter({
      minConfidence: config.minConfidence,
      maxPositionsPerPair: 2,
    });

    this.positionManager = new PositionManager(this.client);
  }

  async start(): Promise<void> {
    logger.info('🤖 Trading Bot Starting', {
      userId: config.userId,
      minConfidence: config.minConfidence,
      maxPositions: config.maxPositions,
      positionSize: config.positionSize,
    });

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.runCycle();
        await this.sleep(config.checkInterval);
      } catch (error) {
        logger.error('Bot cycle error', { error });
        await this.sleep(config.checkInterval);
      }
    }
  }

  stop(): void {
    logger.info('🛑 Trading Bot Stopping');
    this.isRunning = false;
  }

  private async runCycle(): Promise<void> {
    // 1. Check and manage existing positions
    await this.positionManager.checkPositions();

    // 2. Check if we can open new positions
    const openPositions = await this.client.trades.getOpenPositions(
      config.userId
    );

    logger.info('Position check', {
      openPositions: openPositions.length,
      maxPositions: config.maxPositions,
    });

    if (openPositions.length >= config.maxPositions) {
      logger.info('Max positions reached, skipping signal check');
      return;
    }

    // 3. Find and execute new signals
    await this.checkSignals(openPositions);
  }

  private async checkSignals(currentPositions: any[]): Promise<void> {
    const signals = await this.client.signals.list({
      status: 'ACTIVE',
      sortBy: 'confidence',
      order: 'desc',
      limit: 20,
    });

    logger.info('Signal check', {
      found: signals.signals.length,
    });

    for (const signal of signals.signals) {
      if (currentPositions.length >= config.maxPositions) {
        break;
      }

      if (this.filter.shouldExecute(signal, currentPositions)) {
        const success = await this.executeSignal(signal);
        if (success) {
          currentPositions.push({} as any);
        }
      }
    }
  }

  private async executeSignal(signal: Signal): Promise<boolean> {
    logger.info('🎯 Executing signal', {
      assetPair: signal.assetPair,
      action: signal.action,
      confidence: signal.confidence,
      entryPrice: signal.entryPrice,
    });

    try {
      // Validate trade
      const validation = await this.client.trades.validate({
        userId: config.userId,
        signalId: signal.id,
        amount: config.positionSize,
      });

      if (!validation.valid) {
        logger.warn('Trade validation failed', {
          signalId: signal.id,
          errors: validation.errors,
        });
        return false;
      }

      // Check price impact
      if (validation.priceImpact > 5) {
        logger.warn('High price impact, skipping', {
          signalId: signal.id,
          priceImpact: validation.priceImpact,
        });
        return false;
      }

      // Execute trade
      const trade = await this.client.trades.execute({
        userId: config.userId,
        signalId: signal.id,
        amount: config.positionSize,
      });

      logger.info('✅ Trade executed successfully', {
        tradeId: trade.id,
        assetPair: trade.assetPair,
        entryPrice: trade.entryPrice,
        amount: trade.amount,
      });

      return true;
    } catch (error) {
      logger.error('❌ Trade execution failed', {
        signalId: signal.id,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getPerformance(): Promise<void> {
    const summary = await this.client.trades.getSummary(config.userId);
    const portfolio = await this.client.portfolio.get(config.userId);

    logger.info('📊 Performance Summary', {
      totalTrades: summary.totalTrades,
      openTrades: summary.openTrades,
      closedTrades: summary.closedTrades,
      winRate: summary.winRate,
      averageRoi: summary.averageRoi,
      totalPnL: summary.totalPnL,
      portfolioValue: portfolio.totalValue,
      portfolioRoi: portfolio.roi,
    });
  }
}
```

### Step 6: Main Entry Point

```typescript
// src/index.ts
import { TradingBot } from './bot';
import { logger } from './logger';

const bot = new TradingBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  bot.stop();
  await bot.getPerformance();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  bot.stop();
  await bot.getPerformance();
  process.exit(0);
});

// Start bot
bot.start().catch((error) => {
  logger.error('Fatal error', { error });
  process.exit(1);
});

// Log performance every hour
setInterval(async () => {
  await bot.getPerformance();
}, 60 * 60 * 1000);
```

## Running the Bot

### Development

```bash
npm run dev
```

### Production

```bash
# Build
npm run build

# Run
npm start
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

```bash
docker build -t stellarswipe-bot .
docker run --env-file .env stellarswipe-bot
```

## Monitoring

### Performance Dashboard

```typescript
// src/dashboard.ts
import express from 'express';
import { StellarSwipeClient } from '@stellarswipe/sdk';
import { config } from './config';

const app = express();
const client = new StellarSwipeClient(config.apiKey);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/performance', async (req, res) => {
  const summary = await client.trades.getSummary(config.userId);
  const portfolio = await client.portfolio.get(config.userId);
  const openPositions = await client.trades.getOpenPositions(config.userId);

  res.json({
    summary,
    portfolio,
    openPositions: openPositions.length,
  });
});

app.listen(3000, () => {
  console.log('Dashboard running on http://localhost:3000');
});
```

## Testing

```typescript
// src/bot.test.ts
import { TradingBot } from './bot';
import { StellarSwipeClient } from '@stellarswipe/sdk';

jest.mock('@stellarswipe/sdk');

describe('TradingBot', () => {
  let bot: TradingBot;
  let mockClient: jest.Mocked<StellarSwipeClient>;

  beforeEach(() => {
    bot = new TradingBot();
    mockClient = bot['client'] as any;
  });

  it('should not execute signal below confidence threshold', async () => {
    mockClient.signals.list.mockResolvedValue({
      signals: [
        {
          id: 'sig_1',
          confidence: 50, // Below threshold
          assetPair: 'USDC/XLM',
          action: 'BUY',
        },
      ],
      hasMore: false,
    });

    mockClient.trades.getOpenPositions.mockResolvedValue([]);

    await bot['runCycle']();

    expect(mockClient.trades.execute).not.toHaveBeenCalled();
  });

  it('should execute high-confidence signal', async () => {
    mockClient.signals.list.mockResolvedValue({
      signals: [
        {
          id: 'sig_1',
          confidence: 85,
          assetPair: 'USDC/XLM',
          action: 'BUY',
        },
      ],
      hasMore: false,
    });

    mockClient.trades.getOpenPositions.mockResolvedValue([]);
    mockClient.trades.validate.mockResolvedValue({
      valid: true,
      estimatedCost: 100,
      estimatedFees: 1,
      priceImpact: 0.5,
    });

    mockClient.trades.execute.mockResolvedValue({
      id: 'trade_1',
      status: 'OPEN',
    } as any);

    await bot['runCycle']();

    expect(mockClient.trades.execute).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Start small** - Test with small position sizes first
2. **Monitor closely** - Watch bot behavior for the first 24 hours
3. **Set limits** - Always use max position limits
4. **Use stop-loss** - Protect against large losses
5. **Diversify** - Don't put all capital in one asset pair
6. **Log everything** - Comprehensive logging helps debug issues
7. **Handle errors** - Implement robust error handling
8. **Test thoroughly** - Test in development environment first

## Next Steps

- Add more sophisticated filters (technical indicators, sentiment)
- Implement portfolio rebalancing
- Add telegram/discord notifications
- Integrate with monitoring tools (Prometheus, Grafana)
- Implement backtesting functionality

## Resources

- [API Reference](../api-reference/openapi.yaml)
- [Best Practices](../guides/best-practices.md)
- [Webhooks Guide](../guides/webhooks.md)
