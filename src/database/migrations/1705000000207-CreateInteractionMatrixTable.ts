import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInteractionMatrixTable1705000000207 implements MigrationInterface {
  name = 'CreateInteractionMatrixTable1705000000207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "rec_interaction_type_enum" AS ENUM (
        'VIEW', 'COPY', 'DISMISS', 'PROFIT', 'LOSS', 'SHARE', 'BOOKMARK'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'rec_interaction_matrix',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'signal_id', type: 'uuid', isNullable: false },
          { name: 'provider_id', type: 'uuid', isNullable: false },
          { name: 'asset_pair', type: 'varchar', length: '50', isNullable: false },
          { name: 'rating', type: 'decimal', precision: 4, scale: 3, default: 0 },
          { name: 'interaction_counts', type: 'jsonb', default: "'{}'" },
          {
            name: 'last_interaction_type',
            type: 'enum',
            enumName: 'rec_interaction_type_enum',
            isNullable: true,
          },
          { name: 'pnl_outcome', type: 'decimal', precision: 10, scale: 4, isNullable: true },
          { name: 'created_at', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_rec_interaction_user_signal" ON "rec_interaction_matrix" ("user_id", "signal_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_interaction_user_type" ON "rec_interaction_matrix" ("user_id", "last_interaction_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_interaction_signal_type" ON "rec_interaction_matrix" ("signal_id", "last_interaction_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_interaction_user_updated" ON "rec_interaction_matrix" ("user_id", "updated_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_rec_interaction_provider" ON "rec_interaction_matrix" ("provider_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('rec_interaction_matrix');
    await queryRunner.query(`DROP TYPE IF EXISTS "rec_interaction_type_enum"`);
  }
}
