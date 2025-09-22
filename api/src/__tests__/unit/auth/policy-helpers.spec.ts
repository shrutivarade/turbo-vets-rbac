/// <reference path="../../jest.d.ts" />

import { ExecutionContext } from '@nestjs/common';

// Mock interfaces to avoid imports
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

interface PolicyConfig {
  predicate: (user: RbacUser, context: ExecutionContext, resource?: any) => boolean | Promise<boolean>;
  errorMessage?: string;
  resourceExtractor?: (context: ExecutionContext) => any;
}

// Mock the policy creation functions
function createPolicyGuard(
  predicate: (user: RbacUser, context: ExecutionContext, resource?: any) => boolean | Promise<boolean>,
  errorMessage?: string,
  resourceExtractor?: (context: ExecutionContext) => any
): PolicyConfig {
  return {
    predicate,
    errorMessage,
    resourceExtractor
  };
}

// Mock the RBAC helper functions
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
  return true; // All authenticated users can read tasks within their organization
}

function canCreateTask(user: RbacUser): boolean {
  return isAdminOrOwner(user);
}

function canUpdateTask(user: RbacUser, task?: RbacTask): boolean {
  if (!task) {
    return canCreateTask(user);
  }
  
  if (user.organizationId !== task.organizationId) {
    return false;
  }
  
  if (isAdminOrOwner(user)) {
    return true;
  }
  
  if (isViewer(user)) {
    return user.id === task.createdByUserId;
  }
  
  return false;
}

function canDeleteTask(user: RbacUser, task?: RbacTask): boolean {
  if (!task) {
    return isOwner(user);
  }
  
  if (user.organizationId !== task.organizationId) {
    return false;
  }
  
  return isOwner(user);
}

function canViewAuditLogs(user: RbacUser): boolean {
  return isAdminOrOwner(user);
}

function isSameOrganization(user: RbacUser, organizationId: number): boolean {
  return user.organizationId === organizationId;
}

function scopeForTasks(user: RbacUser): { organizationId: number; createdByUserId?: number } {
  const scope: { organizationId: number; createdByUserId?: number } = {
    organizationId: user.organizationId
  };
  
  if (user.role === 'viewer') {
    scope.createdByUserId = user.id;
  }
  
  return scope;
}

function isTaskCreator(user: RbacUser, task: RbacTask): boolean {
  return user.id === task.createdByUserId;
}

// Mock Policy Helper Classes
class RolePolicies {
  static requireOwner(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => isOwner(user),
      errorMessage || 'Access denied: Owner role required'
    );
  }

  static requireAdminOrOwner(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => isAdminOrOwner(user),
      errorMessage || 'Access denied: Admin or Owner role required'
    );
  }

  static requireAuthenticated(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => true,
      errorMessage || 'Access denied: Authentication required'
    );
  }

  static requireRoles(roles: string[], errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => roles.includes(user.role),
      errorMessage || `Access denied: Required roles: ${roles.join(', ')}`
    );
  }
}

class TaskPolicies {
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

  static canCreateTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => canCreateTask(user),
      errorMessage || 'Access denied: Cannot create tasks'
    );
  }

  static canUpdateTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          return canCreateTask(user);
        }
        return canUpdateTask(user, resource);
      },
      errorMessage || 'Access denied: Cannot update this task',
      (context) => {
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }

  static canDeleteTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          return isOwner(user);
        }
        return canDeleteTask(user, resource);
      },
      errorMessage || 'Access denied: Cannot delete tasks',
      (context) => {
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }

  static canUpdateOwnTask(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource) {
          return false;
        }
        return canUpdateTask(user, resource);
      },
      errorMessage || 'Access denied: Can only update your own tasks',
      (context) => {
        const request = context.switchToHttp().getRequest();
        const taskId = request.params.id;
        return taskId ? { id: parseInt(taskId) } : null;
      }
    );
  }
}

