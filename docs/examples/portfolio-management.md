# Portfolio Management Example

Learn how to implement automated portfolio management and rebalancing.

## Overview

This example demonstrates:
- Setting target allocations
- Monitoring portfolio drift
- Automated rebalancing
- Performance tracking
- Risk management

## Prerequisites

- StellarSwipe SDK installed
- API key with trading permissions
- Basic understanding of portfolio theory

## Implementation

### 1. Portfolio Configuration

```typescript
// config.ts
export const portfolioConfig = {
  targetAllocations: [
    { assetCode: 'USDC', targetPercentage: 40 },
    { assetCode: 'XLM', targetPercentage: 30 },
    { assetCode: 'AQUA', targetPercentage: 20 },
    { assetCode: 'BTC', targetPercentage: 10 },
  ],
  driftThresholdPercent: 5,
  rebalanceFrequency: 24 * 60 * 60 * 1000, // 24 hours
  autoRebalance: false,
};
```

### 2. Portfolio Manager

```typescript
// portfolio-manager.ts
import { StellarSwipeClient } from '@stellarswipe/sdk';
import { portfolioConfig } from './config';

export class PortfolioManager {
  constructor(
    private client: StellarSwipeClient,
    private userId: string
  ) {}

  async initialize(): Promise<void> {
    // Set target allocation
    await this.client.portfolio.setTargetAllocation(this.userId, {
      allocations: portfolioConfig.targetAllocations,
      driftThresholdPercent: portfolioConfig.driftThresholdPercent,
      autoRebalance: portfolioConfig.autoRebalance,
    });

    console.log('✅ Portfolio target allocation set');
  }

  async checkAndRebalance(): Promise<void> {
    // Analyze drift
    const drift = await this.client.portfolio.analyzeDrift(this.userId);

    console.log('📊 Portfolio Drift Analysis:');
    console.log(`  Requires rebalancing: ${drift.requiresRebalancing}`);
    console.log(`  Total drift: ${drift.totalDrift}%\n`);

    if (drift.drifts) {
      console.log('  Asset Drifts:');
      for (const assetDrift of drift.drifts) {
        console.log(
          `    ${assetDrift.assetCode}: ${assetDrift.drift}% ` +
            `(current: ${assetDrift.currentPercentage}%, ` +
            `target: ${assetDrift.targetPercentage}%)`
        );
      }
      console.log('');
    }

    if (drift.requiresRebalancing) {
      await this.executeRebalancing();
    } else {
      console.log('✅ Portfolio is balanced\n');
    }
  }

  private async executeRebalancing(): Promise<void> {
    console.log('⚖️  Creating rebalancing plan...');

    const plan = await this.client.portfolio.createRebalancingPlan(
      this.userId,
      false // Manual approval
    );

    console.log(`Plan ID: ${plan.id}`);
    console.log(`Status: ${plan.status}`);
    console.log(`Total cost: $${plan.totalCost}\n`);

    console.log('Planned trades:');
    for (const trade of plan.trades) {
      console.log(
        `  ${trade.action} ${trade.amount} ${trade.assetCode} ` +
          `(estimated cost: $${trade.estimatedCost})`
      );
    }

    // In production, you might want manual approval
    // For this example, we'll auto-approve
    console.log('\n⏳ Approving and executing plan...');

    const executedPlan = await this.client.portfolio.approvePlan(
      this.userId,
      plan.id
    );

    console.log(`✅ Rebalancing completed at ${executedPlan.executedAt}\n`);
  }

  async getPerformanceReport(): Promise<void> {
    const portfolio = await this.client.portfolio.get(this.userId);
    const positions = await this.client.portfolio.getPositions(this.userId);

    console.log('📈 Portfolio Performance Report:');
    console.log(`  Total Value: $${portfolio.totalValue}`);
    console.log(`  Total P&L: $${portfolio.totalPnL}`);
    console.log(`  ROI: ${portfolio.roi}%`);
    console.log(`  Last Updated: ${portfolio.lastUpdated}\n`);

    console.log('  Current Positions:');
    for (const position of positions) {
      console.log(
        `    ${position.assetCode}: $${position.value.toFixed(2)} ` +
          `(${position.percentage.toFixed(2)}%)`
      );
      console.log(`      Amount: ${position.amount}`);
      console.log(`      Avg Entry: $${position.averageEntryPrice}`);
      console.log(`      Current: $${position.currentPrice}`);
      console.log(`      Unrealized P&L: $${position.unrealizedPnL}\n`);
    }
  }

  async exportHistory(format: 'csv' | 'json'): Promise<void> {
    const exportData = await this.client.portfolio.export(this.userId, {
      format,
      startDate: '2024-01-01',
      endDate: new Date().toISOString().split('T')[0],
    });

    console.log(`Portfolio history exported as ${format}`);
    return exportData;
  }
}
```

### 3. Main Application

```typescript
// index.ts
import { StellarSwipeClient } from '@stellarswipe/sdk';
import { PortfolioManager } from './portfolio-manager';
import { portfolioConfig } from './config';

async function main() {
  const client = new StellarSwipeClient(process.env.STELLARSWIPE_API_KEY!);
  const userId = process.env.USER_ID!;

  const manager = new PortfolioManager(client, userId);

  // Initialize portfolio
  await manager.initialize();

  // Run rebalancing check every 24 hours
  setInterval(
    async () => {
      try {
        await manager.checkAndRebalance();
        await manager.getPerformanceReport();
      } catch (error) {
        console.error('Error during rebalancing:', error);
      }
    },
    portfolioConfig.rebalanceFrequency
  );

  // Initial check
  await manager.checkAndRebalance();
  await manager.getPerformanceReport();

  // Export history monthly
  setInterval(
    async () => {
      await manager.exportHistory('csv');
    },
    30 * 24 * 60 * 60 * 1000 // 30 days
  );
}

main().catch(console.error);
```

