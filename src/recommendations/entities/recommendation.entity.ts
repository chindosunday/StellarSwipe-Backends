import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RecommenderType, RecommendationReason } from '../interfaces/recommender.interface';

@Entity('rec_recommendations')
@Index(['userId', 'createdAt'])
@Index(['userId', 'isActedUpon'])
@Index(['signalId'])
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'signal_id', type: 'uuid' })
  signalId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ name: 'score', type: 'decimal', precision: 5, scale: 4 })
  score!: number;

  @Column({ name: 'rank', type: 'smallint' })
  rank!: number;

  @Column({ name: 'reasons', type: 'jsonb' })
  reasons!: RecommendationReason[];

  @Column({ name: 'engine_contributions', type: 'jsonb' })
  engineContributions!: Partial<Record<RecommenderType, number>>;

  @Column({ name: 'recommendation_batch_id', type: 'varchar', length: 36 })
  recommendationBatchId!: string;

  @Column({ name: 'is_acted_upon', type: 'boolean', default: false })
  isActedUpon!: boolean;

  @Column({ name: 'acted_at', type: 'timestamp with time zone', nullable: true })
  actedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
