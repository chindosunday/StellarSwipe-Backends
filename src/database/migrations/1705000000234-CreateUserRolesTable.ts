import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateUserRolesTable1705000000234 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role_permissions junction table first
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'roleId',
            type: 'uuid',
          },
          {
            name: 'permissionId',
            type: 'uuid',
          },
        ],
        foreignKeys: [
          new ForeignKey({
            columnNames: ['roleId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'roles',
            onDelete: 'CASCADE',
          }),
          new ForeignKey({
            columnNames: ['permissionId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'permissions',
            onDelete: 'CASCADE',
          }),
        ],
      }),
    );

    // Create user_roles table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'roleId',
            type: 'uuid',
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
            name: 'assignmentType',
            type: 'enum',
            enum: ['direct', 'inherited', 'team'],
            default: "'direct'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'pending', 'expired', 'revoked'],
            default: "'active'",
          },
          {
            name: 'assignedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
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
        foreignKeys: [
          new ForeignKey({
            columnNames: ['roleId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'roles',
            onDelete: 'CASCADE',
          }),
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_roles',
      new Index('IDX_user_roles_user_id_role_id', ['userId', 'roleId'], { isUnique: true }),
    );

    await queryRunner.createIndex(
      'user_roles',
      new Index('IDX_user_roles_user_id_status', ['userId', 'status']),
    );

    await queryRunner.createIndex(
      'user_roles',
      new Index('IDX_user_roles_role_id', ['roleId']),
    );

    await queryRunner.createIndex(
      'user_roles',
      new Index('IDX_user_roles_team_id', ['teamId']),
    );

    await queryRunner.createIndex(
      'user_roles',
      new Index('IDX_user_roles_assigned_by', ['assignedBy']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_assigned_by');
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_team_id');
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_role_id');
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_user_id_status');
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_user_id_role_id');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('role_permissions');
  }
}