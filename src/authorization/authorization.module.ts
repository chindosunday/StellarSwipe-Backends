import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';
import { ApprovalRequest } from './entities/approval-workflow.entity';
import { ApprovalAction } from './entities/approval-workflow.entity';
import { PermissionChecker } from './utils/permission-checker';
import { PolicyEvaluator } from './utils/policy-evaluator';
import { PermissionsGuard } from './guards/permissions.guard';
import { WorkflowApprovalGuard } from './guards/workflow-approval.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      UserRole,
      ApprovalWorkflow,
      ApprovalRequest,
      ApprovalAction,
    ]),
  ],
  controllers: [RbacController],
  providers: [
    RbacService,
    PermissionChecker,
    PolicyEvaluator,
    PermissionsGuard,
    WorkflowApprovalGuard,
  ],
  exports: [
    RbacService,
    PermissionChecker,
    PolicyEvaluator,
    PermissionsGuard,
    WorkflowApprovalGuard,
    TypeOrmModule,
  ],
})
export class AuthorizationModule {}