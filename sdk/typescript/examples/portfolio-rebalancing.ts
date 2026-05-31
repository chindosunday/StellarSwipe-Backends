import { StellarSwipeClient } from '../src';

async function portfolioRebalancingExample() {
  const client = new StellarSwipeClient({
    apiKey: process.env.STELLARSWIPE_API_KEY || 'your-api-key',
  });

  const userId = process.env.USER_ID || 'user-123';

  console.log('=== Portfolio Rebalancing Example ===\n');

  try {
    console.log('1. Setting target allocation...');
    const targetAllocation = await client.portfolio.setTargetAllocation(userId, {
      allocations: [
        { assetCode: 'USDC', targetPercentage: 50 },
        { assetCode: 'XLM', targetPercentage: 30 },
        { assetCode: 'AQUA', targetPercentage: 20 },
      ],
      driftThresholdPercent: 5,
      autoRebalance: false,
    });

    console.log('✅ Target allocation set successfully\n');

    console.log('2. Analyzing drift...');
    const driftAnalysis = await client.portfolio.analyzeDrift(userId);

    console.log(`Requires rebalancing: ${driftAnalysis.requiresRebalancing}`);
    console.log(`Total drift: ${driftAnalysis.totalDrift}%\n`);

    if (driftAnalysis.drifts) {
      console.log('Asset drifts:');
      for (const drift of driftAnalysis.drifts) {
        console.log(
          `  ${drift.assetCode}: ${drift.currentPercentage}% (target: ${drift.targetPercentage}%, drift: ${drift.drift}%)`
        );
      }
      console.log('');
    }

    if (driftAnalysis.requiresRebalancing) {
      console.log('3. Creating rebalancing plan...');
      const plan = await client.portfolio.createRebalancingPlan(userId, false);

      console.log(`Plan ID: ${plan.id}`);
      console.log(`Status: ${plan.status}`);
      console.log(`Total cost: $${plan.totalCost}\n`);

      console.log('Planned trades:');
      for (const trade of plan.trades) {
        console.log(
          `  ${trade.action} ${trade.amount} ${trade.assetCode} (cost: $${trade.estimatedCost})`
        );
      }
      console.log('');

      console.log('4. Listing pending plans...');
      const pendingPlans = await client.portfolio.getPendingPlans(userId);
      console.log(`Pending plans: ${pendingPlans.length}\n`);

      if (pendingPlans.length > 0) {
        console.log('5. Approving first pending plan...');
        const approvedPlan = await client.portfolio.approvePlan(
          userId,
          pendingPlans[0].id
        );
        console.log(`✅ Plan ${approvedPlan.id} approved and executed`);
        console.log(`Executed at: ${approvedPlan.executedAt}\n`);
      }
    } else {
      console.log('✅ Portfolio is balanced, no rebalancing needed\n');
    }

    console.log('6. Checking final portfolio state...');
    const portfolio = await client.portfolio.get(userId);
    console.log(`Total value: $${portfolio.totalValue}`);
    console.log(`ROI: ${portfolio.roi}%\n`);

    console.log('Current positions:');
    for (const position of portfolio.positions) {
      console.log(
        `  ${position.assetCode}: ${position.percentage}% ($${position.value})`
      );
    }

    console.log('\n✅ Portfolio rebalancing example completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

portfolioRebalancingExample();
