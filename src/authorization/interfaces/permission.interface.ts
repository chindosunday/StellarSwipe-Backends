import { PermissionLevel, PermissionCategory } from '../entities/permission.entity';

export interface IPermission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: PermissionCategory;
  level: PermissionLevel;
  resource?: string;
  isActive: boolean;
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermissionCheck {
  userId: string;
  permissions: string[];
  resource?: string;
  context?: Record<string, any>;
}

export interface IPermissionResult {
  hasPermission: boolean;
  grantedPermissions: string[];
  deniedPermissions: string[];
  userRoles: string[];
  context: Record<string, any>;
}

export interface IPermissionContext {
  userId: string;
  teamId?: string;
  organizationId?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface IPermissionRule {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
  roles?: string[];
  users?: string[];
}

export interface IPermissionPolicy {
  id: string;
  name: string;
  description?: string;
  rules: IPermissionRule[];
  isActive: boolean;
  priority: number;
}