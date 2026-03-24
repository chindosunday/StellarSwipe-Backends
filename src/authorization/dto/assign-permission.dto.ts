import { IsUUID, IsArray, ArrayNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PermissionLevel } from '../entities/permission.entity';

export class AssignPermissionDto {
  @IsUUID()
  roleId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}

export class RevokePermissionDto {
  @IsUUID()
  roleId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}

export class CreatePermissionDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsArray()
  @ArrayNotEmpty()
  names: string[];

  @IsEnum(PermissionLevel)
  @IsOptional()
  level?: PermissionLevel;

  @IsOptional()
  resource?: string;

  @IsOptional()
  conditions?: Record<string, any>;
}

export class BulkAssignPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  assignments: AssignPermissionDto[];
}

export class CheckPermissionDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  permissions: string[];

  @IsOptional()
  resource?: string;

  @IsOptional()
  context?: Record<string, any>;
}