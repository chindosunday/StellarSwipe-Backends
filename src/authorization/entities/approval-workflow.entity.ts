import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum WorkflowType {
  ROLE_ASSIGNMENT = 'role_assignment',
  PERMISSION_GRANT = 'permission_grant',
  RESOURCE_ACCESS = 'resource_access',
  TEAM_MEMBERSHIP = 'team_membership'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum ApprovalStepType {
  SINGLE_APPROVER = 'single_approver',
  MULTIPLE_APPROVERS = 'multiple_approvers',
  QUORUM = 'quorum',
  AUTOMATIC = 'automatic'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

@Entity('approval_workflows')
@Index(['type', 'status'])
@Index(['teamId'])
@Index(['organizationId'])
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowType,
    default: WorkflowType.ROLE_ASSIGNMENT
  })
  type: WorkflowType;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT
  })
  status: WorkflowStatus;

  @Column({ type: 'uuid', nullable: true })
  teamId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb' })
  steps: ApprovalStep[];

  @Column({ type: 'int', default: 24 })
  timeoutHours: number; // Hours before request expires

  @Column({ type: 'boolean', default: false })
  requireAllSteps: boolean; // True if all steps must be completed

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>; // Conditions that trigger this workflow

  @Column({ type: 'uuid' })
  createdBy: string;

  @OneToMany(() => ApprovalRequest, request => request.workflow)
  requests: ApprovalRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('approval_steps')
export class ApprovalStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ApprovalStepType,
    default: ApprovalStepType.SINGLE_APPROVER
  })
  type: ApprovalStepType;

  @Column({ type: 'jsonb' })
  approvers: string[]; // User IDs or role IDs

  @Column({ type: 'int', nullable: true })
  requiredApprovals: number; // For quorum type

  @Column({ type: 'boolean', default: false })
  canDelegate: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>; // Step-specific conditions
}

@Entity('approval_requests')
@Index(['workflowId', 'status'])
@Index(['requesterId'])
@Index(['status', 'createdAt'])
export class ApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  requestData: Record<string, any>; // The actual request payload

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING
  })
  status: ApprovalStatus;

  @Column({ type: 'jsonb', nullable: true })
  currentStep: {
    stepId: string;
    order: number;
    approvals: ApprovalAction[];
    requiredApprovals: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @ManyToOne(() => ApprovalWorkflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: ApprovalWorkflow;

  @OneToMany(() => ApprovalAction, action => action.request)
  actions: ApprovalAction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isPending(): boolean {
    return this.status === ApprovalStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === ApprovalStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === ApprovalStatus.REJECTED;
  }

  isExpired(): boolean {
    return this.expiresAt && this.expiresAt <= new Date();
  }

  getCurrentStepApprovals(): number {
    return this.currentStep?.approvals?.length ?? 0;
  }

  needsMoreApprovals(): boolean {
    if (!this.currentStep) return false;
    return this.getCurrentStepApprovals() < this.currentStep.requiredApprovals;
  }
}

@Entity('approval_actions')
@Index(['requestId', 'approverId'])
export class ApprovalAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'uuid' })
  approverId: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.APPROVED
  })
  action: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => ApprovalRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: ApprovalRequest;

  @CreateDateColumn()
  createdAt: Date;
}