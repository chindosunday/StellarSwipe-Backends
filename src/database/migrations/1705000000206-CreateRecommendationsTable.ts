import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRecommendationsTable1705000000206 implements MigrationInterface {
  name = 'CreateRecommendationsTable1705000000206';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "rec_recommendation_reason_enum" AS ENUM (
        'SIMILAR_USERS_COPIED',
        'MATCHES_RISK_PROFILE',
        'PREFERRED_ASSET_PAIR',
        'TRUSTED_PROVIDER',
        'TRENDING_NOW',
        'HIGH_WIN_RATE',
        'STRONG_RECENT_PERFORMANCE',
        'SIMILAR_TRADE_HISTORY'
      )
    `);

    // rec_user_preferences
    await queryRunner.createTable(
      new Table({
        name: 'rec_user_preferences',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'preferred_asset_pairs', type: 'jsonb', default: "'[]'" },
          { name: 'excluded_asset_pairs', type: 'jsonb', default: "'[]'" },
          { name: 'preferred_provider_ids', type: 'jsonb', default: "'[]'" },
          { name: 'explicit_risk_tolerance', type: 'decimal', precision: 3, scale: 2, default: 0.5 },
          { name: 'max_signal_duration_hours', type: 'int', isNullable: true },
          { name: 'inferred_risk_tolerance', type: 'decimal', precision: 3, scale: 2, default: 0.5 },
          { name: 'asset_pair_affinity', type: 'jsonb', default: "'{}'" },
          { name: 'provider_affinity', type: 'jsonb', default: "'{}'" },
          { name: 'preferred_signal_types', type: 'jsonb', default: "'[\"BUY\",\"SELL\"]'" },
          { name: 'active_hours_distribution', type: 'jsonb', default: "'{}'" },
          { name: 'latent_vector', type: 'jsonb', isNullable: true },
          { name: 'latent_vector_version', type: 'varchar', length: '50', isNullable: true },
          { name: 'total_interactions', type: 'int', default: 0 },
          { name: 'preferences_updated_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'created_at', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_rec_user_preferences_user_id" ON "rec_user_preferences" ("user_id")`);

    // rec_recommendations
    await queryRunner.createTable(
      new Table({
        name: 'rec_recommendations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'signal_id', type: 'uuid', isNullable: false },
          { name: 'provider_id', type: 'uuid', isNullable: false },
          { name: 'score', type: 'decimal', precision: 5, scale: 4, isNullable: false },
          { name: 'rank', type: 'smallint', isNullable: false },
          { name: 'reasons', type: 'jsonb', isNullable: false },
          { name: 'engine_contributions', type: 'jsonb', isNullable: false, default: "'{}'" },
          { name: 'recommendation_batch_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'is_acted_upon', type: 'boolean', default: false },
          { name: 'acted_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'expires_at', type: 'timestamp with time zone', isNullable: false },
          { name: 'created_at', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.query(`CREATE INDEX "IDX_rec_recommendations_user_created" ON "rec_recommendations" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_recommendations_user_acted" ON "rec_recommendations" ("user_id", "is_acted_upon")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_recommendations_signal_id" ON "rec_recommendations" ("signal_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_recommendations_batch" ON "rec_recommendations" ("recommendation_batch_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('rec_recommendations');
    await queryRunner.dropTable('rec_user_preferences');
    await queryRunner.query(`DROP TYPE IF EXISTS "rec_recommendation_reason_enum"`);
  }
}
