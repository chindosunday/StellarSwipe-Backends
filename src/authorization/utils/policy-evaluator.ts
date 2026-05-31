import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalWorkflow, ApprovalRequest, ApprovalAction, ApprovalStatus } from '../entities/approval-workflow.entity';
import { IAccessPolicy, IPolicyEvaluationContext, IAccessDecision } from '../interfaces/access-policy.interface';

@Injectable()
export class PolicyEvaluator {
  constructor(
    @InjectRepository(ApprovalWorkflow)
    private workflowRepository: Repository<ApprovalWorkflow>,
    @InjectRepository(ApprovalRequest)
    private requestRepository: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalAction)
    private actionRepository: Repository<ApprovalAction>,
  ) {}

  async evaluateAccessRequest(
    request: ApprovalRequest,
    context: IPolicyEvaluationContext
  ): Promise<IAccessDecision> {
    const workflow = request.workflow;

    if (!workflow || workflow.status !== 'active') {
      return {
        approved: false,
        reason: 'Workflow not found or inactive',
        actions: [],
      };
    }

    // Check if request has expired
    if (request.isExpired()) {
      return {
        approved: false,
        reason: 'Request has expired',
        actions: request.actions || [],
      };
    }

    // Evaluate workflow conditions
    const conditionsMet = this.evaluateWorkflowConditions(workflow, context);
    if (!conditionsMet) {
      return {
        approved: false,
        reason: 'Workflow conditions not met',
        actions: request.actions || [],
      };
    }

    // Evaluate current step
    const currentStep = request.currentStep;
    if (!currentStep) {
      // Initialize first step
      const firstStep = workflow.steps?.[0];
      if (!firstStep) {
        return {
          approved: false,
          reason: 'No approval steps defined',
          actions: [],
        };
      }

      return {
        approved: false,
        reason: 'Approval required',
        nextStep: {
          stepId: firstStep.id,
          order: firstStep.order,
          name: firstStep.name,
          type: firstStep.type,
          approvers: firstStep.approvers,
          requiredApprovals: firstStep.requiredApprovals || 1,
          canDelegate: firstStep.canDelegate || false,
          conditions: firstStep.conditions,
          approvals: [],
        },
        actions: [],
      };
    }

    // Check if current step is approved
    const stepApproved = this.evaluateStepApproval(currentStep, context);
    if (!stepApproved) {
      return {
        approved: false,
        reason: `Step ${currentStep.order} requires more approvals`,
        nextStep: currentStep,
        actions: currentStep.approvals,
      };
    }

    // Check if there are more steps
    const nextStepIndex = currentStep.order;
    const nextStep = workflow.steps?.[nextStepIndex];

    if (nextStep && workflow.requireAllSteps) {
      // Move to next step
      return {
        approved: false,
        reason: 'Moving to next approval step',
        nextStep: {
          stepId: nextStep.id,
          order: nextStep.order,
          name: nextStep.name,
          type: nextStep.type,
          approvers: nextStep.approvers,
          requiredApprovals: nextStep.requiredApprovals || 1,
          canDelegate: nextStep.canDelegate || false,
          conditions: nextStep.conditions,
          approvals: [],
        },
        actions: currentStep.approvals,
      };
    }

    // All steps approved or only current step required
    return {
      approved: true,
      reason: 'All required approvals obtained',
      approvedBy: currentStep.approvals[0]?.approverId,
      approvedAt: new Date(),
      actions: currentStep.approvals,
    };
  }

  async evaluatePolicies(
    policies: IAccessPolicy[],
    context: IPolicyEvaluationContext
  ): Promise<IAccessDecision> {
    // Sort policies by priority (highest first)
    const sortedPolicies = policies.sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      if (!policy.isActive) continue;

      const conditionsMet = this.evaluatePolicyConditions(policy, context);
      if (conditionsMet) {
        return this.executePolicyActions(policy, context);
      }
    }

    // No policy matched, deny access
    return {
      approved: false,
      reason: 'No matching policy found',
      actions: [],
    };
  }

  private evaluateWorkflowConditions(
    workflow: ApprovalWorkflow,
    context: IPolicyEvaluationContext
  ): boolean {
    if (!workflow.conditions) return true;

    return this.evaluateConditions(workflow.conditions, context);
  }

  private evaluatePolicyConditions(
    policy: IAccessPolicy,
    context: IPolicyEvaluationContext
  ): boolean {
    for (const condition of policy.conditions) {
      if (!this.evaluateSingleCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluateSingleCondition(
    condition: any,
    context: IPolicyEvaluationContext
  ): boolean {
    const value = this.getContextValue(context, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return Array.isArray(value)
          ? value.includes(condition.value)
          : String(value).includes(condition.value);
      case 'not_contains':
        return Array.isArray(value)
          ? !value.includes(condition.value)
          : !String(value).includes(condition.value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) ? condition.value.includes(value) : false;
      case 'not_in':
        return Array.isArray(condition.value) ? !condition.value.includes(value) : true;
      default:
        return false;
    }
  }

  private evaluateStepApproval(
    step: any,
    context: IPolicyEvaluationContext
  ): boolean {
    const requiredApprovals = step.requiredApprovals || 1;
    const currentApprovals = step.approvals?.length || 0;

    return currentApprovals >= requiredApprovals;
  }

  private executePolicyActions(
    policy: IAccessPolicy,
    context: IPolicyEvaluationContext
  ): IAccessDecision {
    // For now, return approval if policy conditions are met
    // In a real implementation, you might execute specific actions
    return {
      approved: true,
      reason: `Policy ${policy.name} approved access`,
      actions: [],
    };
  }

  private evaluateConditions(
    conditions: Record<string, any>,
    context: IPolicyEvaluationContext
  ): boolean {
    for (const [key, condition] of Object.entries(conditions)) {
      const value = this.getContextValue(context, key);
      if (!this.evaluateSingleCondition({ field: key, ...condition }, context)) {
        return false;
      }
    }

    return true;
  }

  private getContextValue(context: IPolicyEvaluationContext, path: string): any {
    const keys = path.split('.');
    let value: any = context;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}