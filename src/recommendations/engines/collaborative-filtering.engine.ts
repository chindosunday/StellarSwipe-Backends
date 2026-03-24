import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal, SignalStatus } from '../../signals/entities/signal.entity';
import { InteractionMatrix } from '../entities/interaction-matrix.entity';
import { RecUserPreference } from '../entities/user-preference.entity';
import {
  IRecommender,
  RecommenderType,
  RecommendationContext,
  ScoredSignal,
  RecommendationReason,
} from '../interfaces/recommender.interface';
import { SimilarityCalculator } from '../utils/similarity-calculator';
import { MatrixFactorization, MFResult } from '../utils/matrix-factorization';
import { SimilarityMethod } from '../interfaces/similarity-metric.interface';

@Injectable()
export class CollaborativeFilteringEngine implements IRecommender {
  private readonly logger = new Logger(CollaborativeFilteringEngine.name);
  private mfResult: MFResult | null = null;
  private ratingMatrix: Map<string, Map<string, number>> = new Map();
  private lastTrainedAt: Date | null = null;
  private readonly similarityCalc = new SimilarityCalculator();
  private readonly mf = new MatrixFactorization({ k: 16, epochs: 30 });

  constructor(
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
    @InjectRepository(RecUserPreference)
    private preferenceRepository: Repository<RecUserPreference>,
  ) {}

  getType(): RecommenderType {
    return RecommenderType.COLLABORATIVE_FILTERING;
  }

  isReady(): boolean {
    return this.mfResult !== null && this.ratingMatrix.size > 1;
  }

  async train(): Promise<void> {
    this.logger.log('Training collaborative filtering model…');
    const interactions = await this.interactionRepository.find({
      order: { updatedAt: 'DESC' },
    });

    this.ratingMatrix = new Map();
    for (const interaction of interactions) {
      if (!this.ratingMatrix.has(interaction.userId)) {
        this.ratingMatrix.set(interaction.userId, new Map());
      }
      this.ratingMatrix.get(interaction.userId)!.set(interaction.signalId, Number(interaction.rating));
    }

    if (this.ratingMatrix.size >= 2) {
      this.mfResult = this.mf.fit(this.ratingMatrix);
      this.logger.log(
        `CF training complete — users: ${this.ratingMatrix.size} loss: ${this.mfResult.trainingLoss.toFixed(4)}`,
      );
    } else {
      this.logger.warn('Insufficient users for collaborative filtering');
    }

    this.lastTrainedAt = new Date();
  }

  async recommend(context: RecommendationContext): Promise<ScoredSignal[]> {
    const { userId, limit, excludeSignalIds = [] } = context;

    // Get signals the user has already seen
    const userInteractions = this.ratingMatrix.get(userId);
    const seenIds = new Set([...(userInteractions?.keys() ?? []), ...excludeSignalIds]);

    const candidates = await this.getCandidates(userId, seenIds, limit * 3);
    if (candidates.length === 0) return [];

    // Fetch actual signal objects
    const signalIds = candidates.map((c) => c.signalId);
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

      // Apply context filters
      if (context.assetPairFilter?.length) {
        const pair = `${signal.baseAsset}/${signal.counterAsset}`;
        if (!context.assetPairFilter.includes(pair)) continue;
      }

      const normalizedScore = Math.max(0, Math.min(1, (candidate.score + 1) / 3)); // -1..2 → 0..1
      scored.push({
        signal,
        score: normalizedScore,
        reasons: [RecommendationReason.SIMILAR_USERS_COPIED],
        engineContributions: { [RecommenderType.COLLABORATIVE_FILTERING]: normalizedScore },
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getCandidates(
    userId: string,
    seenIds: Set<string>,
    k: number,
  ): Promise<Array<{ signalId: string; score: number }>> {
    // Strategy 1: MF-based prediction (preferred when model is trained)
    if (this.mfResult && this.mfResult.userVectors.has(userId)) {
      return this.mf.topK(this.mfResult, userId, seenIds, k);
    }

    // Strategy 2: User-User CF (fallback when user lacks MF embedding)
    const similarUsers = this.similarityCalc.findSimilarUsers(
      userId,
      this.ratingMatrix,
      20,
      SimilarityMethod.COSINE,
    );

    if (similarUsers.length === 0) return [];

    const scores = new Map<string, number>();
    const totalSim = similarUsers.reduce((s, u) => s + u.similarity, 0);

    for (const { userId: simUserId, similarity } of similarUsers) {
      const ratings = this.ratingMatrix.get(simUserId);
      if (!ratings) continue;
      for (const [signalId, rating] of ratings.entries()) {
        if (seenIds.has(signalId) || rating <= 0) continue;
        const prev = scores.get(signalId) ?? 0;
        scores.set(signalId, prev + (similarity / totalSim) * rating);
      }
    }

    return [...scores.entries()]
      .map(([signalId, score]) => ({ signalId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
