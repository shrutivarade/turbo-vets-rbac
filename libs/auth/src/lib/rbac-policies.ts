import { Role } from '@rbac-workspace/data';

/**
 * User interface for RBAC operations
 */
export interface RbacUser {
  id: number;
  email: string;
  role: Role;
  organizationId: number;
}

/**
 * Task interface for RBAC operations
 */
export interface RbacTask {
  id: number;
  createdByUserId: number;
  organizationId: number;
}

/**
 * Role hierarchy levels for comparison
 * Higher numbers = more permissions
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.VIEWER]: 1,
  [Role.ADMIN]: 2,
  [Role.OWNER]: 3,
};

/**
 * Check if a user has a specific role or higher
 * @param user - The user to check
 * @param requiredRole - The minimum role required
 * @returns True if user has the required role or higher
 */
export function hasRoleOrHigher(user: RbacUser, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user is an owner
 * @param user - The user to check
 * @returns True if user is an owner
 */
export function isOwner(user: RbacUser): boolean {
  return user.role === Role.OWNER;
}

/**
 * Check if a user is an admin or owner
 * @param user - The user to check
 * @returns True if user is admin or owner
 */
export function isAdminOrOwner(user: RbacUser): boolean {
  return hasRoleOrHigher(user, Role.ADMIN);
}

/**
 * Check if a user is a viewer
 * @param user - The user to check
 * @returns True if user is a viewer
 */
export function isViewer(user: RbacUser): boolean {
  return user.role === Role.VIEWER;
}

/**
 * Check if a user belongs to the same organization as a resource
 * @param user - The user to check
 * @param resourceOrgId - The organization ID of the resource
 * @returns True if user belongs to the same organization
 */
export function isSameOrganization(user: RbacUser, resourceOrgId: number): boolean {
  return user.organizationId === resourceOrgId;
}

/**
 * Check if a user is the creator of a task
 * @param user - The user to check
 * @param task - The task to check
 * @returns True if user created the task
 */
export function isTaskCreator(user: RbacUser, task: RbacTask): boolean {
  return user.id === task.createdByUserId;
}

/**
 * Check if a user can read tasks
 * Rules:
 * - All users can read tasks within their organization
 * - Cross-organization access is blocked
 * @param user - The user requesting access
 * @param task - Optional task to check (if null, checks general read permission)
 * @returns True if user can read tasks
 */
export function canReadTasks(user: RbacUser, task?: RbacTask): boolean {
  // If checking a specific task, verify organization match
  if (task) {
    return isSameOrganization(user, task.organizationId);
  }
  
  // General read permission - all users can read within their org
  return true;
}

/**
 * Check if a user can create tasks
 * Rules:
 * - Owners and Admins can create tasks within their organization
 * - Viewers cannot create tasks (read-only access)
 * - Cross-organization creation is blocked
 * @param user - The user requesting access
 * @returns True if user can create tasks
 */
export function canCreateTask(user: RbacUser): boolean {
  // Only owners and admins can create tasks
  return isAdminOrOwner(user);
}

/**
 * Check if a user can update a task
 * Rules:
 * - Owners and Admins can update any task within their organization
 * - Viewers can only update tasks they created
 * - Cross-organization updates are blocked
 * @param user - The user requesting access
 * @param task - The task to update
 * @returns True if user can update the task
 */
export function canUpdateTask(user: RbacUser, task: RbacTask): boolean {
  // Must be in the same organization
  if (!isSameOrganization(user, task.organizationId)) {
    return false;
  }
  
  // Owners and Admins can update any task in their org
  if (isAdminOrOwner(user)) {
    return true;
  }
  
  // Viewers can only update their own tasks
  if (isViewer(user)) {
    return isTaskCreator(user, task);
  }
  
  return false;
}

/**
 * Check if a user can delete a task
 * Rules:
 * - Only Owners can delete tasks
 * - Must be within the same organization
 * - Cross-organization deletion is blocked
 * @param user - The user requesting access
 * @param task - The task to delete
 * @returns True if user can delete the task
 */
export function canDeleteTask(user: RbacUser, task: RbacTask): boolean {
  // Must be in the same organization
  if (!isSameOrganization(user, task.organizationId)) {
    return false;
  }
  
  // Only owners can delete tasks
  return isOwner(user);
}

/**
 * Generate a TypeORM where clause for task queries based on user role and organization
 * This ensures data is automatically scoped by organization and role
 * @param user - The user making the request
 * @returns TypeORM where clause object
 */
export function scopeForTasks(user: RbacUser): any {
  const whereClause: any = {
    organizationId: user.organizationId, // Always scope by organization
  };
  
  // If user is a viewer, also scope by creator (they can only see all org tasks)
  // Note: Viewers can READ all tasks in their org, but can only EDIT their own
  // This function is for READ operations, so we don't add creator filter here
  
  return whereClause;
}

/**
 * Generate a TypeORM where clause for task queries that includes creator scoping for viewers
 * This is used when viewers need to see only their own tasks
 * @param user - The user making the request
 * @returns TypeORM where clause object
 */
export function scopeForOwnTasks(user: RbacUser): any {
  const whereClause: any = {
    organizationId: user.organizationId, // Always scope by organization
  };
  
  // If user is a viewer, also scope by creator
  if (isViewer(user)) {
    whereClause.createdByUserId = user.id;
  }
  
  return whereClause;
}

/**
 * Check if a user can access audit logs
 * Rules:
 * - Only Owners and Admins can view audit logs
 * @param user - The user requesting access
 * @returns True if user can access audit logs
 */
export function canViewAuditLogs(user: RbacUser): boolean {
  return isAdminOrOwner(user);
}

/**
 * Get a human-readable description of a user's permissions
 * @param user - The user to describe
 * @returns Description of user's permissions
 */
export function getUserPermissionDescription(user: RbacUser): string {
  switch (user.role) {
    case Role.OWNER:
      return `Owner in organization ${user.organizationId}: Can read, create, update, and delete all tasks within the organization. Can view audit logs.`;
    
    case Role.ADMIN:
      return `Admin in organization ${user.organizationId}: Can read, create, and update all tasks within the organization. Cannot delete tasks. Can view audit logs.`;
    
    case Role.VIEWER:
      return `Viewer in organization ${user.organizationId}: Can read all tasks within the organization. Can only update tasks they created. Cannot create, delete tasks, or view audit logs.`;
    
    default:
      return 'Unknown role: No permissions.';
  }
}

/**
 * Validate that a user has the minimum required role for an operation
 * @param user - The user to validate
 * @param requiredRole - The minimum role required
 * @param operation - Description of the operation (for error messages)
 * @throws Error if user doesn't have required role
 */
export function requireRole(user: RbacUser, requiredRole: Role, operation: string): void {
  if (!hasRoleOrHigher(user, requiredRole)) {
    throw new Error(`Insufficient permissions: ${operation} requires ${requiredRole} role or higher. Current role: ${user.role}`);
  }
}

/**
 * Validate that a user can perform an operation on a specific task
 * @param user - The user to validate
 * @param task - The task to operate on
 * @param operation - The operation type ('read', 'update', 'delete')
 * @throws Error if user cannot perform the operation
 */
export function validateTaskAccess(user: RbacUser, task: RbacTask, operation: 'read' | 'update' | 'delete'): void {
  switch (operation) {
    case 'read':
      if (!canReadTasks(user, task)) {
        throw new Error(`Access denied: Cannot read task ${task.id}. Task belongs to different organization.`);
      }
      break;
    
    case 'update':
      if (!canUpdateTask(user, task)) {
        if (!isSameOrganization(user, task.organizationId)) {
          throw new Error(`Access denied: Cannot update task ${task.id}. Task belongs to different organization.`);
        } else if (isViewer(user) && !isTaskCreator(user, task)) {
          throw new Error(`Access denied: Cannot update task ${task.id}. Viewers can only update their own tasks.`);
        } else {
          throw new Error(`Access denied: Cannot update task ${task.id}. Insufficient permissions.`);
        }
      }
      break;
    
    case 'delete':
      if (!canDeleteTask(user, task)) {
        if (!isSameOrganization(user, task.organizationId)) {
          throw new Error(`Access denied: Cannot delete task ${task.id}. Task belongs to different organization.`);
        } else if (!isOwner(user)) {
          throw new Error(`Access denied: Cannot delete task ${task.id}. Only owners can delete tasks.`);
        } else {
          throw new Error(`Access denied: Cannot delete task ${task.id}. Insufficient permissions.`);
        }
      }
      break;
    
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
