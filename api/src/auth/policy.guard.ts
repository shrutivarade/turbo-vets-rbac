import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Define RbacUser interface locally
interface RbacUser {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

/**
 * Policy predicate function type
 * @param user - The authenticated user
 * @param context - The execution context (request, response, etc.)
 * @param resource - Optional resource data (for resource-based policies)
 * @returns Promise<boolean> or boolean indicating if access is allowed
 */
export type PolicyPredicate = (
  user: RbacUser,
  context: ExecutionContext,
  resource?: any
) => boolean | Promise<boolean>;

/**
 * Policy configuration interface
 */
export interface PolicyConfig {
  predicate: PolicyPredicate;
  errorMessage?: string;
  resourceExtractor?: (context: ExecutionContext) => any;
}

/**
 * Policy Guard
 * 
 * A generic guard that evaluates RBAC policy predicates to control access to endpoints.
 * This guard works in conjunction with the @Policy() decorator to provide declarative
 * access control based on user roles, permissions, and resource context.
 * 
 * @example
 * ```typescript
 * @Get('admin-only')
 * @UseGuards(PolicyGuard)
 * @Policy(RolePolicies.requireAdminOrOwner())
 * adminOnlyEndpoint() { ... }
 * ```
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current request should be allowed based on the policy predicate
   * @param context - The execution context containing request and user information
   * @returns Promise<boolean> indicating if access should be granted
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the policy configuration from the decorator
    const policyConfig = this.reflector.get<PolicyConfig>('policy', context.getHandler());
    
    if (!policyConfig) {
      // No policy defined, allow access (fallback to other guards)
      return true;
    }

    // Extract user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: RbacUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Extract resource data if resource extractor is provided
      let resource: any = undefined;
      if (policyConfig.resourceExtractor) {
        resource = policyConfig.resourceExtractor(context);
      }

      // Evaluate the policy predicate
      const result = await policyConfig.predicate(user, context, resource);

      if (!result) {
        const errorMessage = policyConfig.errorMessage || 'Access denied: Insufficient permissions';
        throw new ForbiddenException(errorMessage);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      // Log unexpected errors but don't expose internal details
      console.error('Policy evaluation error:', error);
      throw new ForbiddenException('Access denied: Policy evaluation failed');
    }
  }
}

/**
 * Factory function to create policy-specific guards
 * 
 * @param predicate - The policy predicate function
 * @param errorMessage - Custom error message for access denied
 * @param resourceExtractor - Function to extract resource data from context
 * @returns PolicyConfig object for use with @Policy() decorator
 * 
 * @example
 * ```typescript
 * const adminOnlyPolicy = createPolicyGuard(
 *   (user) => user.role === 'owner' || user.role === 'admin',
 *   'Only owners and admins can access this endpoint'
 * );
 * ```
 */
export function createPolicyGuard(
  predicate: PolicyPredicate,
  errorMessage?: string,
  resourceExtractor?: (context: ExecutionContext) => any
): PolicyConfig {
  return {
    predicate,
    errorMessage,
    resourceExtractor
  };
}

/**
 * Simple policy guard for basic role checks
 * 
 * @param allowedRoles - Array of roles that are allowed access
 * @param errorMessage - Custom error message
 * @returns PolicyConfig for role-based access control
 * 
 * @example
 * ```typescript
 * const ownerOnlyPolicy = createRolePolicy(['owner'], 'Only owners can access this endpoint');
 * ```
 */
export function createRolePolicy(
  allowedRoles: string[],
  errorMessage?: string
): PolicyConfig {
  return createPolicyGuard(
    (user) => allowedRoles.includes(user.role),
    errorMessage || `Access denied: Required roles: ${allowedRoles.join(', ')}`
  );
}

/**
 * Policy guard for permission-based access control
 * 
 * @param permission - The permission to check
 * @param resourceType - The type of resource (optional)
 * @param errorMessage - Custom error message
 * @returns PolicyConfig for permission-based access control
 * 
 * @example
 * ```typescript
 * const deleteTaskPolicy = createPermissionPolicy('delete', 'task', 'Cannot delete tasks');
 * ```
 */
export function createPermissionPolicy(
  permission: string,
  resourceType?: string,
  errorMessage?: string
): PolicyConfig {
  return createPolicyGuard(
    (user, context, resource) => {
      // This is a placeholder - in a real implementation, you'd check against
      // a permissions system or use the RBAC policies from the shared library
      console.log(`Checking permission: ${permission} on ${resourceType || 'resource'}`);
      return true; // Placeholder - replace with actual permission logic
    },
    errorMessage || `Access denied: Permission '${permission}' required`
  );
}
