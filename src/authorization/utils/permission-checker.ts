import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { IPermissionCheck, IPermissionResult, IPermissionContext } from '../interfaces/permission.interface';

@Injectable()
export class PermissionChecker {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async checkPermissions(check: IPermissionCheck): Promise<IPermissionResult> {
    const userRoles = await this.getUserActiveRoles(check.userId, check.resource);

    const grantedPermissions: string[] = [];
    const deniedPermissions: string[] = [];

    for (const permissionName of check.permissions) {
      const hasPermission = await this.checkSinglePermission(
        userRoles,
        permissionName,
        check.resource,
        check.context
      );

      if (hasPermission) {
        grantedPermissions.push(permissionName);
      } else {
        deniedPermissions.push(permissionName);
      }
    }

    return {
      hasPermission: deniedPermissions.length === 0,
      grantedPermissions,
      deniedPermissions,
      userRoles: userRoles.map(ur => ur.role.name),
      context: check.context || {},
    };
  }

  async checkUserHasAnyPermission(
    userId: string,
    permissions: string[],
    context?: IPermissionContext
  ): Promise<boolean> {
    const userRoles = await this.getUserActiveRoles(userId, context?.resource);

    for (const permissionName of permissions) {
      const hasPermission = await this.checkSinglePermission(
        userRoles,
        permissionName,
        context?.resource,
        context
      );

      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  async checkUserHasAllPermissions(
    userId: string,
    permissions: string[],
    context?: IPermissionContext
  ): Promise<boolean> {
    const userRoles = await this.getUserActiveRoles(userId, context?.resource);

    for (const permissionName of permissions) {
      const hasPermission = await this.checkSinglePermission(
        userRoles,
        permissionName,
        context?.resource,
        context
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  private async checkSinglePermission(
    userRoles: UserRole[],
    permissionName: string,
    resource?: string,
    context?: IPermissionContext
  ): Promise<boolean> {
    for (const userRole of userRoles) {
      if (!userRole.isActive()) continue;

      const role = userRole.role;
      if (!role || !role.isActive) continue;

      // Check direct permissions
      const hasDirectPermission = role.permissions?.some(permission =>
        this.matchesPermission(permission, permissionName, resource, context)
      );

      if (hasDirectPermission) {
        return true;
      }

      // Check wildcard permissions
      const hasWildcardPermission = role.permissions?.some(permission =>
        this.matchesWildcardPermission(permission, permissionName, resource)
      );

      if (hasWildcardPermission) {
        return true;
      }
    }

    return false;
  }

  private matchesPermission(
    permission: Permission,
    permissionName: string,
    resource?: string,
    context?: IPermissionContext
  ): boolean {
    // Exact name match
    if (permission.name === permissionName) {
      return this.checkPermissionConditions(permission, context);
    }

    // Resource-specific match (e.g., "users:read" matches permission "users:read")
    if (resource && permission.name === `${resource}:${permissionName.split(':')[1]}`) {
      return this.checkPermissionConditions(permission, context);
    }

    return false;
  }

  private matchesWildcardPermission(
    permission: Permission,
    permissionName: string,
    resource?: string
  ): boolean {
    // Check for wildcard permissions
    if (permission.name === '*') return true;

    // Check resource wildcards
    if (resource && permission.name === `${resource}:*`) return true;

    // Check action wildcards
    const [permResource, permAction] = permission.name.split(':');
    const [reqResource, reqAction] = permissionName.split(':');

    if (permResource === reqResource && permAction === '*') return true;
    if (permResource === '*' && permAction === reqAction) return true;

    return false;
  }

  private checkPermissionConditions(
    permission: Permission,
    context?: IPermissionContext
  ): boolean {
    if (!permission.conditions || !context) return true;

    // Evaluate conditions against context
    for (const [key, condition] of Object.entries(permission.conditions)) {
      const contextValue = this.getContextValue(context, key);
      if (!this.evaluateCondition(contextValue, condition)) {
        return false;
      }
    }

    return true;
  }

  private getContextValue(context: IPermissionContext, key: string): any {
    const keys = key.split('.');
    let value = context as any;

    for (const k of keys) {
      value = value?.[k];
    }

    return value;
  }

  private evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object' && condition.operator) {
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'greater_than':
          return value > condition.value;
        case 'less_than':
          return value < condition.value;
        case 'contains':
          return Array.isArray(value) ? value.includes(condition.value) : String(value).includes(condition.value);
        case 'in':
          return Array.isArray(condition.value) ? condition.value.includes(value) : false;
        default:
          return false;
      }
    }

    return value === condition;
  }

  private async getUserActiveRoles(userId: string, resource?: string): Promise<UserRole[]> {
    const query = this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.status = :status', { status: 'active' })
      .andWhere('role.isActive = :isActive', { isActive: true });

    if (resource) {
      query.andWhere('(ur.teamId IS NULL OR ur.teamId = :resource)', { resource });
    }

    // Order by role priority (higher priority first)
    query.orderBy('role.priority', 'DESC');

    return query.getMany();
  }
}