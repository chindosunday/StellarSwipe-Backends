import { StellarSwipeClient } from '../src';

async function main() {
  const client = new StellarSwipeClient({
    apiKey: process.env.STELLARSWIPE_API_KEY || 'your-api-key',
    baseUrl: process.env.STELLARSWIPE_BASE_URL,
  });

  console.log('=== StellarSwipe SDK Basic Usage Examples ===\n');

  try {
    console.log('1. Fetching signal feed...');
    const signalFeed = await client.signals.list({
      limit: 5,
      assetPair: 'USDC/XLM',
      sortBy: 'performance',
    });

    console.log(`Found ${signalFeed.signals.length} signals`);
    if (signalFeed.signals.length > 0) {
      const topSignal = signalFeed.signals[0];
      console.log(`Top signal: ${topSignal.assetPair} - ${topSignal.action}`);
      console.log(`Confidence: ${topSignal.confidence}%`);
      console.log(`Entry Price: ${topSignal.entryPrice}\n`);

      console.log('2. Validating trade execution...');
      const validation = await client.trades.validate({
        userId: 'user-123',
        signalId: topSignal.id,
        amount: 1000,
      });

      console.log(`Trade valid: ${validation.valid}`);
      console.log(`Estimated cost: ${validation.estimatedCost}`);
      console.log(`Estimated fees: ${validation.estimatedFees}\n`);

      if (validation.valid) {
        console.log('3. Executing trade...');
        const trade = await client.trades.execute({
          userId: 'user-123',
          signalId: topSignal.id,
          amount: 1000,
        });

        console.log(`Trade executed: ${trade.id}`);
        console.log(`Status: ${trade.status}`);
        console.log(`Entry price: ${trade.entryPrice}\n`);
      }
    }

    console.log('4. Fetching portfolio...');
    const portfolio = await client.portfolio.get('user-123');
    console.log(`Portfolio value: $${portfolio.totalValue}`);
    console.log(`Total P&L: $${portfolio.totalPnL}`);
    console.log(`ROI: ${portfolio.roi}%`);
    console.log(`Positions: ${portfolio.positions.length}\n`);

    console.log('5. Fetching open positions...');
    const positions = await client.trades.getOpenPositions('user-123');
    console.log(`Open positions: ${positions.length}`);

    console.log('6. Fetching trade summary...');
    const summary = await client.trades.getSummary('user-123');
    console.log(`Total trades: ${summary.totalTrades}`);
    console.log(`Win rate: ${summary.winRate}%`);
    console.log(`Average ROI: ${summary.averageRoi}%\n`);

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

main();
