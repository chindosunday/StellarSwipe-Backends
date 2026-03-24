import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IRecommender,
  RecommenderType,
  RecommendationContext,
  ScoredSignal,
  RecommendationReason,
} from '../interfaces/recommender.interface';
import { CollaborativeFilteringEngine } from './collaborative-filtering.engine';
import { ContentBasedEngine } from './content-based.engine';
import { TrendingSignalsEngine } from './trending-signals.engine';
import { InteractionMatrix } from '../entities/interaction-matrix.entity';
import { RecUserPreference } from '../entities/user-preference.entity';

/** Engine weights — tuned by empirical performance.
 *  For new users (cold start) CF weight drops to 0. */
interface EngineWeights {
  cf: number;
  cb: number;
  trending: number;
}

const WARM_WEIGHTS: EngineWeights = { cf: 0.50, cb: 0.35, trending: 0.15 };
const COLD_WEIGHTS: EngineWeights = { cf: 0.00, cb: 0.60, trending: 0.40 };
const COLD_START_THRESHOLD = 5; // Minimum interactions before CF kicks in

@Injectable()
export class HybridRecommenderEngine implements IRecommender {
  private readonly logger = new Logger(HybridRecommenderEngine.name);

  constructor(
    private readonly cfEngine: CollaborativeFilteringEngine,
    private readonly cbEngine: ContentBasedEngine,
    private readonly trendingEngine: TrendingSignalsEngine,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
    @InjectRepository(RecUserPreference)
    private preferenceRepository: Repository<RecUserPreference>,
  ) {}

  getType(): RecommenderType {
    return RecommenderType.HYBRID;
  }

  isReady(): boolean {
    return this.trendingEngine.isReady();
  }

  async recommend(context: RecommendationContext): Promise<ScoredSignal[]> {
    const isColdStart = await this.isColdStart(context.userId);
    const weights = isColdStart ? COLD_WEIGHTS : WARM_WEIGHTS;

    this.logger.debug(
      `Hybrid recommend for user ${context.userId} — cold-start: ${isColdStart}`,
    );

    // Fetch more candidates than needed from each engine, then blend
    const expandedContext: RecommendationContext = { ...context, limit: context.limit * 3 };

    const [cfResults, cbResults, trendingResults] = await Promise.all([
      weights.cf > 0 && this.cfEngine.isReady()
        ? this.cfEngine.recommend(expandedContext)
        : Promise.resolve([] as ScoredSignal[]),
      this.cbEngine.recommend(expandedContext),
      this.trendingEngine.recommend(expandedContext),
    ]);

    // Merge and re-score with weighted combination
    const merged = this.mergeScores(
      { results: cfResults, weight: weights.cf, type: RecommenderType.COLLABORATIVE_FILTERING },
      { results: cbResults, weight: weights.cb, type: RecommenderType.CONTENT_BASED },
      { results: trendingResults, weight: weights.trending, type: RecommenderType.TRENDING },
    );

    // Apply diversity: avoid recommending the same provider repeatedly
    const diversified = this.diversify(merged, context.limit);

    return diversified;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private mergeScores(
    ...engines: Array<{ results: ScoredSignal[]; weight: number; type: RecommenderType }>
  ): ScoredSignal[] {
    const combined = new Map<string, ScoredSignal>();

    for (const { results, weight, type } of engines) {
      if (weight === 0) continue;
      for (const item of results) {
        const key = item.signal.id;
        if (combined.has(key)) {
          const existing = combined.get(key)!;
          existing.score += item.score * weight;
          existing.engineContributions[type] = item.score * weight;
          // Merge reasons (deduplicate)
          for (const r of item.reasons) {
            if (!existing.reasons.includes(r)) existing.reasons.push(r);
          }
        } else {
          combined.set(key, {
            ...item,
            score: item.score * weight,
            engineContributions: { [type]: item.score * weight },
            reasons: [...item.reasons],
          });
        }
      }
    }

    // Normalise scores to [0, 1]
    const values = [...combined.values()];
    const maxScore = Math.max(...values.map((v) => v.score), 1e-9);
    for (const item of values) item.score /= maxScore;

    return values.sort((a, b) => b.score - a.score);
  }

  private diversify(signals: ScoredSignal[], limit: number): ScoredSignal[] {
    const result: ScoredSignal[] = [];
    const providerCount = new Map<string, number>();
    const MAX_PER_PROVIDER = 3;

    for (const item of signals) {
      const count = providerCount.get(item.signal.providerId) ?? 0;
      if (count >= MAX_PER_PROVIDER) continue;
      result.push(item);
      providerCount.set(item.signal.providerId, count + 1);
      if (result.length >= limit) break;
    }

    // If not enough diverse results, fill remainder with best remaining
    if (result.length < limit) {
      for (const item of signals) {
        if (result.some((r) => r.signal.id === item.signal.id)) continue;
        result.push(item);
        if (result.length >= limit) break;
      }
    }

    return result;
  }

  private async isColdStart(userId: string): Promise<boolean> {
    const count = await this.interactionRepository.count({ where: { userId } });
    return count < COLD_START_THRESHOLD;
  }
}
