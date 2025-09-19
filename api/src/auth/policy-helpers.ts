import { ExecutionContext } from '@nestjs/common';
import { PolicyConfig, createPolicyGuard } from './policy.guard';
import { Role } from '@rbac-workspace/data';

// Simplified RBAC functions for policy helpers
// In a real implementation, these would come from the shared library

interface RbacUser {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

interface RbacTask {
  id: number;
  createdByUserId: number;
  organizationId: number;
}

// Helper function for organization checking
function isSameOrganization(user: RbacUser, organizationId: number): boolean {
  return user.organizationId === organizationId;
}

// Simplified RBAC policy functions
function isOwner(user: RbacUser): boolean {
  return user.role === 'owner';
}

function isAdminOrOwner(user: RbacUser): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

function isViewer(user: RbacUser): boolean {
  return user.role === 'viewer';
}

function canReadTasks(user: RbacUser): boolean {
  // All authenticated users can read tasks within their organization
  return true;
}

function canCreateTask(user: RbacUser): boolean {
  // Only owners and admins can create tasks
  return isAdminOrOwner(user);
}

function canUpdateTask(user: RbacUser, task?: RbacTask): boolean {
  if (!task) {
    return canCreateTask(user); // Same as create permission
  }
  
  // Must be in the same organization
  if (user.organizationId !== task.organizationId) {
    return false;
  }
  
  // Owners and Admins can update any task in their org
  if (isAdminOrOwner(user)) {
    return true;
  }
  
  // Viewers can only update their own tasks
  if (isViewer(user)) {
    return user.id === task.createdByUserId;
  }
  
  return false;
}

function canDeleteTask(user: RbacUser, task?: RbacTask): boolean {
  if (!task) {
    return isOwner(user);
  }
  
  // Must be in the same organization
  if (user.organizationId !== task.organizationId) {
    return false;
  }
  
  // Only owners can delete tasks
  return isOwner(user);
}

function canViewAuditLogs(user: RbacUser): boolean {
  return isAdminOrOwner(user);
}

/**
 * Get the scope for tasks based on user role and organization
 * @param user The authenticated user
 * @returns Object with where clause for task queries
 */
function scopeForTasks(user: RbacUser): { organizationId: number; createdByUserId?: number } {
  const scope: { organizationId: number; createdByUserId?: number } = {
    organizationId: user.organizationId
  };
  
  // Viewers can only see their own tasks
  if (user.role === 'viewer') {
    scope.createdByUserId = user.id;
  }
  
  return scope;
}

/**
 * Check if user is the creator of a task
 * @param user The authenticated user
 * @param task The task to check
 * @returns Boolean indicating if user created the task
 */
function isTaskCreator(user: RbacUser, task: RbacTask): boolean {
  return user.id === task.createdByUserId;
}

/**
 * Role-based Policy Helpers
 * 
 * Pre-configured policy functions for common role-based access patterns.
 * These helpers integrate with the RBAC policies from the shared library.
 */
export class RolePolicies {
  /**
   * Policy that requires owner role
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for owner-only access
   */
  static requireOwner(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => isOwner(user),
      errorMessage || 'Access denied: Owner role required'
    );
  }

  /**
   * Policy that requires admin or owner role
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for admin/owner access
   */
  static requireAdminOrOwner(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => isAdminOrOwner(user),
      errorMessage || 'Access denied: Admin or Owner role required'
    );
  }

  /**
   * Policy that requires viewer, admin, or owner role (all authenticated users)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for any authenticated user
   */
  static requireAuthenticated(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => true, // Any authenticated user
      errorMessage || 'Access denied: Authentication required'
    );
  }

  /**
   * Policy that requires specific roles
   * 
   * @param roles - Array of allowed roles
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for specific role access
   */
  static requireRoles(roles: Role[], errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => roles.includes(user.role as Role),
      errorMessage || `Access denied: Required roles: ${roles.join(', ')}`
    );
  }
}

