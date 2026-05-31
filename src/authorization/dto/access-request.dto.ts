import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsArray } from 'class-validator';
import { ApprovalStatus } from '../entities/approval-workflow.entity';

export class CreateAccessRequestDto {
  @IsUUID()
  workflowId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  requestData: Record<string, any>;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;
}

export class UpdateAccessRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  requestData?: Record<string, any>;
}

export class ApproveRequestDto {
  @IsString()
  @IsOptional()
  comments?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RejectRequestDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkActionDto {
  @IsArray()
  @IsUUID('all', { each: true })
  requestIds: string[];

  @IsEnum(ApprovalStatus)
  action: ApprovalStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class AccessRequestQueryDto {
  @IsUUID()
  @IsOptional()
  workflowId?: string;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @IsUUID()
  @IsOptional()
  requesterId?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}