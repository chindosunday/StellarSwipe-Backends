import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal, SignalStatus, SignalType } from '../../signals/entities/signal.entity';
import { ProviderStats } from '../../signals/entities/provider-stats.entity';
import { RecUserPreference } from '../entities/user-preference.entity';
import { InteractionMatrix } from '../entities/interaction-matrix.entity';
import {
  IRecommender,
  RecommenderType,
  RecommendationContext,
  ScoredSignal,
  RecommendationReason,
} from '../interfaces/recommender.interface';
import { SimilarityCalculator } from '../utils/similarity-calculator';

/** 8-dimensional content vector per signal */
interface SignalContentVector {
  signalId: string;
  assetPairHash: number;  // Deterministic 0-1 hash of the pair
  signalType: number;     // 0=SELL, 1=BUY
  riskReward: number;     // 0-1
  confidenceScore: number; // 0-1
  providerWinRate: number; // 0-1
  providerReputation: number; // 0-1
  copiersPopularity: number;  // 0-1 (copier count, capped at 500)
  durationHours: number;      // 0-1 (capped at 168h)
}

@Injectable()
export class ContentBasedEngine implements IRecommender {
  private readonly logger = new Logger(ContentBasedEngine.name);
  private signalVectors: Map<string, number[]> = new Map();
  private readonly similarityCalc = new SimilarityCalculator();

  constructor(
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
    @InjectRepository(ProviderStats)
    private providerStatsRepository: Repository<ProviderStats>,
    @InjectRepository(RecUserPreference)
    private preferenceRepository: Repository<RecUserPreference>,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
  ) {}

  getType(): RecommenderType {
    return RecommenderType.CONTENT_BASED;
  }

  isReady(): boolean {
    return this.signalVectors.size > 0;
  }

  async buildIndex(): Promise<void> {
    const signals = await this.signalRepository.find({
      where: { status: SignalStatus.ACTIVE },
    });

    const providerIds = [...new Set(signals.map((s) => s.providerId))];
    const statsMap = new Map<string, ProviderStats>();
    if (providerIds.length > 0) {
      const stats = await this.providerStatsRepository
        .createQueryBuilder('ps')
        .where('ps.provider_id IN (:...ids)', { ids: providerIds })
        .getMany();
      for (const s of stats) statsMap.set(s.providerId, s);
    }

    this.signalVectors = new Map();
    for (const signal of signals) {
      const vec = this.buildSignalVector(signal, statsMap.get(signal.providerId));
      this.signalVectors.set(signal.id, vec);
    }

    this.logger.log(`Content index built — ${this.signalVectors.size} active signals indexed`);
  }

