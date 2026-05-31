import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean, IsInt, Min, Max, IsArray, ArrayNotEmpty } from 'class-validator';
import { RoleType, RoleScope } from '../entities/role.entity';

export class CreateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @IsEnum(RoleScope)
  @IsOptional()
  scope?: RoleScope;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @IsEnum(RoleScope)
  @IsOptional()
  scope?: RoleScope;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissionIds?: string[];
}