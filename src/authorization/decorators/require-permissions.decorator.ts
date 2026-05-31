import { SetMetadata } from '@nestjs/common';
import { WorkflowType } from '../entities/approval-workflow.entity';

export const PERMISSIONS_KEY = 'permissions';
export const WORKFLOW_KEY = 'workflow';

export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAllPermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireWorkflowApproval = (type: WorkflowType, resource: string, action: string) =>
  SetMetadata(WORKFLOW_KEY, { type, resource, action });

export const RequireConditionalWorkflow = (
  type: WorkflowType,
  conditions: Record<string, any>,
  resource: string,
  action: string
) =>
  SetMetadata(WORKFLOW_KEY, { type, conditions, resource, action });

// Common permission combinations
export const RequireReadPermission = (resource: string) =>
  RequirePermissions(`${resource}:read`);

export const RequireWritePermission = (resource: string) =>
  RequirePermissions(`${resource}:write`);

export const RequireDeletePermission = (resource: string) =>
  RequirePermissions(`${resource}:delete`);

export const RequireAdminPermission = (resource: string) =>
  RequirePermissions(`${resource}:admin`);

// Role-based permissions
export const RequireRole = (roleName: string) =>
  RequirePermissions(`role:${roleName}`);

export const RequireAnyRole = (...roles: string[]) =>
  RequirePermissions(...roles.map(role => `role:${role}`));

// Team permissions
export const RequireTeamAdmin = () =>
  RequirePermissions('team:admin');

export const RequireTeamMember = () =>
  RequirePermissions('team:member');

// Organization permissions
export const RequireOrgAdmin = () =>
  RequirePermissions('organization:admin');

export const RequireOrgMember = () =>
  RequirePermissions('organization:member');

// Workflow approvals for sensitive operations
export const RequireRoleAssignmentApproval = (resource: string) =>
  RequireWorkflowApproval(WorkflowType.ROLE_ASSIGNMENT, resource, 'assign');

export const RequirePermissionGrantApproval = (resource: string) =>
  RequireWorkflowApproval(WorkflowType.PERMISSION_GRANT, resource, 'grant');

export const RequireResourceAccessApproval = (resource: string, action: string) =>
  RequireWorkflowApproval(WorkflowType.RESOURCE_ACCESS, resource, action);

// Conditional workflow based on conditions
export const RequireConditionalApproval = (
  type: WorkflowType,
  conditions: Record<string, any>,
  resource: string,
  action: string
) =>
  RequireConditionalWorkflow(type, conditions, resource, action);