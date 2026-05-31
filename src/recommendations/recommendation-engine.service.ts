import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { Recommendation } from './entities/recommendation.entity';
import { RecUserPreference } from './entities/user-preference.entity';
import { InteractionMatrix, InteractionType, INTERACTION_WEIGHTS } from './entities/interaction-matrix.entity';
import { HybridRecommenderEngine } from './engines/hybrid-recommender.engine';
import { CollaborativeFilteringEngine } from './engines/collaborative-filtering.engine';
import { ContentBasedEngine } from './engines/content-based.engine';
import { TrendingSignalsEngine } from './engines/trending-signals.engine';
import { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { RecommendedSignalsDto, RecommendedSignalDto } from './dto/recommended-signals.dto';
import { PreferenceUpdateDto, RecordInteractionDto } from './dto/preference-update.dto';
import { ScoredSignal } from './interfaces/recommender.interface';

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);
  private readonly CACHE_TTL_SECONDS = 600; // 10 minutes

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecUserPreference)
    private preferenceRepository: Repository<RecUserPreference>,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
    private readonly hybridEngine: HybridRecommenderEngine,
    private readonly cfEngine: CollaborativeFilteringEngine,
    private readonly cbEngine: ContentBasedEngine,
    private readonly trendingEngine: TrendingSignalsEngine,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ── Recommendation generation ─────────────────────────────────────────────

  async getRecommendations(request: RecommendationRequestDto): Promise<RecommendedSignalsDto> {
    const limit = request.limit ?? 10;
    const cacheKey = `rec:${request.userId}:${limit}:${(request.assetPairFilter ?? []).join(',')}`;

    if (!request.forceRefresh) {
      const cached = await this.cacheManager.get<RecommendedSignalsDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user ${request.userId}`);
        return { ...cached, fromCache: true };
      }
    }

    const isColdStart = await this.isColdStart(request.userId);
    const scored = await this.hybridEngine.recommend({
      userId: request.userId,
      limit,
      excludeSignalIds: request.excludeSignalIds,
      assetPairFilter: request.assetPairFilter,
      maxRiskLevel: request.maxRiskLevel,
    });

    const batchId = uuidv4();
    const expiresAt = new Date(Date.now() + 2 * 3600 * 1000); // 2h expiry

    const records = await this.persistRecommendations(scored, request.userId, batchId, expiresAt);

    const recommendations: RecommendedSignalDto[] = records.map((rec, i) => {
      const item = scored.find((s) => s.signal.id === rec.signalId)!;
      return {
        recommendationId: rec.id,
        signalId: rec.signalId,
        providerId: rec.providerId,
        assetPair: `${item.signal.baseAsset}/${item.signal.counterAsset}`,
        score: Math.round(rec.score * 100),
        rank: i + 1,
        reasons: rec.reasons,
        engineContributions: Object.entries(rec.engineContributions).map(([engine, weight]) => ({
          engine: engine as any,
          weight: parseFloat((weight as number).toFixed(3)),
        })),
        expiresAt: rec.expiresAt,
        generatedAt: rec.createdAt,
      };
    });

    const result: RecommendedSignalsDto = {
      userId: request.userId,
      recommendations,
      total: recommendations.length,
      fromCache: false,
      generatedAt: new Date(),
      coldStart: isColdStart,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_SECONDS);
    return result;
  }

  // ── Interaction recording ─────────────────────────────────────────────────

  async recordInteraction(userId: string, dto: RecordInteractionDto): Promise<void> {
    const existing = await this.interactionRepository.findOne({
      where: { userId, signalId: dto.signalId },
    });

    const weight = INTERACTION_WEIGHTS[dto.interactionType];

    if (existing) {
      const counts = { ...(existing.interactionCounts as Record<string, number>) };
      counts[dto.interactionType] = (counts[dto.interactionType] ?? 0) + 1;

      // Recompute aggregate rating from all interaction counts
      let newRating = 0;
      for (const [type, count] of Object.entries(counts)) {
        newRating += (INTERACTION_WEIGHTS[type as InteractionType] ?? 0) * Math.min(count, 10);
      }

      await this.interactionRepository.update(existing.id, {
        interactionCounts: counts,
        rating: Math.max(-1, Math.min(2, newRating)),
        lastInteractionType: dto.interactionType,
        pnlOutcome: dto.pnlOutcome ?? existing.pnlOutcome,
      });
    } else {
      // Find signal to populate provider/asset metadata
      const signal = await this.interactionRepository.manager.findOne('signals', {
        where: { id: dto.signalId },
      }) as any;

      await this.interactionRepository.save({
        userId,
        signalId: dto.signalId,
        providerId: signal?.providerId ?? 'unknown',
        assetPair: signal ? `${signal.baseAsset}/${signal.counterAsset}` : 'UNKNOWN/UNKNOWN',
        rating: weight,
        interactionCounts: { [dto.interactionType]: 1 },
        lastInteractionType: dto.interactionType,
        pnlOutcome: dto.pnlOutcome ?? null,
      });
    }

    // Mark recommendation as acted upon if the user copied a signal
    if (dto.interactionType === InteractionType.COPY) {
      await this.markRecommendationActedUpon(userId, dto.signalId);
    }

    // Invalidate recommendation cache for this user
    await this.invalidateUserCache(userId);

    // Update inferred preferences asynchronously
    this.updateInferredPreferences(userId).catch((err) =>
      this.logger.error(`Failed to update inferred preferences for ${userId}: ${err}`),
    );
  }

  // ── Preference management ─────────────────────────────────────────────────

  async getOrCreatePreferences(userId: string): Promise<RecUserPreference> {
    let pref = await this.preferenceRepository.findOne({ where: { userId } });
    if (!pref) {
      pref = await this.preferenceRepository.save({
        userId,
        preferredAssetPairs: [],
        excludedAssetPairs: [],
        preferredProviderIds: [],
        explicitRiskTolerance: 0.5,
        inferredRiskTolerance: 0.5,
        assetPairAffinity: {},
        providerAffinity: {},
        preferredSignalTypes: ['BUY', 'SELL'],
        activeHoursDistribution: {},
        latentVector: null,
        latentVectorVersion: null,
        totalInteractions: 0,
        preferencesUpdatedAt: null,
      });
    }
    return pref;
  }

  async updatePreferences(userId: string, dto: PreferenceUpdateDto): Promise<RecUserPreference> {
    const pref = await this.getOrCreatePreferences(userId);

    const updates: Partial<RecUserPreference> = {};
    if (dto.preferredAssetPairs !== undefined) updates.preferredAssetPairs = dto.preferredAssetPairs;
    if (dto.excludedAssetPairs !== undefined) updates.excludedAssetPairs = dto.excludedAssetPairs;
    if (dto.preferredProviderIds !== undefined) updates.preferredProviderIds = dto.preferredProviderIds;
    if (dto.explicitRiskTolerance !== undefined) updates.explicitRiskTolerance = dto.explicitRiskTolerance;
    if (dto.maxSignalDurationHours !== undefined) updates.maxSignalDurationHours = dto.maxSignalDurationHours;
    if (dto.preferredSignalTypes !== undefined) updates.preferredSignalTypes = dto.preferredSignalTypes;
    updates.preferencesUpdatedAt = new Date();

    await this.preferenceRepository.update(pref.id, updates);
    await this.invalidateUserCache(userId);
    return this.getOrCreatePreferences(userId);
  }

  // ── Public engine management ──────────────────────────────────────────────

  async trainCollaborativeFilter(): Promise<void> {
    await this.cfEngine.train();
  }

  async rebuildContentIndex(): Promise<void> {
    await this.cbEngine.buildIndex();
  }

  async refreshTrendingCache(): Promise<void> {
    await this.trendingEngine.refreshCache();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async persistRecommendations(
    scored: ScoredSignal[],
    userId: string,
    batchId: string,
    expiresAt: Date,
  ): Promise<Recommendation[]> {
    const records = scored.map((item, i) => ({
      userId,
      signalId: item.signal.id,
      providerId: item.signal.providerId,
      score: item.score,
      rank: i + 1,
      reasons: item.reasons,
      engineContributions: item.engineContributions,
      recommendationBatchId: batchId,
      isActedUpon: false,
      actedAt: null,
      expiresAt,
    }));

    return this.recommendationRepository.save(records);
  }

  private async markRecommendationActedUpon(userId: string, signalId: string): Promise<void> {
    await this.recommendationRepository
      .createQueryBuilder()
      .update()
      .set({ isActedUpon: true, actedAt: new Date() })
      .where('user_id = :userId AND signal_id = :signalId AND is_acted_upon = false', {
        userId,
        signalId,
      })
      .execute();
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    // Invalidate all cache keys for this user (various limit/filter combos)
    // A production setup would use cache tagging; here we invalidate the default key
    await this.cacheManager.del(`rec:${userId}:10:`);
  }

  private async isColdStart(userId: string): Promise<boolean> {
    const count = await this.interactionRepository.count({ where: { userId } });
    return count < 5;
  }

  private async updateInferredPreferences(userId: string): Promise<void> {
    const interactions = await this.interactionRepository.find({ where: { userId } });
    if (interactions.length === 0) return;

    const pref = await this.getOrCreatePreferences(userId);

    // Compute asset pair affinity from interaction ratings
    const pairAffinity: Record<string, number[]> = {};
    const providerAffinity: Record<string, number[]> = {};
    const hourDist: Record<string, number> = {};

    for (const interaction of interactions) {
      const rating = Number(interaction.rating);

      if (!pairAffinity[interaction.assetPair]) pairAffinity[interaction.assetPair] = [];
      pairAffinity[interaction.assetPair].push(rating);

      if (!providerAffinity[interaction.providerId]) providerAffinity[interaction.providerId] = [];
      providerAffinity[interaction.providerId].push(rating);

      const hour = new Date(interaction.updatedAt).getUTCHours().toString();
      hourDist[hour] = (hourDist[hour] ?? 0) + 1;
    }

    const avgAffinity = (vals: number[]): number => {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return Math.max(0, Math.min(1, (avg + 1) / 3)); // -1..2 → 0..1
    };

    const assetPairAffinityResult: Record<string, number> = {};
    for (const [pair, vals] of Object.entries(pairAffinity)) {
      assetPairAffinityResult[pair] = avgAffinity(vals);
    }

    const providerAffinityResult: Record<string, number> = {};
    for (const [id, vals] of Object.entries(providerAffinity)) {
      providerAffinityResult[id] = avgAffinity(vals);
    }

    // Inferred risk tolerance: users who copy more aggressive signals get higher score
    const avgRating = interactions.reduce((s, i) => s + Number(i.rating), 0) / interactions.length;
    const inferredRisk = Math.max(0, Math.min(1, (avgRating + 1) / 3));

    await this.preferenceRepository.update(pref.id, {
      assetPairAffinity: assetPairAffinityResult,
      providerAffinity: providerAffinityResult,
      activeHoursDistribution: hourDist,
      inferredRiskTolerance: inferredRisk,
      totalInteractions: interactions.length,
      preferencesUpdatedAt: new Date(),
    });
  }
}
