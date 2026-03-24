import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionLevel } from '../entities/permission.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const resource = this.extractResource(context);
    const action = this.extractAction(context);

    const hasPermission = await this.rbacService.checkUserPermissions(
      user.id,
      requiredPermissions,
      {
        resource,
        action,
        teamId: user.teamId,
        organizationId: user.organizationId,
        context: request.body || {},
      },
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }

  private extractResource(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // Extract resource from URL pattern
    // e.g., /api/users/123 -> users
    // e.g., /api/teams/456/members -> teams
    const segments = url.split('/').filter(segment => segment && segment !== 'api');
    return segments[0] || 'unknown';
  }

  private extractAction(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const method = request.method.toLowerCase();

    // Map HTTP methods to permission actions
    switch (method) {
      case 'get':
        return 'read';
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return method;
    }
  }
}

@Injectable()
export class StrictPermissionsGuard extends PermissionsGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // This guard requires ALL permissions to be present
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const resource = this.extractResource(context);
    const action = this.extractAction(context);

    const hasAllPermissions = await this.rbacService.checkUserHasAllPermissions(
      user.id,
      requiredPermissions,
      {
        resource,
        action,
        teamId: user.teamId,
        organizationId: user.organizationId,
        context: request.body || {},
      },
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. All of the following are required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}