### 4. Risk Management

```typescript
// risk-manager.ts
export class RiskManager {
  constructor(
    private client: StellarSwipeClient,
    private userId: string
  ) {}

  async checkRiskLimits(): Promise<void> {
    const portfolio = await this.client.portfolio.get(this.userId);
    const positions = await this.client.portfolio.getPositions(this.userId);

    // Check concentration risk
    for (const position of positions) {
      if (position.percentage > 40) {
        console.warn(
          `⚠️  High concentration in ${position.assetCode}: ${position.percentage}%`
        );
        await this.sendAlert({
          type: 'CONCENTRATION_RISK',
          asset: position.assetCode,
          percentage: position.percentage,
        });
      }
    }

    // Check total portfolio loss
    if (portfolio.roi < -20) {
      console.error(
        `🚨 Portfolio down ${portfolio.roi}%, consider reducing exposure`
      );
      await this.sendAlert({
        type: 'PORTFOLIO_LOSS',
        roi: portfolio.roi,
      });
    }

    // Check position losses
    const openTrades = await this.client.trades.getOpenPositions(this.userId);
    for (const trade of openTrades) {
      if (trade.roi && trade.roi < -10) {
        console.warn(
          `⚠️  Large loss in ${trade.assetPair}: ${trade.roi}%`
        );
        
        // Consider closing position
        await this.client.trades.close({
          userId: this.userId,
          tradeId: trade.id,
        });
      }
    }
  }

  private async sendAlert(alert: any): Promise<void> {
    // Implement your alert system (email, SMS, Slack, etc.)
    console.log('Alert:', JSON.stringify(alert, null, 2));
  }
}
```

### 5. Performance Analytics

```typescript
// analytics.ts
export class PerformanceAnalytics {
  constructor(
    private client: StellarSwipeClient,
    private userId: string
  ) {}

  async calculateMetrics(): Promise<void> {
    const summary = await this.client.trades.getSummary(this.userId);
    const portfolio = await this.client.portfolio.get(this.userId);
    const history = await this.client.portfolio.getHistory(
      this.userId,
      1,
      100
    );

    // Calculate Sharpe Ratio (simplified)
    const returns = this.calculateReturns(history.data);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = this.calculateStdDev(returns);
    const sharpeRatio = avgReturn / stdDev;

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(history.data);

    console.log('📊 Performance Metrics:');
    console.log(`  Win Rate: ${summary.winRate}%`);
    console.log(`  Average ROI: ${summary.averageRoi}%`);
    console.log(`  Total P&L: $${summary.totalPnL}`);
    console.log(`  Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
    console.log(`  Max Drawdown: ${maxDrawdown}%`);
    console.log(`  Total Trades: ${summary.totalTrades}`);
    console.log(`  Portfolio ROI: ${portfolio.roi}%`);
  }

  private calculateReturns(trades: any[]): number[] {
    return trades
      .filter((t) => t.roi !== null)
      .map((t) => t.roi / 100);
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  private calculateMaxDrawdown(trades: any[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumPnL = 0;

    for (const trade of trades) {
      cumPnL += trade.pnl || 0;
      if (cumPnL > peak) {
        peak = cumPnL;
      }
      const drawdown = ((peak - cumPnL) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }
}
```

## Advanced Features

### Dynamic Allocation

```typescript
// Adjust allocations based on market conditions
async function adjustAllocations(
  manager: PortfolioManager,
  marketCondition: 'bullish' | 'bearish' | 'neutral'
): Promise<void> {
  let allocations;

  switch (marketCondition) {
    case 'bullish':
      allocations = [
        { assetCode: 'USDC', targetPercentage: 20 },
        { assetCode: 'XLM', targetPercentage: 40 },
        { assetCode: 'AQUA', targetPercentage: 30 },
        { assetCode: 'BTC', targetPercentage: 10 },
      ];
      break;
    case 'bearish':
      allocations = [
        { assetCode: 'USDC', targetPercentage: 60 },
        { assetCode: 'XLM', targetPercentage: 20 },
        { assetCode: 'AQUA', targetPercentage: 10 },
        { assetCode: 'BTC', targetPercentage: 10 },
      ];
      break;
    default:
      allocations = portfolioConfig.targetAllocations;
  }

  await manager.client.portfolio.setTargetAllocation(manager.userId, {
    allocations,
    driftThresholdPercent: 5,
    autoRebalance: false,
  });
}
```

## Running the Example

```bash
# Install dependencies
npm install @stellarswipe/sdk dotenv

# Set environment variables
export STELLARSWIPE_API_KEY=your-api-key
export USER_ID=your-user-id

# Run
ts-node index.ts
```

## Next Steps

- Implement custom allocation strategies
- Add more sophisticated risk metrics
- Integrate with external price feeds
- Build a web dashboard
- Add notifications (email, SMS, Telegram)

## Resources

- [API Reference](../api-reference/openapi.yaml)
- [Best Practices](../guides/best-practices.md)
- [Trading Bot Guide](./trading-bot-guide.md)
