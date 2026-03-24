import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InteractionType {
  VIEW = 'VIEW',           // User viewed the signal detail
  COPY = 'COPY',           // User copied the signal
  DISMISS = 'DISMISS',     // User dismissed/hid the recommendation
  PROFIT = 'PROFIT',       // Copied signal resulted in profit
  LOSS = 'LOSS',           // Copied signal resulted in a loss
  SHARE = 'SHARE',         // User shared the signal
  BOOKMARK = 'BOOKMARK',   // User bookmarked for later
}

// Implicit rating weights used when computing the interaction score
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  [InteractionType.VIEW]: 0.1,
  [InteractionType.COPY]: 1.0,
  [InteractionType.DISMISS]: -0.5,
  [InteractionType.PROFIT]: 1.5,
  [InteractionType.LOSS]: -0.3,
  [InteractionType.SHARE]: 0.6,
  [InteractionType.BOOKMARK]: 0.4,
};

@Entity('rec_interaction_matrix')
@Index(['userId', 'signalId'], { unique: true })
@Index(['userId', 'interactionType'])
@Index(['signalId', 'interactionType'])
@Index(['userId', 'updatedAt'])
export class InteractionMatrix {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'signal_id', type: 'uuid' })
  signalId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ name: 'asset_pair', type: 'varchar', length: 50 })
  assetPair!: string;

  /**
   * Aggregated implicit rating computed from all interaction types.
   * Range: -1 (strongly negative) to +2 (strong positive signal).
   */
  @Column({ name: 'rating', type: 'decimal', precision: 4, scale: 3, default: 0 })
  rating!: number;

  @Column({ name: 'interaction_counts', type: 'jsonb', default: '{}' })
  interactionCounts!: Partial<Record<InteractionType, number>>;

  @Column({ name: 'last_interaction_type', type: 'enum', enum: InteractionType, nullable: true })
  lastInteractionType!: InteractionType | null;

  @Column({ name: 'pnl_outcome', type: 'decimal', precision: 10, scale: 4, nullable: true })
  pnlOutcome!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
