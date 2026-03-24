# RBAC Quick Start Guide

This guide provides a quick way to get started with the Fine-grained Role-Based Access Control (RBAC) system for StellarSwipe.

## Prerequisites

- NestJS application with TypeORM
- PostgreSQL database
- JWT authentication system

## Installation

1. **Import the Module**
```typescript
// app.module.ts
import { AuthorizationModule } from './authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    // ... other modules
  ],
})
export class AppModule {}
```

2. **Run Migrations**
```bash
npm run migration:run
```

## Basic Setup

### 1. Create Permissions
```typescript
// In a seeder or initialization script
await rbacService.createPermission('users:read', 'Read Users', 'user_management', 'read');
await rbacService.createPermission('users:write', 'Write Users', 'user_management', 'write');
await rbacService.createPermission('teams:admin', 'Team Admin', 'team_management', 'admin');
```

### 2. Create Roles
```typescript
const adminRole = await rbacService.createRole({
  name: 'admin',
  description: 'System Administrator',
  type: RoleType.SYSTEM,
  scope: RoleScope.GLOBAL,
  permissionIds: ['users:read', 'users:write', 'teams:admin']
}, 'system');
```

### 3. Assign Roles to Users
```typescript
await rbacService.assignRoleToUser(
  'user-id',
  adminRole.id,
  'admin-user-id'
);
```

## Usage in Controllers

### Basic Permission Check
```typescript
import { RequirePermissions, PermissionsGuard } from './authorization';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  @Get()
  @RequirePermissions('users:read')
  async getUsers() {
    return this.usersService.findAll();
  }

  @Post()
  @RequirePermissions('users:write')
  async createUser(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }
}
```

### Workflow Approval
```typescript
import { RequireWorkflowApproval } from './authorization';

@Post()
@RequirePermissions('users:write')
@RequireWorkflowApproval(WorkflowType.RESOURCE_ACCESS, 'users', 'create')
async createUser(@Body() data: CreateUserDto) {
  return this.usersService.create(data);
}
```

## API Testing

### Check Permissions
```bash
curl -X GET "http://localhost:3000/authorization/permissions/check/user-id?permissions=users:read,users:write&resource=users" \
  -H "Authorization: Bearer <token>"
```

### Create Role
```bash
curl -X POST "http://localhost:3000/authorization/roles" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "manager",
    "description": "Team Manager",
    "permissionIds": ["users:read", "teams:write"]
  }'
```

### Assign Role
```bash
curl -X POST "http://localhost:3000/authorization/users/user-id/roles/role-id" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "team-id"
  }'
```

## Common Permission Patterns

| Resource | Permissions |
|----------|-------------|
| Users | `users:read`, `users:write`, `users:delete` |
| Teams | `teams:read`, `teams:write`, `teams:admin` |
| Trading | `trading:read`, `trading:execute`, `trading:admin` |
| Financial | `financial:read`, `financial:write`, `financial:admin` |
| System | `system:read`, `system:write`, `system:admin` |

## Workflow Examples

### Simple Approval
```typescript
const workflow = await rbacService.createWorkflow({
  name: 'User Creation Approval',
  type: WorkflowType.RESOURCE_ACCESS,
  steps: [{
    order: 1,
    name: 'Manager Approval',
    type: ApprovalStepType.SINGLE_APPROVER,
    approvers: ['manager-id'],
    requiredApprovals: 1
  }],
  timeoutHours: 24
}, 'admin-id');
```

### Multi-step Approval
```typescript
const workflow = await rbacService.createWorkflow({
  name: 'Financial Operation Approval',
  type: WorkflowType.RESOURCE_ACCESS,
  steps: [
    {
      order: 1,
      name: 'Supervisor Approval',
      type: ApprovalStepType.SINGLE_APPROVER,
      approvers: ['supervisor-id'],
      requiredApprovals: 1
    },
    {
      order: 2,
      name: 'Compliance Approval',
      type: ApprovalStepType.MULTIPLE_APPROVERS,
      approvers: ['compliance-1', 'compliance-2'],
      requiredApprovals: 1
    }
  ],
  timeoutHours: 48,
  requireAllSteps: true
}, 'admin-id');
```

## Health Check

```bash
curl http://localhost:3000/authorization/health
```

## Troubleshooting

### Permission Denied
1. Check if user has the required role
2. Verify role is active and not expired
3. Check permission conditions

### Workflow Not Working
1. Verify workflow is active
2. Check workflow conditions
3. Ensure user is in approvers list

### Database Issues
1. Run migrations: `npm run migration:run`
2. Check database connection
3. Verify table creation

## Next Steps

1. **Customize Permissions**: Add domain-specific permissions
2. **Create Workflows**: Set up approval processes for sensitive operations
3. **Audit Logging**: Implement comprehensive audit trails
4. **Testing**: Add integration tests for your use cases
5. **Documentation**: Document your permission model

## Support

For issues or questions:
1. Check the comprehensive README
2. Review test cases
3. Check database schema
4. Verify API responses