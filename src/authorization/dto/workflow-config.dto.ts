import { IsString, IsOptional, IsEnum, IsUUID, IsArray, IsBoolean, IsInt, Min, Max, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowType, WorkflowStatus, ApprovalStepType } from '../entities/approval-workflow.entity';

export class ApprovalStepDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  name: string;

  @IsEnum(ApprovalStepType)
  type: ApprovalStepType;

  @IsArray()
  @IsUUID('all', { each: true })
  approvers: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredApprovals?: number;

  @IsBoolean()
  @IsOptional()
  canDelegate?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowType)
  type: WorkflowType;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];

  @IsInt()
  @Min(1)
  @Max(168) // Max 1 week
  @IsOptional()
  timeoutHours?: number;

  @IsBoolean()
  @IsOptional()
  requireAllSteps?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowType)
  @IsOptional()
  type?: WorkflowType;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  @IsOptional()
  steps?: ApprovalStepDto[];

  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  timeoutHours?: number;

  @IsBoolean()
  @IsOptional()
  requireAllSteps?: boolean;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class WorkflowConditionDto {
  @IsString()
  field: string;

  @IsString()
  operator: string; // 'equals', 'contains', 'greater_than', etc.

  value: any;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;
}