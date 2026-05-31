import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Signal, SignalStatus } from '../../signals/entities/signal.entity';
import { InteractionMatrix, InteractionType } from '../entities/interaction-matrix.entity';
import {
  IRecommender,
  RecommenderType,
  RecommendationContext,
  ScoredSignal,
  RecommendationReason,
} from '../interfaces/recommender.interface';

interface TrendingScore {
  signalId: string;
  score: number;
  copyCount: number;
  viewCount: number;
  recentActivityScore: number;
}

@Injectable()
export class TrendingSignalsEngine implements IRecommender {
  private readonly logger = new Logger(TrendingSignalsEngine.name);
  private trendingCache: TrendingScore[] = [];
  private cacheBuiltAt: Date | null = null;
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
  ) {}

  getType(): RecommenderType {
    return RecommenderType.TRENDING;
  }

  isReady(): boolean {
    return true; // Always ready — falls back to recency if no interaction data
  }

  async recommend(context: RecommendationContext): Promise<ScoredSignal[]> {
    await this.refreshCacheIfStale();

    const exclude = new Set(context.excludeSignalIds ?? []);
    const candidates = this.trendingCache.filter((t) => !exclude.has(t.signalId));

    const signalIds = candidates.slice(0, context.limit * 2).map((c) => c.signalId);
    if (signalIds.length === 0) return this.fallbackToRecent(context);

    const signals = await this.signalRepository
      .createQueryBuilder('s')
      .where('s.id IN (:...ids)', { ids: signalIds })
      .andWhere('s.status = :status', { status: SignalStatus.ACTIVE })
      .getMany();

    const signalMap = new Map(signals.map((s) => [s.id, s]));
    const scored: ScoredSignal[] = [];

    for (const candidate of candidates) {
      const signal = signalMap.get(candidate.signalId);
      if (!signal) continue;

      if (context.assetPairFilter?.length) {
        const pair = `${signal.baseAsset}/${signal.counterAsset}`;
        if (!context.assetPairFilter.includes(pair)) continue;
      }

      scored.push({
        signal,
        score: candidate.score,
        reasons: [RecommendationReason.TRENDING_NOW],
        engineContributions: { [RecommenderType.TRENDING]: candidate.score },
      });

      if (scored.length >= context.limit) break;
    }

    return scored;
  }

  async refreshCache(): Promise<void> {
    const since = new Date(Date.now() - 24 * 3600 * 1000); // Last 24h

    const interactions = await this.interactionRepository.find({
      where: { updatedAt: MoreThanOrEqual(since) },
    });

    const scoreMap = new Map<string, { copies: number; views: number; recency: number }>();

    for (const interaction of interactions) {
      const entry = scoreMap.get(interaction.signalId) ?? { copies: 0, views: 0, recency: 0 };
      const counts = interaction.interactionCounts as Partial<Record<InteractionType, number>>;

      entry.copies += counts[InteractionType.COPY] ?? 0;
      entry.views += counts[InteractionType.VIEW] ?? 0;
      // More recent activity → higher recency score
      const ageHours = (Date.now() - new Date(interaction.updatedAt).getTime()) / 3600000;
      entry.recency = Math.max(entry.recency, Math.max(0, 1 - ageHours / 24));

      scoreMap.set(interaction.signalId, entry);
    }

    const scores: TrendingScore[] = [];
    for (const [signalId, { copies, views, recency }] of scoreMap.entries()) {
      // Wilson score approximation for trending (popularity + recency)
      const copyScore = Math.log1p(copies) / Math.log1p(100); // Normalized log scale
      const viewScore = Math.log1p(views) / Math.log1p(1000);
      const combined = copyScore * 0.5 + viewScore * 0.2 + recency * 0.3;

      scores.push({
        signalId,
        score: Math.min(1, combined),
        copyCount: copies,
        viewCount: views,
        recentActivityScore: recency,
      });
    }

    this.trendingCache = scores.sort((a, b) => b.score - a.score);
    this.cacheBuiltAt = new Date();
    this.logger.debug(`Trending cache refreshed — ${this.trendingCache.length} scored signals`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async refreshCacheIfStale(): Promise<void> {
    if (!this.cacheBuiltAt || Date.now() - this.cacheBuiltAt.getTime() > this.CACHE_TTL_MS) {
      await this.refreshCache();
    }
  }

  private async fallbackToRecent(context: RecommendationContext): Promise<ScoredSignal[]> {
    const signals = await this.signalRepository.find({
      where: { status: SignalStatus.ACTIVE },
      order: { createdAt: 'DESC', copiersCount: 'DESC' },
      take: context.limit,
    });

    return signals.map((signal, i) => ({
      signal,
      score: Math.max(0.1, 0.8 - i * 0.05),
      reasons: [RecommendationReason.TRENDING_NOW],
      engineContributions: { [RecommenderType.TRENDING]: Math.max(0.1, 0.8 - i * 0.05) },
    }));
  }
}
