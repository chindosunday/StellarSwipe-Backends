import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RecommendationEngineService } from './recommendation-engine.service';
import { HybridRecommenderEngine } from './engines/hybrid-recommender.engine';
import { CollaborativeFilteringEngine } from './engines/collaborative-filtering.engine';
import { ContentBasedEngine } from './engines/content-based.engine';
import { TrendingSignalsEngine } from './engines/trending-signals.engine';
import { Recommendation } from './entities/recommendation.entity';
import { RecUserPreference } from './entities/user-preference.entity';
import { InteractionMatrix, InteractionType } from './entities/interaction-matrix.entity';
import { RecommenderType, RecommendationReason } from './interfaces/recommender.interface';
import { Signal, SignalStatus, SignalType, SignalOutcome } from '../signals/entities/signal.entity';

const mockSignal = (id = 'signal-1'): Partial<Signal> => ({
  id,
  providerId: 'provider-1',
  baseAsset: 'XLM',
  counterAsset: 'USDC',
  type: SignalType.BUY,
  status: SignalStatus.ACTIVE,
  outcome: SignalOutcome.PENDING,
  entryPrice: '0.12',
  targetPrice: '0.14',
  confidenceScore: 75,
  successRate: 68,
  copiersCount: 42,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
});

const mockPreference = (): Partial<RecUserPreference> => ({
  id: 'pref-1',
  userId: 'user-1',
  preferredAssetPairs: ['XLM/USDC'],
  excludedAssetPairs: [],
  preferredProviderIds: [],
  explicitRiskTolerance: 0.5,
  inferredRiskTolerance: 0.5,
  assetPairAffinity: {},
  providerAffinity: {},
  preferredSignalTypes: ['BUY', 'SELL'],
  totalInteractions: 10,
});

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;

  const mockRecommendationRepo = { save: jest.fn(), createQueryBuilder: jest.fn() };
  const mockPreferenceRepo = { findOne: jest.fn(), save: jest.fn(), update: jest.fn() };
  const mockInteractionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { findOne: jest.fn() },
  };
  const mockHybridEngine = { recommend: jest.fn(), isReady: jest.fn() };
  const mockCfEngine = { train: jest.fn(), isReady: jest.fn() };
  const mockCbEngine = { buildIndex: jest.fn(), isReady: jest.fn() };
  const mockTrendingEngine = { refreshCache: jest.fn(), isReady: jest.fn() };
  const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

  const buildScoredSignal = (signalId = 'signal-1') => ({
    signal: mockSignal(signalId) as Signal,
    score: 0.85,
    reasons: [RecommendationReason.SIMILAR_USERS_COPIED],
    engineContributions: {
      [RecommenderType.COLLABORATIVE_FILTERING]: 0.5,
      [RecommenderType.CONTENT_BASED]: 0.35,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationEngineService,
        { provide: getRepositoryToken(Recommendation), useValue: mockRecommendationRepo },
        { provide: getRepositoryToken(RecUserPreference), useValue: mockPreferenceRepo },
        { provide: getRepositoryToken(InteractionMatrix), useValue: mockInteractionRepo },
        { provide: HybridRecommenderEngine, useValue: mockHybridEngine },
        { provide: CollaborativeFilteringEngine, useValue: mockCfEngine },
        { provide: ContentBasedEngine, useValue: mockCbEngine },
        { provide: TrendingSignalsEngine, useValue: mockTrendingEngine },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<RecommendationEngineService>(RecommendationEngineService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getRecommendations', () => {
    it('returns cached result when available and forceRefresh is false', async () => {
      const cached = { userId: 'user-1', recommendations: [], total: 0, fromCache: false, generatedAt: new Date() };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.getRecommendations({ userId: 'user-1' });

      expect(result.fromCache).toBe(true);
      expect(mockHybridEngine.recommend).not.toHaveBeenCalled();
    });

    it('calls hybrid engine and persists recommendations when cache misses', async () => {
      const scoredSignals = [buildScoredSignal()];
      mockCacheManager.get.mockResolvedValue(null);
      mockHybridEngine.recommend.mockResolvedValue(scoredSignals);
      mockInteractionRepo.count.mockResolvedValue(10);
      mockRecommendationRepo.save.mockResolvedValue([
        {
          id: 'rec-1',
          signalId: 'signal-1',
          providerId: 'provider-1',
          score: 0.85,
          rank: 1,
          reasons: [RecommendationReason.SIMILAR_USERS_COPIED],
          engineContributions: {},
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const result = await service.getRecommendations({ userId: 'user-1', limit: 10 });

      expect(mockHybridEngine.recommend).toHaveBeenCalledTimes(1);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].rank).toBe(1);
      expect(result.fromCache).toBe(false);
    });

    it('marks coldStart when user has fewer than 5 interactions', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockHybridEngine.recommend.mockResolvedValue([]);
      mockInteractionRepo.count.mockResolvedValue(2);
      mockRecommendationRepo.save.mockResolvedValue([]);

      const result = await service.getRecommendations({ userId: 'new-user' });

      expect(result.coldStart).toBe(true);
    });

    it('bypasses cache when forceRefresh is true', async () => {
      const staleCached = { userId: 'user-1', recommendations: [], total: 0, fromCache: false, generatedAt: new Date() };
      mockCacheManager.get.mockResolvedValue(staleCached);
      mockHybridEngine.recommend.mockResolvedValue([]);
      mockInteractionRepo.count.mockResolvedValue(10);
      mockRecommendationRepo.save.mockResolvedValue([]);

      await service.getRecommendations({ userId: 'user-1', forceRefresh: true });

      expect(mockHybridEngine.recommend).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordInteraction', () => {
    it('creates a new interaction row when none exists', async () => {
      mockInteractionRepo.findOne.mockResolvedValue(null);
      mockInteractionRepo.manager.findOne.mockResolvedValue(mockSignal());
      mockInteractionRepo.save.mockResolvedValue({});
      mockInteractionRepo.find.mockResolvedValue([]);
      mockPreferenceRepo.findOne.mockResolvedValue(mockPreference());

      await service.recordInteraction('user-1', {
        signalId: 'signal-1',
        interactionType: InteractionType.VIEW,
      });

      expect(mockInteractionRepo.save).toHaveBeenCalledTimes(1);
      const saved = mockInteractionRepo.save.mock.calls[0][0];
      expect(saved.rating).toBeCloseTo(0.1);
    });

    it('updates existing interaction and recalculates rating', async () => {
      const existing = {
        id: 'interaction-1',
        userId: 'user-1',
        signalId: 'signal-1',
        rating: 0.1,
        interactionCounts: { VIEW: 1 },
        pnlOutcome: null,
      };
      mockInteractionRepo.findOne.mockResolvedValue(existing);
      mockInteractionRepo.update.mockResolvedValue({});
      mockInteractionRepo.find.mockResolvedValue([existing]);
      mockPreferenceRepo.findOne.mockResolvedValue(mockPreference());

      await service.recordInteraction('user-1', {
        signalId: 'signal-1',
        interactionType: InteractionType.COPY,
      });

      expect(mockInteractionRepo.update).toHaveBeenCalledTimes(1);
      const updateArgs = mockInteractionRepo.update.mock.calls[0][1];
      expect(updateArgs.interactionCounts['COPY']).toBe(1);
    });

    it('marks recommendation as acted upon when interaction is COPY', async () => {
      const existing = {
        id: 'interaction-1',
        rating: 0.1,
        interactionCounts: {},
        pnlOutcome: null,
      };
      mockInteractionRepo.findOne.mockResolvedValue(existing);
      mockInteractionRepo.update.mockResolvedValue({});
      mockInteractionRepo.find.mockResolvedValue([existing]);
      mockPreferenceRepo.findOne.mockResolvedValue(mockPreference());

      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(qb);

      await service.recordInteraction('user-1', {
        signalId: 'signal-1',
        interactionType: InteractionType.COPY,
      });

      expect(mockRecommendationRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('updates only the provided fields', async () => {
      mockPreferenceRepo.findOne.mockResolvedValue(mockPreference());
      mockPreferenceRepo.update.mockResolvedValue({});

      await service.updatePreferences('user-1', {
        preferredAssetPairs: ['XLM/USDC', 'BTC/USDC'],
        explicitRiskTolerance: 0.7,
      });

      const updateArgs = mockPreferenceRepo.update.mock.calls[0][1];
      expect(updateArgs.preferredAssetPairs).toEqual(['XLM/USDC', 'BTC/USDC']);
      expect(updateArgs.explicitRiskTolerance).toBe(0.7);
      expect(updateArgs.preferredProviderIds).toBeUndefined();
    });
  });
});
