import { WorkflowType, ApprovalStatus } from '../entities/approval-workflow.entity';

export interface IAccessPolicy {
  id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  conditions: IPolicyCondition[];
  actions: IPolicyAction[];
  isActive: boolean;
  priority: number;
  teamId?: string;
  organizationId?: string;
}

export interface IPolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  caseSensitive?: boolean;
}

export interface IPolicyAction {
  type: 'approve' | 'reject' | 'escalate' | 'notify' | 'assign_role' | 'revoke_role';
  parameters: Record<string, any>;
}

export interface IAccessRequest {
  id: string;
  workflowId: string;
  requesterId: string;
  title: string;
  description?: string;
  requestData: Record<string, any>;
  status: ApprovalStatus;
  currentStep?: IApprovalStep;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalStep {
  stepId: string;
  order: number;
  name: string;
  type: 'single_approver' | 'multiple_approvers' | 'quorum' | 'automatic';
  approvers: string[];
  requiredApprovals: number;
  canDelegate: boolean;
  conditions?: Record<string, any>;
  approvals: IApprovalAction[];
}

export interface IApprovalAction {
  id: string;
  approverId: string;
  action: ApprovalStatus;
  comments?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IAccessDecision {
  approved: boolean;
  reason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  nextStep?: IApprovalStep;
  actions: IApprovalAction[];
}

export interface IPolicyEvaluationContext {
  request: IAccessRequest;
  requester: IUserContext;
  approver?: IUserContext;
  team?: ITeamContext;
  organization?: IOrganizationContext;
  resource?: IResourceContext;
}

export interface IUserContext {
  id: string;
  roles: string[];
  permissions: string[];
  teamId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface ITeamContext {
  id: string;
  name: string;
  organizationId?: string;
  memberCount: number;
  settings: Record<string, any>;
}

export interface IOrganizationContext {
  id: string;
  name: string;
  settings: Record<string, any>;
}

export interface IResourceContext {
  type: string;
  id: string;
  ownerId?: string;
  teamId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}