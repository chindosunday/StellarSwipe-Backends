import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { WORKFLOW_KEY } from '../decorators/require-permissions.decorator';
import { WorkflowType } from '../entities/approval-workflow.entity';

@Injectable()
export class WorkflowApprovalGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredWorkflow = this.reflector.getAllAndOverride<{
      type: WorkflowType;
      resource: string;
      action: string;
    }>(WORKFLOW_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredWorkflow) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if the action requires workflow approval
    const needsApproval = await this.rbacService.checkRequiresWorkflowApproval(
      user.id,
      requiredWorkflow.type,
      {
        resource: requiredWorkflow.resource,
        action: requiredWorkflow.action,
        teamId: user.teamId,
        organizationId: user.organizationId,
        context: request.body || {},
      },
    );

    if (needsApproval) {
      // Create or check existing approval request
      const approvalRequest = await this.rbacService.createOrGetApprovalRequest(
        user.id,
        requiredWorkflow.type,
        {
          title: `${requiredWorkflow.action} ${requiredWorkflow.resource}`,
          description: `Request to ${requiredWorkflow.action} ${requiredWorkflow.resource}`,
          requestData: {
            resource: requiredWorkflow.resource,
            action: requiredWorkflow.action,
            payload: request.body,
            method: request.method,
            url: request.url,
          },
          teamId: user.teamId,
          organizationId: user.organizationId,
        },
      );

      if (approvalRequest.status === 'pending') {
        throw new ForbiddenException(
          `This action requires approval. Request ID: ${approvalRequest.id}`
        );
      }

      if (approvalRequest.status === 'rejected') {
        throw new ForbiddenException(
          `Approval request was rejected: ${approvalRequest.rejectionReason || 'No reason provided'}`
        );
      }

      if (approvalRequest.status === 'expired') {
        throw new BadRequestException('Approval request has expired');
      }

      // If approved, attach the approval info to the request for audit
      request.approvalRequest = approvalRequest;
    }

    return true;
  }
}

@Injectable()
export class ConditionalWorkflowGuard extends WorkflowApprovalGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredWorkflow = this.reflector.getAllAndOverride<{
      type: WorkflowType;
      conditions: Record<string, any>;
      resource: string;
      action: string;
    }>(WORKFLOW_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredWorkflow) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Evaluate conditions to determine if workflow is required
    const conditionsMet = this.evaluateConditions(requiredWorkflow.conditions, {
      user,
      request: request.body || {},
      resource: requiredWorkflow.resource,
      action: requiredWorkflow.action,
    });

    if (!conditionsMet) {
      // Conditions not met, allow direct access
      return true;
    }

    // Conditions met, proceed with workflow check
    return super.canActivate(context);
  }

  private evaluateConditions(conditions: Record<string, any>, context: any): boolean {
    if (!conditions) return false;

    for (const [key, condition] of Object.entries(conditions)) {
      const value = this.getNestedValue(context, key);
      if (!this.checkCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private checkCondition(value: any, condition: any): boolean {
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
          return Array.isArray(value) ? value.includes(condition.value) : false;
        case 'in':
          return Array.isArray(condition.value) ? condition.value.includes(value) : false;
        default:
          return false;
      }
    }

    return value === condition;
  }
}