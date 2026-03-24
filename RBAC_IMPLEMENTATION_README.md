# Fine-grained Role-Based Access Control (RBAC) System

This document provides comprehensive documentation for the Fine-grained Role-Based Access Control (RBAC) system implemented for StellarSwipe, featuring custom roles, permissions, and approval workflows.

## Overview

The RBAC system provides:
- **Custom Roles**: Flexible role definitions with inheritance and priority
- **Granular Permissions**: Resource-based permissions with conditions
- **Approval Workflows**: Multi-step approval processes for sensitive operations
- **Team-based Access**: Organization and team-scoped permissions
- **Audit Trail**: Complete tracking of role assignments and approvals

## Architecture

### Core Components

```
src/authorization/
├── entities/                 # Database entities
│   ├── role.entity.ts       # Role definitions
│   ├── permission.entity.ts # Permission definitions
│   ├── user-role.entity.ts  # User-role assignments
│   └── approval-workflow.entity.ts # Workflow definitions
├── dto/                     # Data transfer objects
├── interfaces/              # TypeScript interfaces
├── guards/                  # Route guards
├── decorators/              # Permission decorators
├── utils/                   # Utility services
├── rbac.service.ts         # Main business logic
├── rbac.controller.ts      # REST API endpoints
└── authorization.module.ts # Module definition
```

## Database Schema

### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  type ENUM('system', 'custom', 'team') DEFAULT 'custom',
  scope ENUM('global', 'team', 'organization') DEFAULT 'team',
  teamId UUID,
  organizationId UUID,
  isActive BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Permissions Table
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('user_management', 'team_management', 'content_management', 'financial', 'system', 'trading', 'analytics', 'compliance') DEFAULT 'system',
  level ENUM('read', 'write', 'delete', 'admin') DEFAULT 'read',
  resource VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  conditions JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### User Roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL,
  roleId UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  teamId UUID,
  organizationId UUID,
  assignmentType ENUM('direct', 'inherited', 'team') DEFAULT 'direct',
  status ENUM('active', 'pending', 'expired', 'revoked') DEFAULT 'active',
  assignedBy UUID,
  expiresAt TIMESTAMP,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId, roleId, teamId)
);
```

## API Endpoints

### Role Management
```http
POST   /authorization/roles              # Create role
PUT    /authorization/roles/:id          # Update role
DELETE /authorization/roles/:id          # Delete role
GET    /authorization/roles/:id          # Get role
GET    /authorization/roles              # List roles
```

### Permission Management
```http
POST   /authorization/permissions/assign # Assign permissions to role
GET    /authorization/permissions        # List permissions
```

### User Role Assignment
```http
POST   /authorization/users/:userId/roles/:roleId  # Assign role to user
DELETE /authorization/users/:userId/roles/:roleId  # Revoke role from user
GET    /authorization/users/:userId/roles          # Get user roles
```

### Permission Checking
```http
POST   /authorization/permissions/check            # Check permissions
GET    /authorization/permissions/check/:userId   # Check user permissions
```

### Workflow Management
```http
POST   /authorization/workflows          # Create workflow
PUT    /authorization/workflows/:id      # Update workflow
GET    /authorization/workflows          # List workflows
```

### Approval Requests
```http
POST   /authorization/requests           # Create request
PUT    /authorization/requests/:id       # Update request
POST   /authorization/requests/:id/approve # Approve request
POST   /authorization/requests/:id/reject  # Reject request
GET    /authorization/requests           # List requests
GET    /authorization/requests/:id       # Get request
```

## Usage Examples

### 1. Creating a Role
```typescript
const role = await rbacService.createRole({
  name: 'team-admin',
  description: 'Team administrator with full team management permissions',
  type: RoleType.CUSTOM,
  scope: RoleScope.TEAM,
  teamId: 'team-uuid',
  permissionIds: ['team:read', 'team:write', 'team:delete', 'user:manage']
}, 'admin-user-id');
```

### 2. Assigning Permissions
```typescript
await rbacService.assignPermissionsToRole({
  roleId: 'role-uuid',
  permissionIds: ['users:read', 'users:write']
});
```

### 3. Checking Permissions
```typescript
const hasPermission = await rbacService.checkUserPermissions(
  'user-id',
  ['users:read', 'users:write'],
  {
    resource: 'users',
    action: 'read',
    teamId: 'team-uuid'
  }
);
```

### 4. Using Guards and Decorators
```typescript
@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  @Get()
  @RequirePermissions('users:read')
  async getUsers() {
    // Only users with 'users:read' permission can access
  }

  @Post()
  @RequirePermissions('users:write')
  @RequireWorkflowApproval(WorkflowType.RESOURCE_ACCESS, 'users', 'create')
  async createUser(@Body() data: CreateUserDto) {
    // Requires both permission and workflow approval
  }

  @Delete(':id')
  @RequireAllPermissions('users:delete', 'admin:full')
  async deleteUser(@Param('id') id: string) {
    // Requires ALL specified permissions
  }
}
```

### 5. Creating Approval Workflows
```typescript
const workflow = await rbacService.createWorkflow({
  name: 'User Creation Approval',
  type: WorkflowType.RESOURCE_ACCESS,
  teamId: 'team-uuid',
  steps: [
    {
      order: 1,
      name: 'Manager Approval',
      type: ApprovalStepType.SINGLE_APPROVER,
      approvers: ['manager-user-id'],
      requiredApprovals: 1,
      canDelegate: true
    },
    {
      order: 2,
      name: 'HR Approval',
      type: ApprovalStepType.MULTIPLE_APPROVERS,
      approvers: ['hr-user-id-1', 'hr-user-id-2'],
      requiredApprovals: 1,
      canDelegate: false
    }
  ],
  timeoutHours: 48,
  requireAllSteps: true
}, 'admin-user-id');
```

## Permission Patterns

### Standard Permissions
- `resource:action` - Basic resource actions
- `resource:*` - All actions on a resource
- `*:action` - Specific action on all resources
- `*:*` - Full access to everything

### Examples
```typescript
// Read access to users
'users:read'

