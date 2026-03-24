import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Role } from './role.entity';

export enum AssignmentType {
  DIRECT = 'direct',
  INHERITED = 'inherited',
  TEAM = 'team'
}

export enum AssignmentStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

@Entity('user_roles')
@Unique(['userId', 'roleId', 'teamId'])
@Index(['userId', 'status'])
@Index(['roleId'])
@Index(['teamId'])
@Index(['assignedBy'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  teamId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.DIRECT
  })
  assignmentType: AssignmentType;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE
  })
  status: AssignmentStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedBy: string; // User who assigned this role

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional context like approval workflow ID

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === AssignmentStatus.ACTIVE &&
           (!this.expiresAt || this.expiresAt > new Date());
  }

  isExpired(): boolean {
    return this.status === AssignmentStatus.EXPIRED ||
           (this.expiresAt && this.expiresAt <= new Date());
  }

  canAccessResource(resource: string, action: string): boolean {
    if (!this.isActive()) return false;

    return this.role?.permissions?.some(permission =>
      permission.name.includes(`${resource}:${action}`) ||
      permission.name.includes(`${resource}:*`) ||
      permission.name.includes(`*:${action}`) ||
      permission.name === '*'
    ) ?? false;
  }
}