/**
 * Task-specific Policy Helpers
 * 
 * Pre-configured policy functions for task-related access patterns.
 * These helpers use the RBAC policies from the shared library.
 */
export class TaskPolicies {
  /**
   * Policy that allows reading tasks (all roles within their organization)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for task reading
   */
  static canReadTasks(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => {
        try {
          return canReadTasks(user);
        } catch (error) {
          console.error('Error in canReadTasks policy:', error);
          return false;
        }
      },
      errorMessage || 'Access denied: Cannot read tasks'
    );
  }

  /**
   * Policy that allows creating tasks (admin and owner only)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for task creation
   */
  static canCreateTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => canCreateTask(user),
      errorMessage || 'Access denied: Cannot create tasks'
    );
  }

  /**
   * Policy that allows updating tasks (with resource context)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for task updating
   */
  static canUpdateTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          // If no specific task resource, allow based on general permission
          return canCreateTask(user); // Same as create permission
        }
        return canUpdateTask(user, resource);
      },
      errorMessage || 'Access denied: Cannot update this task',
      (context) => {
        // Extract task ID from route parameters
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }

  /**
   * Policy that allows deleting tasks (owner only)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for task deletion
   */
  static canDeleteTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          // If no specific task resource, allow based on general permission
          return isOwner(user);
        }
        return canDeleteTask(user, resource);
      },
      errorMessage || 'Access denied: Cannot delete tasks',
      (context) => {
        // Extract task ID from route parameters
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }

  /**
   * Policy that allows updating own tasks only (for viewers)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for updating own tasks
   */
  static canUpdateOwnTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          return false; // Need specific task context
        }
        
        // Check if user can update this specific task
        return canUpdateTask(user, resource);
      },
      errorMessage || 'Access denied: Can only update your own tasks',
      (context) => {
        // Extract task ID from route parameters
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }
}

/**
 * Audit Log Policy Helpers
 * 
 * Pre-configured policy functions for audit log access patterns.
 */
export class AuditPolicies {
  /**
   * Policy that allows viewing audit logs (admin and owner only)
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for audit log viewing
   */
  static canViewAuditLogs(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => canViewAuditLogs(user),
      errorMessage || 'Access denied: Cannot view audit logs'
    );
  }
}

/**
 * Organization Policy Helpers
 * 
 * Pre-configured policy functions for organization-level access patterns.
 */
export class OrganizationPolicies {
  /**
   * Policy that ensures user belongs to the same organization as the resource
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for organization scoping
   */
  static sameOrganization(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource || !resource.organizationId) {
          return true; // No organization context, allow
        }
        return isSameOrganization(user, resource.organizationId);
      },
      errorMessage || 'Access denied: Resource belongs to different organization'
    );
  }

  /**
   * Policy that allows access to organization resources
   * 
   * @param errorMessage - Custom error message
   * @returns PolicyConfig for organization access
   */
  static canAccessOrganization(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => true, // Any authenticated user can access their organization
      errorMessage || 'Access denied: Cannot access organization resources'
    );
  }
}

/**
 * Resource Extraction Helpers
 * 
 * Utility functions for extracting resource data from execution context.
 */
export class ResourceExtractors {
  /**
   * Extract task ID from route parameters
   * 
   * @param context - Execution context
   * @returns Task ID or null
   */
  static extractTaskId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const taskId = request.params.id;
    return taskId ? parseInt(taskId) : null;
  }

  /**
   * Extract organization ID from route parameters
   * 
   * @param context - Execution context
   * @returns Organization ID or null
   */
  static extractOrganizationId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const orgId = request.params.organizationId;
    return orgId ? parseInt(orgId) : null;
  }

  /**
   * Extract user ID from route parameters
   * 
   * @param context - Execution context
   * @returns User ID or null
   */
  static extractUserId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const userId = request.params.userId;
    return userId ? parseInt(userId) : null;
  }
}

// Export the RBAC functions
export {
  canReadTasks,
  canCreateTask,
  canUpdateTask,
  canDeleteTask,
  scopeForTasks,
  isSameOrganization,
  isTaskCreator
};
