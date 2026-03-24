import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('chat_messages')
@Index(['conversationId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @Column({ type: 'enum', enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelUsed: string;

  @Column({ type: 'int', nullable: true })
  tokenUsage: number;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  responseTime: number; // in milliseconds

  @Column({ type: 'jsonb', nullable: true })
  citations: Array<{ title: string; url: string; relevance: string }>;

  @CreateDateColumn()
  createdAt: Date;
}
