import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Recommendation } from '../entities/recommendation.entity';
import { InteractionMatrix } from '../entities/interaction-matrix.entity';
import { RecUserPreference } from '../entities/user-preference.entity';
import { RecommendationEngineService } from '../recommendation-engine.service';

/**
 * Handles ongoing recommendation lifecycle:
 * - Expires stale recommendations and cleans up old DB rows
 * - Proactively pre-generates fresh recommendations for highly active users
 * - Reports acceptance rate (acted_upon / total) hourly
 */
@Injectable()
export class UpdateRecommendationsJob {
  private readonly logger = new Logger(UpdateRecommendationsJob.name);
  private readonly EXPIRY_CLEANUP_DAYS = 7;

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(InteractionMatrix)
    private interactionRepository: Repository<InteractionMatrix>,
    @InjectRepository(RecUserPreference)
    private preferenceRepository: Repository<RecUserPreference>,
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  /**
   * Cleans up expired recommendations that are older than EXPIRY_CLEANUP_DAYS.
   * Runs nightly at 04:00 UTC.
   */
  @Cron('0 4 * * *', { name: 'cleanup-expired-recommendations', timeZone: 'UTC' })
  async cleanupExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - this.EXPIRY_CLEANUP_DAYS * 24 * 3600 * 1000);
    const result = await this.recommendationRepository.delete({
      createdAt: LessThan(cutoff),
    });
    this.logger.log(`Cleaned up ${result.affected ?? 0} expired recommendation records`);
  }

  /**
   * Pre-generates fresh recommendations for users who have been active in the
   * last 30 minutes. This warms the cache so the next request is instant.
   * Runs every 20 minutes.
   */
  @Cron('*/20 * * * *', { name: 'pre-generate-recommendations', timeZone: 'UTC' })
  async preGenerateForActiveUsers(): Promise<void> {
    const recentCutoff = new Date(Date.now() - 30 * 60 * 1000);

    const recentInteractions = await this.interactionRepository
      .createQueryBuilder('i')
      .select('DISTINCT i.user_id', 'userId')
      .where('i.updated_at >= :since', { since: recentCutoff })
      .getRawMany<{ userId: string }>();

    const activeUserIds = recentInteractions.map((r) => r.userId);
    if (activeUserIds.length === 0) return;

    this.logger.debug(`Pre-generating recommendations for ${activeUserIds.length} active users`);

    let generated = 0;
    for (const userId of activeUserIds) {
      try {
        await this.recommendationEngine.getRecommendations({
          userId,
          limit: 10,
          forceRefresh: true,
        });
        generated++;
      } catch (err) {
        this.logger.warn(`Pre-generation failed for user ${userId}: ${err}`);
      }
    }

    this.logger.debug(`Pre-generated for ${generated}/${activeUserIds.length} active users`);
  }

  /**
   * Hourly acceptance-rate report.
   */
  @Cron('0 * * * *', { name: 'recommendation-acceptance-report', timeZone: 'UTC' })
  async acceptanceRateReport(): Promise<void> {
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    const [total, actedUpon] = await Promise.all([
      this.recommendationRepository.count({
        where: { createdAt: Not(IsNull()) },
      }),
      this.recommendationRepository.count({
        where: { isActedUpon: true },
      }),
    ]);

    if (total === 0) return;

    const rate = ((actedUpon / total) * 100).toFixed(1);
    this.logger.log(
      `Recommendation acceptance rate — acted: ${actedUpon}/${total} (${rate}%) [all time]`,
    );
  }
}
