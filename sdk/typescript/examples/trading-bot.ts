import { StellarSwipeClient, Signal } from '../src';

class TradingBot {
  private client: StellarSwipeClient;
  private userId: string;
  private minConfidence: number;
  private maxPositions: number;
  private positionSize: number;

  constructor(
    apiKey: string,
    userId: string,
    config: {
      minConfidence?: number;
      maxPositions?: number;
      positionSize?: number;
    } = {}
  ) {
    this.client = new StellarSwipeClient(apiKey);
    this.userId = userId;
    this.minConfidence = config.minConfidence || 70;
    this.maxPositions = config.maxPositions || 5;
    this.positionSize = config.positionSize || 1000;
  }

  async run() {
    console.log('🤖 Trading Bot Started');
    console.log(`User ID: ${this.userId}`);
    console.log(`Min Confidence: ${this.minConfidence}%`);
    console.log(`Max Positions: ${this.maxPositions}`);
    console.log(`Position Size: $${this.positionSize}\n`);

    while (true) {
      try {
        await this.checkAndExecuteTrades();
        await this.sleep(60000);
      } catch (error) {
        console.error('❌ Bot error:', error);
        await this.sleep(60000);
      }
    }
  }

  private async checkAndExecuteTrades() {
    const openPositions = await this.client.trades.getOpenPositions(this.userId);
    console.log(`📊 Open positions: ${openPositions.length}/${this.maxPositions}`);

    if (openPositions.length >= this.maxPositions) {
      console.log('⏸️  Max positions reached, skipping new trades\n');
      return;
    }

    const signals = await this.client.signals.list({
      limit: 10,
      status: 'ACTIVE',
      sortBy: 'confidence',
      order: 'desc',
    });

    console.log(`🔍 Found ${signals.signals.length} active signals`);

    for (const signal of signals.signals) {
      if (openPositions.length >= this.maxPositions) {
        break;
      }

      if (this.shouldExecuteSignal(signal)) {
        await this.executeSignal(signal);
        openPositions.push({} as any);
      }
    }

    console.log('');
  }

  private shouldExecuteSignal(signal: Signal): boolean {
    if (signal.confidence < this.minConfidence) {
      console.log(`⏭️  Skipping ${signal.assetPair}: confidence too low (${signal.confidence}%)`);
      return false;
    }

    return true;
  }

  private async executeSignal(signal: Signal) {
    try {
      console.log(`\n🎯 Executing signal: ${signal.assetPair}`);
      console.log(`Action: ${signal.action}`);
      console.log(`Confidence: ${signal.confidence}%`);

      const validation = await this.client.trades.validate({
        userId: this.userId,
        signalId: signal.id,
        amount: this.positionSize,
      });

      if (!validation.valid) {
        console.log(`❌ Validation failed: ${validation.errors?.join(', ')}`);
        return;
      }

      const trade = await this.client.trades.execute({
        userId: this.userId,
        signalId: signal.id,
        amount: this.positionSize,
      });

      console.log(`✅ Trade executed: ${trade.id}`);
      console.log(`Entry price: ${trade.entryPrice}`);
    } catch (error) {
      console.error(`❌ Failed to execute trade:`, error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const apiKey = process.env.STELLARSWIPE_API_KEY || 'your-api-key';
const userId = process.env.USER_ID || 'user-123';

const bot = new TradingBot(apiKey, userId, {
  minConfidence: 75,
  maxPositions: 3,
  positionSize: 500,
});

bot.run();
