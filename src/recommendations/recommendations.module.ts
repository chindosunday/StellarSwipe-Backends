import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { Signal } from '../signals/entities/signal.entity';
import { ProviderStats } from '../signals/entities/provider-stats.entity';
// Entities
import { Recommendation } from './entities/recommendation.entity';
import { RecUserPreference } from './entities/user-preference.entity';
import { InteractionMatrix } from './entities/interaction-matrix.entity';
// Engines
import { CollaborativeFilteringEngine } from './engines/collaborative-filtering.engine';
import { ContentBasedEngine } from './engines/content-based.engine';
import { TrendingSignalsEngine } from './engines/trending-signals.engine';
import { HybridRecommenderEngine } from './engines/hybrid-recommender.engine';
// Service + Controller
import { RecommendationEngineService } from './recommendation-engine.service';
import { RecommendationController } from './recommendation.controller';
// Jobs
import { TrainRecommenderJob } from './jobs/train-recommender.job';
import { UpdateRecommendationsJob } from './jobs/update-recommendations.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Signal,
      ProviderStats,
      Recommendation,
      RecUserPreference,
      InteractionMatrix,
    ]),
    CacheModule.register(),
  ],
  controllers: [RecommendationController],
  providers: [
    // Engines
    CollaborativeFilteringEngine,
    ContentBasedEngine,
    TrendingSignalsEngine,
    HybridRecommenderEngine,
    // Core service
    RecommendationEngineService,
    // Scheduled jobs
    TrainRecommenderJob,
    UpdateRecommendationsJob,
  ],
  exports: [RecommendationEngineService],
})
export class RecommendationsModule {}
