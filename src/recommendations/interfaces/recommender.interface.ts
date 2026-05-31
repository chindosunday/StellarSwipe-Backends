import { Signal } from '../../signals/entities/signal.entity';

export enum RecommenderType {
  COLLABORATIVE_FILTERING = 'COLLABORATIVE_FILTERING',
  CONTENT_BASED = 'CONTENT_BASED',
  HYBRID = 'HYBRID',
  TRENDING = 'TRENDING',
}

export enum RecommendationReason {
  SIMILAR_USERS_COPIED = 'SIMILAR_USERS_COPIED',
  MATCHES_RISK_PROFILE = 'MATCHES_RISK_PROFILE',
  PREFERRED_ASSET_PAIR = 'PREFERRED_ASSET_PAIR',
  TRUSTED_PROVIDER = 'TRUSTED_PROVIDER',
  TRENDING_NOW = 'TRENDING_NOW',
  HIGH_WIN_RATE = 'HIGH_WIN_RATE',
  STRONG_RECENT_PERFORMANCE = 'STRONG_RECENT_PERFORMANCE',
  SIMILAR_TRADE_HISTORY = 'SIMILAR_TRADE_HISTORY',
}

export interface ScoredSignal {
  signal: Signal;
  score: number;          // 0-1 relevance score
  reasons: RecommendationReason[];
  engineContributions: Partial<Record<RecommenderType, number>>;
}

export interface RecommendationContext {
  userId: string;
  limit: number;
  excludeSignalIds?: string[];
  assetPairFilter?: string[];
  maxRiskLevel?: number; // 0-1
}

export interface IRecommender {
  getType(): RecommenderType;
  recommend(context: RecommendationContext): Promise<ScoredSignal[]>;
  isReady(): boolean;
}
