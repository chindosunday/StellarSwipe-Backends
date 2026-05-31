import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePermissionsTable1705000000233 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'enum',
            enum: [
              'user_management',
              'team_management',
              'content_management',
              'financial',
              'system',
              'trading',
              'analytics',
              'compliance',
            ],
            default: "'system'",
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['read', 'write', 'delete', 'admin'],
            default: "'read'",
          },
          {
            name: 'resource',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'permissions',
      new Index('IDX_permissions_name', ['name'], { isUnique: true }),
    );

    await queryRunner.createIndex(
      'permissions',
      new Index('IDX_permissions_category_level', ['category', 'level']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('permissions', 'IDX_permissions_category_level');
    await queryRunner.dropIndex('permissions', 'IDX_permissions_name');
    await queryRunner.dropTable('permissions');
  }
}