import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ML-enriched preference profile for the recommendation engine.
 * Complements the basic UserPreference entity (notification settings, language)
 * with learned trading-style signals inferred from interaction history.
 */
@Entity('rec_user_preferences')
@Index(['userId'], { unique: true })
export class RecUserPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // ── Explicit preferences (user-set) ────────────────────────────────────

  @Column({ name: 'preferred_asset_pairs', type: 'jsonb', default: '[]' })
  preferredAssetPairs!: string[]; // e.g. ["XLM/USDC", "BTC/XLM"]

  @Column({ name: 'excluded_asset_pairs', type: 'jsonb', default: '[]' })
  excludedAssetPairs!: string[];

  @Column({ name: 'preferred_provider_ids', type: 'jsonb', default: '[]' })
  preferredProviderIds!: string[];

  @Column({ name: 'explicit_risk_tolerance', type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  explicitRiskTolerance!: number; // 0 (conservative) – 1 (aggressive)

  @Column({ name: 'max_signal_duration_hours', type: 'int', nullable: true })
  maxSignalDurationHours!: number | null;

  // ── Inferred preferences (learned from interactions) ────────────────────

  @Column({ name: 'inferred_risk_tolerance', type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  inferredRiskTolerance!: number;

  @Column({ name: 'asset_pair_affinity', type: 'jsonb', default: '{}' })
  assetPairAffinity!: Record<string, number>; // pair → 0-1 affinity score

  @Column({ name: 'provider_affinity', type: 'jsonb', default: '{}' })
  providerAffinity!: Record<string, number>; // providerId → 0-1 score

  @Column({ name: 'preferred_signal_types', type: 'jsonb', default: '["BUY","SELL"]' })
  preferredSignalTypes!: string[]; // ['BUY', 'SELL']

  @Column({ name: 'active_hours_distribution', type: 'jsonb', default: '{}' })
  activeHoursDistribution!: Record<string, number>; // hour (0-23) → weight

  // ── Latent vector (from matrix factorization) ───────────────────────────

  @Column({ name: 'latent_vector', type: 'jsonb', nullable: true })
  latentVector!: number[] | null; // k-dimensional user embedding

  @Column({ name: 'latent_vector_version', type: 'varchar', length: 50, nullable: true })
  latentVectorVersion!: string | null;

  // ── Stats ────────────────────────────────────────────────────────────────

  @Column({ name: 'total_interactions', type: 'int', default: 0 })
  totalInteractions!: number;

  @Column({ name: 'preferences_updated_at', type: 'timestamp with time zone', nullable: true })
  preferencesUpdatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