// Write access to teams
'teams:write'

// Delete access to financial data
'financial:delete'

// Admin access to trading
'trading:admin'

// Full system access
'*:*'
```

## Workflow Types

### Available Workflow Types
- `ROLE_ASSIGNMENT` - For role assignment approvals
- `PERMISSION_GRANT` - For permission granting approvals
- `RESOURCE_ACCESS` - For resource access approvals
- `TEAM_MEMBERSHIP` - For team membership changes

### Approval Step Types
- `SINGLE_APPROVER` - One approver required
- `MULTIPLE_APPROVERS` - Multiple approvers, any can approve
- `QUORUM` - Requires majority or specific number
- `AUTOMATIC` - Automatic approval

## Security Best Practices

### 1. Principle of Least Privilege
Always assign minimum required permissions for user roles.

### 2. Regular Audits
Regularly review and audit role assignments and permissions.

### 3. Approval Workflows
Use approval workflows for sensitive operations like:
- Role assignments
- Permission grants
- Financial operations
- System configuration changes

### 4. Time-based Access
Use expiration dates for temporary access grants.

### 5. Context-aware Permissions
Implement conditions for fine-grained control:
```typescript
{
  conditions: {
    'teamId': 'specific-team-id',
    'department': 'finance'
  }
}
```

## Integration with Existing Systems

### Module Import
```typescript
import { AuthorizationModule } from './authorization/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Service Injection
```typescript
import { RbacService } from './authorization/rbac.service';

@Injectable()
export class SomeService {
  constructor(private rbacService: RbacService) {}

  async someOperation(userId: string) {
    const hasPermission = await this.rbacService.checkUserPermissions(
      userId,
      ['some:permission']
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Proceed with operation
  }
}
```

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern=rbac.service.spec.ts
```

## Migration

Run database migrations:
```bash
npm run migration:run
```

## Health Check

Check system health:
```http
GET /authorization/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "RBAC Service"
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check if user has required permissions and roles are active
2. **Workflow Not Triggered**: Verify workflow conditions and status
3. **Role Assignment Failed**: Check role and user existence, team/organization scope

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=rbac:*
```

## Future Enhancements

- **Attribute-based Access Control (ABAC)**: More granular conditions
- **Risk-based Authentication**: Dynamic permission evaluation
- **Audit Reporting**: Advanced reporting and analytics
- **Integration with External IAM**: LDAP, SAML, OAuth providers
- **Machine Learning**: Anomaly detection for access patterns