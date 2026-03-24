import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateConversationsTable1705000000214 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'::jsonb",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'archived', 'deleted'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'messageCount',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'lastActivityAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index for userId and createdAt
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_conversations_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    // Create chat_messages table
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'conversationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['user', 'assistant', 'system'],
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'modelUsed',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tokenUsage',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'responseTime',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'citations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index for conversationId and createdAt
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_chat_messages_conversationId_createdAt',
        columnNames: ['conversationId', 'createdAt'],
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['conversationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'conversations',
        onDelete: 'CASCADE',
      }),
    );

    // Create user_contexts table
    await queryRunner.createTable(
      new Table({
        name: 'user_contexts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'conversationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'userProfile',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'primaryInterest',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'preferences',
            type: 'jsonb',
            default: "'{}'::jsonb",
            isNullable: false,
          },
          {
            name: 'recentTopics',
            type: 'jsonb',
            default: "'[]'::jsonb",
            isNullable: false,
          },
          {
            name: 'frequentlyAskedQuestions',
            type: 'jsonb',
            default: "'[]'::jsonb",
            isNullable: false,
          },
          {
            name: 'totalConversations',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'totalMessages',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'lastInteractionAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for user_contexts
    await queryRunner.createIndex(
      'user_contexts',
      new TableIndex({
        name: 'IDX_user_contexts_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'user_contexts',
      new TableIndex({
        name: 'IDX_user_contexts_conversationId',
        columnNames: ['conversationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('chat_messages', 'FK_chat_messages_conversationId');

    // Drop tables
    await queryRunner.dropTable('user_contexts', true);
    await queryRunner.dropTable('chat_messages', true);
    await queryRunner.dropTable('conversations', true);
  }
}
