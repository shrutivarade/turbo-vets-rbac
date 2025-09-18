import { SetMetadata } from '@nestjs/common';
import { PolicyConfig, PolicyPredicate } from './policy.guard';
import { Role } from '@rbac-workspace/data';

/**
 * Metadata key for policy configuration
 */
export const POLICY_METADATA_KEY = 'policy';

/**
 * Policy Decorator
 * 
 * Applies a policy configuration to a controller method for access control.
 * This decorator works with the PolicyGuard to provide declarative access control.
 * 
 * @param policyConfig - The policy configuration containing predicate and error message
 * 
 * @example
 * ```typescript
 * @Get('admin-only')
 * @UseGuards(PolicyGuard)
 * @Policy(RolePolicies.requireAdminOrOwner())
 * adminOnlyEndpoint() { ... }
 * ```
 */
export const Policy = (policyConfig: PolicyConfig) => SetMetadata(POLICY_METADATA_KEY, policyConfig);

/**
 * Require Role Decorator
 * 
 * Convenience decorator for role-based access control.
 * Creates a policy that only allows users with specific roles.
 * 
 * @param roles - Array of roles that are allowed access
 * @param errorMessage - Custom error message for access denied
 * 
 * @example
 * ```typescript
 * @Get('owner-only')
 * @UseGuards(PolicyGuard)
 * @RequireRole([Role.OWNER])
 * ownerOnlyEndpoint() { ... }
 * 
 * @Get('admin-or-owner')
 * @UseGuards(PolicyGuard)
 * @RequireRole([Role.ADMIN, Role.OWNER])
 * adminOrOwnerEndpoint() { ... }
 * ```
 */
export const RequireRole = (roles: Role[], errorMessage?: string) => {
  const policyConfig: PolicyConfig = {
    predicate: (user) => roles.includes(user.role as Role),
    errorMessage: errorMessage || `Access denied: Required roles: ${roles.join(', ')}`
  };
  return Policy(policyConfig);
};

/**
 * Require Permission Decorator
 * 
 * Convenience decorator for permission-based access control.
 * Creates a policy that checks for specific permissions.
 * 
 * @param permission - The permission to check
 * @param resourceType - The type of resource (optional)
 * @param errorMessage - Custom error message for access denied
 * 
 * @example
 * ```typescript
 * @Get('audit-logs')
 * @UseGuards(PolicyGuard)
 * @RequirePermission('view', 'audit_log')
 * getAuditLogs() { ... }
 * 
 * @Delete('tasks/:id')
 * @UseGuards(PolicyGuard)
 * @RequirePermission('delete', 'task')
 * deleteTask() { ... }
 * ```
 */
export const RequirePermission = (
  permission: string,
  resourceType?: string,
  errorMessage?: string
) => {
  const policyConfig: PolicyConfig = {
    predicate: (user, context, resource) => {
      // Placeholder implementation - replace with actual permission logic
      console.log(`Checking permission: ${permission} on ${resourceType || 'resource'}`);
      return true; // Replace with actual permission checking logic
    },
    errorMessage: errorMessage || `Access denied: Permission '${permission}' required`
  };
  return Policy(policyConfig);
};

/**
 * Custom Policy Decorator
 * 
 * Creates a policy decorator with a custom predicate function.
 * Use this for complex access control logic that doesn't fit the standard patterns.
 * 
 * @param predicate - The policy predicate function
 * @param errorMessage - Custom error message for access denied
 * @param resourceExtractor - Function to extract resource data from context
 * 
 * @example
 * ```typescript
 * @Get('tasks/:id')
 * @UseGuards(PolicyGuard)
 * @CustomPolicy(
 *   (user, context, resource) => {
 *     // Custom logic: user can access if they own the task or are admin
 *     return user.role === 'admin' || resource.createdByUserId === user.id;
 *   },
 *   'Cannot access this task',
 *   (context) => {
 *     const request = context.switchToHttp().getRequest();
 *     return { id: request.params.id };
 *   }
 * )
 * getTask() { ... }
 * ```
 */
export const CustomPolicy = (
  predicate: PolicyPredicate,
  errorMessage?: string,
  resourceExtractor?: (context: any) => any
) => {
  const policyConfig: PolicyConfig = {
    predicate,
    errorMessage,
    resourceExtractor
  };
  return Policy(policyConfig);
};

/**
 * Public Decorator
 * 
 * Explicitly marks an endpoint as public (no authentication required).
 * This is useful for documentation and clarity, even though the global
 * JwtAuthGuard already handles public routes.
 * 
 * @example
 * ```typescript
 * @Get('health')
 * @Public()
 * healthCheck() { ... }
 * ```
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * Admin Only Decorator
 * 
 * Convenience decorator that only allows admin and owner roles.
 * 
 * @param errorMessage - Custom error message
 * 
 * @example
 * ```typescript
 * @Get('admin-dashboard')
 * @UseGuards(PolicyGuard)
 * @AdminOnly()
 * adminDashboard() { ... }
 * ```
 */
export const AdminOnly = (errorMessage?: string) => 
  RequireRole([Role.ADMIN, Role.OWNER], errorMessage || 'Only admins and owners can access this endpoint');

/**
 * Owner Only Decorator
 * 
 * Convenience decorator that only allows owner role.
 * 
 * @param errorMessage - Custom error message
 * 
 * @example
 * ```typescript
 * @Delete('organization')
 * @UseGuards(PolicyGuard)
 * @OwnerOnly()
 * deleteOrganization() { ... }
 * ```
 */
export const OwnerOnly = (errorMessage?: string) => 
  RequireRole([Role.OWNER], errorMessage || 'Only owners can access this endpoint');

/**
 * Viewer Read Only Decorator
 * 
 * Convenience decorator that allows all roles but indicates read-only access.
 * Useful for documentation and API clarity.
 * 
 * @example
 * ```typescript
 * @Get('tasks')
 * @UseGuards(PolicyGuard)
 * @ViewerReadOnly()
 * getTasks() { ... }
 * ```
 */
export const ViewerReadOnly = () => 
  RequireRole([Role.VIEWER, Role.ADMIN, Role.OWNER], 'Access denied: Authentication required');
