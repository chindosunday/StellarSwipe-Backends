import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateRolesTable1705000000232 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
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
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['system', 'custom', 'team'],
            default: "'custom'",
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['global', 'team', 'organization'],
            default: "'team'",
          },
          {
            name: 'teamId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
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
      'roles',
      new Index('IDX_roles_name_scope', ['name', 'scope']),
    );

    await queryRunner.createIndex(
      'roles',
      new Index('IDX_roles_team_id', ['teamId']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('roles', 'IDX_roles_team_id');
    await queryRunner.dropIndex('roles', 'IDX_roles_name_scope');
    await queryRunner.dropTable('roles');
  }
}