  async recommend(context: RecommendationContext): Promise<ScoredSignal[]> {
    const { userId, limit, excludeSignalIds = [] } = context;

    const [preference, positiveInteractions] = await Promise.all([
      this.preferenceRepository.findOne({ where: { userId } }),
      this.interactionRepository.find({ where: { userId } }),
    ]);

    // Build user profile vector from interactions and explicit preferences
    const userVector = await this.buildUserVector(userId, preference, positiveInteractions);

    if (!userVector) {
      return this.coldStartRecommendations(context);
    }

    const exclude = new Set(excludeSignalIds);
    const scored: ScoredSignal[] = [];

    for (const [signalId, vec] of this.signalVectors.entries()) {
      if (exclude.has(signalId)) continue;

      const signal = await this.getSignal(signalId);
      if (!signal) continue;

      // Asset pair filter
      if (context.assetPairFilter?.length) {
        if (!context.assetPairFilter.includes(`${signal.baseAsset}/${signal.counterAsset}`)) continue;
      }

      // Risk filter
      if (context.maxRiskLevel !== undefined) {
        const riskReward = vec[2]; // riskReward index
        if (riskReward > context.maxRiskLevel) continue;
      }

      const similarity = this.cosineSim(userVector, vec);
      const reasons = this.deriveReasons(signal, preference, similarity);

      scored.push({
        signal,
        score: Math.max(0, Math.min(1, similarity)),
        reasons,
        engineContributions: { [RecommenderType.CONTENT_BASED]: Math.max(0, similarity) },
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildSignalVector(signal: Signal, stats?: ProviderStats): number[] {
    const entry = Number(signal.entryPrice);
    const target = Number(signal.targetPrice);
    const sl = signal.stopLossPrice ? Number(signal.stopLossPrice) : null;
    const risk = sl && sl !== entry ? Math.abs(entry - sl) : 0;
    const reward = Math.abs(target - entry);
    const riskReward = risk > 0 ? Math.min(1, reward / (risk * 5)) : 0.5;

    const now = Date.now();
    const durationMs = signal.expiresAt.getTime() - signal.createdAt.getTime();
    const durationHours = Math.min(1, durationMs / (168 * 3600 * 1000));

    return [
      this.hashAssetPair(`${signal.baseAsset}/${signal.counterAsset}`),
      signal.type === SignalType.BUY ? 1 : 0,
      riskReward,
      signal.confidenceScore / 100,
      stats ? Math.min(1, Number(stats.winRate) / 100) : 0.5,
      stats ? Math.min(1, Number(stats.reputationScore) / 100) : 0.5,
      Math.min(1, signal.copiersCount / 500),
      durationHours,
    ];
  }

  private async buildUserVector(
    userId: string,
    preference: RecUserPreference | null,
    interactions: InteractionMatrix[],
  ): Promise<number[] | null> {
    const positiveInteractions = interactions.filter((i) => Number(i.rating) > 0);
    if (positiveInteractions.length === 0 && !preference) return null;

    // Average vector of positively-rated signals
    const vectors: number[][] = [];
    for (const interaction of positiveInteractions) {
      const vec = this.signalVectors.get(interaction.signalId);
      if (vec) vectors.push(vec.map((v, i) => v * Number(interaction.rating)));
    }

    if (vectors.length === 0) {
      // Cold-start with explicit preferences only
      return this.preferenceToVector(preference);
    }

    const n = vectors.length;
    const avg = vectors[0].map((_, i) => vectors.reduce((s, v) => s + v[i], 0) / n);

    // Blend with explicit preferences if available
    if (preference) {
      const prefVec = this.preferenceToVector(preference);
      if (prefVec) {
        return avg.map((v, i) => v * 0.7 + prefVec[i] * 0.3);
      }
    }

    return avg;
  }

  private preferenceToVector(preference: RecUserPreference | null): number[] | null {
    if (!preference) return null;
    return [
      0.5, // assetPairHash — neutral without specific pair
      0.5, // signalType — neutral
      preference.explicitRiskTolerance,    // riskReward ~ risk tolerance
      0.5, // confidenceScore — neutral
      0.5, // providerWinRate — neutral
      0.5, // providerReputation — neutral
      0.3, // copiersPopularity — slight preference for established signals
      0.5, // duration — neutral
    ];
  }

  private async coldStartRecommendations(context: RecommendationContext): Promise<ScoredSignal[]> {
    // Return high-quality signals sorted by provider win rate + copier count
    const signals = await this.signalRepository.find({
      where: { status: SignalStatus.ACTIVE },
      order: { copiersCount: 'DESC', successRate: 'DESC' },
      take: context.limit,
    });

    return signals.map((signal, i) => ({
      signal,
      score: Math.max(0.1, 1 - i * 0.05),
      reasons: [RecommendationReason.HIGH_WIN_RATE],
      engineContributions: { [RecommenderType.CONTENT_BASED]: Math.max(0.1, 1 - i * 0.05) },
    }));
  }

  private deriveReasons(
    signal: Signal,
    preference: RecUserPreference | null,
    similarity: number,
  ): RecommendationReason[] {
    const reasons: RecommendationReason[] = [];

    if (similarity > 0.7) reasons.push(RecommendationReason.SIMILAR_TRADE_HISTORY);

    const pair = `${signal.baseAsset}/${signal.counterAsset}`;
    if (preference?.preferredAssetPairs?.includes(pair)) {
      reasons.push(RecommendationReason.PREFERRED_ASSET_PAIR);
    }
    if (preference?.preferredProviderIds?.includes(signal.providerId)) {
      reasons.push(RecommendationReason.TRUSTED_PROVIDER);
    }
    if (signal.successRate > 65) reasons.push(RecommendationReason.HIGH_WIN_RATE);

    if (reasons.length === 0) reasons.push(RecommendationReason.MATCHES_RISK_PROFILE);
    return reasons;
  }

  private async getSignal(signalId: string): Promise<Signal | null> {
    return this.signalRepository.findOne({ where: { id: signalId } });
  }

  private cosineSim(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private hashAssetPair(pair: string): number {
    // Simple deterministic hash → 0-1
    let h = 0;
    for (let i = 0; i < pair.length; i++) {
      h = (h * 31 + pair.charCodeAt(i)) & 0xffffffff;
    }
    return ((h >>> 0) % 1000) / 1000;
  }
}
