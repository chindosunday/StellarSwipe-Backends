import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecommendationEngineService } from '../recommendation-engine.service';

/**
 * Scheduled jobs for training the recommendation engines.
 *
 * Schedule overview:
 * - Collaborative filter: full retrain every Sunday 01:00 UTC
 * - Content index:        rebuild twice daily (06:00 and 18:00 UTC)
 * - Trending cache:       refreshed every 15 minutes (handled by TrendingSignalsEngine internally)
 */
@Injectable()
export class TrainRecommenderJob {
  private readonly logger = new Logger(TrainRecommenderJob.name);
  private cfTraining = false;
  private contentBuilding = false;

  constructor(private readonly recommendationEngine: RecommendationEngineService) {}

  /**
   * Full collaborative filter retrain — weekly on Sunday 01:00 UTC.
   * CF training is heavier; running it weekly keeps it up to date without
   * blocking the nightly content-index rebuild.
   */
  @Cron('0 1 * * 0', { name: 'train-collaborative-filter', timeZone: 'UTC' })
  async trainCollaborativeFilter(): Promise<void> {
    if (this.cfTraining) {
      this.logger.warn('CF training already in progress — skipping');
      return;
    }

    this.cfTraining = true;
    this.logger.log('Starting weekly collaborative filter training…');

    try {
      await this.recommendationEngine.trainCollaborativeFilter();
      this.logger.log('Collaborative filter training complete');
    } catch (err) {
      this.logger.error(`Collaborative filter training failed: ${err}`);
    } finally {
      this.cfTraining = false;
    }
  }

  /**
   * Content-based index rebuild — twice daily at 06:00 and 18:00 UTC.
   * Keeps signal content vectors fresh as new signals are published.
   */
  @Cron('0 6,18 * * *', { name: 'rebuild-content-index', timeZone: 'UTC' })
  async rebuildContentIndex(): Promise<void> {
    if (this.contentBuilding) {
      this.logger.warn('Content index rebuild already in progress — skipping');
      return;
    }

    this.contentBuilding = true;
    this.logger.log('Rebuilding content-based signal index…');

    try {
      await this.recommendationEngine.rebuildContentIndex();
      this.logger.log('Content index rebuilt successfully');
    } catch (err) {
      this.logger.error(`Content index rebuild failed: ${err}`);
    } finally {
      this.contentBuilding = false;
    }
  }

  /**
   * Trending signals cache refresh — every 15 minutes.
   */
  @Cron('*/15 * * * *', { name: 'refresh-trending-cache', timeZone: 'UTC' })
  async refreshTrendingCache(): Promise<void> {
    try {
      await this.recommendationEngine.refreshTrendingCache();
    } catch (err) {
      this.logger.error(`Trending cache refresh failed: ${err}`);
    }
  }
}