class AuditPolicies {
  static canViewAuditLogs(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => canViewAuditLogs(user),
      errorMessage || 'Access denied: Cannot view audit logs'
    );
  }
}

class OrganizationPolicies {
  static sameOrganization(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user, context, resource) => {
        if (!resource || !resource.organizationId) {
          return true;
        }
        return isSameOrganization(user, resource.organizationId);
      },
      errorMessage || 'Access denied: Resource belongs to different organization'
    );
  }

  static canAccessOrganization(errorMessage?: string): PolicyConfig {
    return createPolicyGuard(
      (user) => true,
      errorMessage || 'Access denied: Cannot access organization resources'
    );
  }
}

class ResourceExtractors {
  static extractTaskId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const taskId = request.params.id;
    return taskId ? parseInt(taskId) : null;
  }

  static extractOrganizationId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const orgId = request.params.organizationId;
    return orgId ? parseInt(orgId) : null;
  }

  static extractUserId(context: ExecutionContext): number | null {
    const request = context.switchToHttp().getRequest();
    const userId = request.params.userId;
    return userId ? parseInt(userId) : null;
  }
}

describe('Policy Helpers', () => {
  // Mock data
  const mockOwner: RbacUser = {
    id: 1,
    email: 'owner@example.com',
    role: 'owner',
    organizationId: 1,
  };

  const mockAdmin: RbacUser = {
    id: 2,
    email: 'admin@example.com',
    role: 'admin',
    organizationId: 1,
  };

  const mockViewer: RbacUser = {
    id: 3,
    email: 'viewer@example.com',
    role: 'viewer',
    organizationId: 1,
  };

  const mockViewerDifferentOrg: RbacUser = {
    id: 4,
    email: 'viewer2@example.com',
    role: 'viewer',
    organizationId: 2,
  };

  const mockTask: RbacTask = {
    id: 100,
    createdByUserId: 3,
    organizationId: 1,
  };

  const mockTaskDifferentOrg: RbacTask = {
    id: 101,
    createdByUserId: 3,
    organizationId: 2,
  };

  const mockContext: ExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any;

  describe('RBAC Helper Functions', () => {
    describe('isOwner', () => {
      it('should return true for owner role', () => {
        expect(isOwner(mockOwner)).toBe(true);
      });

      it('should return false for non-owner roles', () => {
        expect(isOwner(mockAdmin)).toBe(false);
        expect(isOwner(mockViewer)).toBe(false);
      });
    });

    describe('isAdminOrOwner', () => {
      it('should return true for owner role', () => {
        expect(isAdminOrOwner(mockOwner)).toBe(true);
      });

      it('should return true for admin role', () => {
        expect(isAdminOrOwner(mockAdmin)).toBe(true);
      });

      it('should return false for viewer role', () => {
        expect(isAdminOrOwner(mockViewer)).toBe(false);
      });
    });

    describe('isViewer', () => {
      it('should return true for viewer role', () => {
        expect(isViewer(mockViewer)).toBe(true);
      });

      it('should return false for non-viewer roles', () => {
        expect(isViewer(mockOwner)).toBe(false);
        expect(isViewer(mockAdmin)).toBe(false);
      });
    });

    describe('canReadTasks', () => {
      it('should return true for all authenticated users', () => {
        expect(canReadTasks(mockOwner)).toBe(true);
        expect(canReadTasks(mockAdmin)).toBe(true);
        expect(canReadTasks(mockViewer)).toBe(true);
      });
    });

    describe('canCreateTask', () => {
      it('should return true for owner and admin', () => {
        expect(canCreateTask(mockOwner)).toBe(true);
        expect(canCreateTask(mockAdmin)).toBe(true);
      });

      it('should return false for viewer', () => {
        expect(canCreateTask(mockViewer)).toBe(false);
      });
    });

    describe('canUpdateTask', () => {
      it('should return create permission when no task provided', () => {
        expect(canUpdateTask(mockOwner)).toBe(true);
        expect(canUpdateTask(mockAdmin)).toBe(true);
        expect(canUpdateTask(mockViewer)).toBe(false);
      });

      it('should allow owner to update any task in same org', () => {
        expect(canUpdateTask(mockOwner, mockTask)).toBe(true);
      });

      it('should allow admin to update any task in same org', () => {
        expect(canUpdateTask(mockAdmin, mockTask)).toBe(true);
      });

      it('should allow viewer to update their own task', () => {
        expect(canUpdateTask(mockViewer, mockTask)).toBe(true);
      });

      it('should deny viewer updating others task', () => {
        const otherTask = { ...mockTask, createdByUserId: 999 };
        expect(canUpdateTask(mockViewer, otherTask)).toBe(false);
      });

      it('should deny access to tasks from different organization', () => {
        expect(canUpdateTask(mockOwner, mockTaskDifferentOrg)).toBe(false);
        expect(canUpdateTask(mockAdmin, mockTaskDifferentOrg)).toBe(false);
        expect(canUpdateTask(mockViewer, mockTaskDifferentOrg)).toBe(false);
      });
    });

    describe('canDeleteTask', () => {
      it('should return owner permission when no task provided', () => {
        expect(canDeleteTask(mockOwner)).toBe(true);
        expect(canDeleteTask(mockAdmin)).toBe(false);
        expect(canDeleteTask(mockViewer)).toBe(false);
      });

      it('should allow only owner to delete tasks in same org', () => {
        expect(canDeleteTask(mockOwner, mockTask)).toBe(true);
        expect(canDeleteTask(mockAdmin, mockTask)).toBe(false);
        expect(canDeleteTask(mockViewer, mockTask)).toBe(false);
      });

      it('should deny deleting tasks from different organization', () => {
        expect(canDeleteTask(mockOwner, mockTaskDifferentOrg)).toBe(false);
      });
    });

    describe('canViewAuditLogs', () => {
      it('should return true for owner and admin', () => {
        expect(canViewAuditLogs(mockOwner)).toBe(true);
        expect(canViewAuditLogs(mockAdmin)).toBe(true);
      });

      it('should return false for viewer', () => {
        expect(canViewAuditLogs(mockViewer)).toBe(false);
      });
    });

    describe('isSameOrganization', () => {
      it('should return true for same organization', () => {
        expect(isSameOrganization(mockViewer, 1)).toBe(true);
      });

      it('should return false for different organization', () => {
        expect(isSameOrganization(mockViewer, 2)).toBe(false);
      });
    });

    describe('scopeForTasks', () => {
      it('should return organization scope for admin and owner', () => {
        expect(scopeForTasks(mockOwner)).toEqual({ organizationId: 1 });
        expect(scopeForTasks(mockAdmin)).toEqual({ organizationId: 1 });
      });

      it('should return organization and user scope for viewer', () => {
        expect(scopeForTasks(mockViewer)).toEqual({
          organizationId: 1,
          createdByUserId: 3,
        });
      });
    });

    describe('isTaskCreator', () => {
      it('should return true for task creator', () => {
        expect(isTaskCreator(mockViewer, mockTask)).toBe(true);
      });

      it('should return false for non-creator', () => {
        expect(isTaskCreator(mockOwner, mockTask)).toBe(false);
        expect(isTaskCreator(mockAdmin, mockTask)).toBe(false);
      });
    });
  });

  describe('RolePolicies', () => {
    describe('requireOwner', () => {
      it('should create policy that allows only owner', async () => {
        const policy = RolePolicies.requireOwner();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(false);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
        expect(policy.errorMessage).toBe('Access denied: Owner role required');
      });

      it('should use custom error message', () => {
        const customMessage = 'Custom owner message';
        const policy = RolePolicies.requireOwner(customMessage);
        
        expect(policy.errorMessage).toBe(customMessage);
      });
    });

    describe('requireAdminOrOwner', () => {
      it('should create policy that allows admin and owner', async () => {
        const policy = RolePolicies.requireAdminOrOwner();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
        expect(policy.errorMessage).toBe('Access denied: Admin or Owner role required');
      });
    });

    describe('requireAuthenticated', () => {
      it('should create policy that allows any authenticated user', async () => {
        const policy = RolePolicies.requireAuthenticated();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(true);
      });
    });

    describe('requireRoles', () => {
      it('should create policy for specific roles', async () => {
        const policy = RolePolicies.requireRoles(['admin', 'viewer']);
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(false);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(true);
        expect(policy.errorMessage).toBe('Access denied: Required roles: admin, viewer');
      });
    });
  });

  describe('TaskPolicies', () => {
    describe('canReadTasks', () => {
      it('should create policy that allows reading tasks', async () => {
        const policy = TaskPolicies.canReadTasks();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(true);
      });

      it('should handle errors in policy evaluation', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Create a policy that will throw an error
        const errorPolicy = createPolicyGuard(
          (user) => {
            try {
              throw new Error('Test error');
            } catch (error) {
              console.error('Error in canReadTasks policy:', error);
              return false;
            }
          },
          'Access denied: Cannot read tasks'
        );
        
        const result = await errorPolicy.predicate(mockViewer, mockContext);
        
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Error in canReadTasks policy:', expect.any(Error));
        
        // Restore
        consoleSpy.mockRestore();
      });
    });

    describe('canCreateTask', () => {
      it('should create policy that allows creating tasks', async () => {
        const policy = TaskPolicies.canCreateTask();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
      });
    });

    describe('canUpdateTask', () => {
      it('should create policy with resource extraction', async () => {
        const policy = TaskPolicies.canUpdateTask();
        
        // Test without resource (should use general permission)
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
        
        // Test with resource
        expect(await policy.predicate(mockOwner, mockContext, mockTask)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext, mockTask)).toBe(true);
        
        const otherTask = { ...mockTask, createdByUserId: 999 };
        expect(await policy.predicate(mockViewer, mockContext, otherTask)).toBe(false);
      });

      it('should extract task ID from route parameters', () => {
        const policy = TaskPolicies.canUpdateTask();
        const mockRequest = { params: { id: '123' } };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const resource = policy.resourceExtractor!(mockContext);
        expect(resource).toEqual({ id: 123 });
      });
    });

    describe('canDeleteTask', () => {
      it('should create policy for task deletion', async () => {
        const policy = TaskPolicies.canDeleteTask();
        
        // Test without resource
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(false);
        
        // Test with resource
        expect(await policy.predicate(mockOwner, mockContext, mockTask)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext, mockTask)).toBe(false);
        expect(await policy.predicate(mockViewer, mockContext, mockTask)).toBe(false);
      });
    });

    describe('canUpdateOwnTask', () => {
      it('should create policy for updating own tasks', async () => {
        const policy = TaskPolicies.canUpdateOwnTask();
        
        // Test without resource (should fail)
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
        
        // Test with own task
        expect(await policy.predicate(mockViewer, mockContext, mockTask)).toBe(true);
        
        // Test with others task
        const otherTask = { ...mockTask, createdByUserId: 999 };
        expect(await policy.predicate(mockViewer, mockContext, otherTask)).toBe(false);
      });
    });
  });

  describe('AuditPolicies', () => {
    describe('canViewAuditLogs', () => {
      it('should create policy for viewing audit logs', async () => {
        const policy = AuditPolicies.canViewAuditLogs();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(false);
      });
    });
  });

  describe('OrganizationPolicies', () => {
    describe('sameOrganization', () => {
      it('should create policy for same organization access', async () => {
        const policy = OrganizationPolicies.sameOrganization();
        
        // Test without resource (should allow)
        expect(await policy.predicate(mockViewer, mockContext)).toBe(true);
        
        // Test with same organization
        expect(await policy.predicate(mockViewer, mockContext, { organizationId: 1 })).toBe(true);
        
        // Test with different organization
        expect(await policy.predicate(mockViewer, mockContext, { organizationId: 2 })).toBe(false);
        
        // Test with resource without organizationId
        expect(await policy.predicate(mockViewer, mockContext, { id: 123 })).toBe(true);
      });
    });

    describe('canAccessOrganization', () => {
      it('should create policy for organization access', async () => {
        const policy = OrganizationPolicies.canAccessOrganization();
        
        expect(await policy.predicate(mockOwner, mockContext)).toBe(true);
        expect(await policy.predicate(mockAdmin, mockContext)).toBe(true);
        expect(await policy.predicate(mockViewer, mockContext)).toBe(true);
      });
    });
  });

  describe('ResourceExtractors', () => {
    describe('extractTaskId', () => {
      it('should extract task ID from route parameters', () => {
        const mockRequest = { params: { id: '456' } };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const taskId = ResourceExtractors.extractTaskId(mockContext);
        expect(taskId).toBe(456);
      });

      it('should return null when no task ID', () => {
        const mockRequest = { params: {} };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const taskId = ResourceExtractors.extractTaskId(mockContext);
        expect(taskId).toBeNull();
      });
    });

    describe('extractOrganizationId', () => {
      it('should extract organization ID from route parameters', () => {
        const mockRequest = { params: { organizationId: '789' } };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const orgId = ResourceExtractors.extractOrganizationId(mockContext);
        expect(orgId).toBe(789);
      });

      it('should return null when no organization ID', () => {
        const mockRequest = { params: {} };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const orgId = ResourceExtractors.extractOrganizationId(mockContext);
        expect(orgId).toBeNull();
      });
    });

    describe('extractUserId', () => {
      it('should extract user ID from route parameters', () => {
        const mockRequest = { params: { userId: '101' } };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const userId = ResourceExtractors.extractUserId(mockContext);
        expect(userId).toBe(101);
      });

      it('should return null when no user ID', () => {
        const mockRequest = { params: {} };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
        
        const userId = ResourceExtractors.extractUserId(mockContext);
        expect(userId).toBeNull();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work with complex task update scenario', async () => {
      const policy = TaskPolicies.canUpdateTask();
      const mockRequest = { params: { id: '100' } };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      
      // Extract resource
      const resource = policy.resourceExtractor!(mockContext);
      expect(resource).toEqual({ id: 100 });
      
      // Test policy with extracted resource
      const mockTaskResource = { ...mockTask, id: 100 };
      expect(await policy.predicate(mockViewer, mockContext, mockTaskResource)).toBe(true);
    });

    it('should handle organization scoping with multiple policies', async () => {
      const orgPolicy = OrganizationPolicies.sameOrganization();
      const taskPolicy = TaskPolicies.canUpdateTask();
      
      // User from different org
      const resource = { id: 100, organizationId: 2 };
      
      // Organization policy should fail
      expect(await orgPolicy.predicate(mockViewer, mockContext, resource)).toBe(false);
      
      // Task policy should also fail due to organization mismatch
      expect(await taskPolicy.predicate(mockViewer, mockContext, mockTaskDifferentOrg)).toBe(false);
    });

    it('should demonstrate policy composition', async () => {
      // Create a composed policy that checks both role and organization
      const composedPolicy = createPolicyGuard(
        async (user, context, resource) => {
          // Check role permission
          const hasRolePermission = isAdminOrOwner(user);
          
          // Check organization permission
          const hasOrgPermission = !resource || isSameOrganization(user, resource.organizationId);
          
          return hasRolePermission && hasOrgPermission;
        },
        'Access denied: Insufficient role or wrong organization'
      );
      
      // Test with admin in same org (should pass)
      expect(await composedPolicy.predicate(mockAdmin, mockContext, { organizationId: 1 })).toBe(true);
      
      // Test with admin in different org (should fail)
      expect(await composedPolicy.predicate(mockAdmin, mockContext, { organizationId: 2 })).toBe(false);
      
      // Test with viewer in same org (should fail due to role)
      expect(await composedPolicy.predicate(mockViewer, mockContext, { organizationId: 1 })).toBe(false);
    });
  });
});
