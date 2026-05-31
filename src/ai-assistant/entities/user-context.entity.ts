import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_contexts')
@Index(['userId'])
@Index(['conversationId'])
export class UserContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid', { nullable: true })
  conversationId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  userProfile: string; // beginner, intermediate, expert

  @Column({ type: 'varchar', length: 100, nullable: true })
  primaryInterest: string; // e.g., 'cryptocurrency', 'forex', 'signals'

  @Column({ type: 'jsonb', default: {} })
  preferences: {
    language?: string;
    responseLength?: 'short' | 'medium' | 'long';
    technicalLevel?: 'basic' | 'intermediate' | 'advanced';
    focusAreas?: string[];
  };

  @Column({ type: 'jsonb', default: [] })
  recentTopics: string[];

  @Column({ type: 'jsonb', default: [] })
  frequentlyAskedQuestions: string[];

  @Column({ type: 'int', default: 0 })
  totalConversations: number;

  @Column({ type: 'int', default: 0 })
  totalMessages: number;

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
