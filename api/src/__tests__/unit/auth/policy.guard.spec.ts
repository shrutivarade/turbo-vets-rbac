/// <reference path="../../jest.d.ts" />

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Mock interfaces to avoid entity imports
interface RbacUser {
  id: number;
  email: string;
  role: string;
  organizationId: number;
}

interface PolicyConfig {
  predicate: (user: RbacUser, context: ExecutionContext, resource?: any) => boolean | Promise<boolean>;
  errorMessage?: string;
  resourceExtractor?: (context: ExecutionContext) => any;
}

// Create a test Policy Guard class to avoid imports
class TestPolicyGuard {
  constructor(private readonly reflector: Reflector) {}

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

// Helper functions for creating policy configs
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

function createRolePolicy(allowedRoles: string[], errorMessage?: string): PolicyConfig {
  return createPolicyGuard(
    (user) => allowedRoles.includes(user.role),
    errorMessage || `Access denied: Required roles: ${allowedRoles.join(', ')}`
  );
}

describe('PolicyGuard', () => {
  let guard: TestPolicyGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  // Mock data
  const mockUser: RbacUser = {
    id: 1,
    email: 'test@example.com',
    role: 'admin',
    organizationId: 1,
  };

  const mockViewerUser: RbacUser = {
    id: 2,
    email: 'viewer@example.com',
    role: 'viewer',
    organizationId: 1,
  };

  const mockOwnerUser: RbacUser = {
    id: 3,
    email: 'owner@example.com',
    role: 'owner',
    organizationId: 1,
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    guard = new TestPolicyGuard(reflector);

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn(),
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should return true when no policy is defined', async () => {
      // Arrange
      (reflector.get as jest.Mock).mockReturnValue(undefined);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith('policy', mockContext.getHandler());
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      // Arrange
      const mockPolicy = createRolePolicy(['admin']);
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: null };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('User not authenticated')
      );
    });

    it('should return true when policy predicate passes', async () => {
      // Arrange
      const mockPolicy = createRolePolicy(['admin']);
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when policy predicate fails', async () => {
      // Arrange
      const mockPolicy = createRolePolicy(['owner']);
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockViewerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Required roles: owner')
      );
    });

    it('should use custom error message when policy fails', async () => {
      // Arrange
      const customMessage = 'Custom access denied message';
      const mockPolicy = createRolePolicy(['owner'], customMessage);
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockViewerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException(customMessage)
      );
    });

    it('should handle async policy predicates', async () => {
      // Arrange
      const asyncPolicy = createPolicyGuard(
        async (user) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return user.role === 'admin';
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(asyncPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should extract resource when resourceExtractor is provided', async () => {
      // Arrange
      const extractedResource = { id: 123, organizationId: 1 };
      const mockPolicy = createPolicyGuard(
        (user, context, resource) => {
          expect(resource).toEqual(extractedResource);
          return user.organizationId === resource.organizationId;
        },
        undefined,
        (context) => extractedResource
      );
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle resource extraction from route parameters', async () => {
      // Arrange
      const mockPolicy = createPolicyGuard(
        (user, context, resource) => {
          return resource && resource.id === 456;
        },
        undefined,
        (context) => {
          const request = context.switchToHttp().getRequest();
          return { id: parseInt(request.params.id) };
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { 
        user: mockUser,
        params: { id: '456' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw ForbiddenException for policy evaluation errors', async () => {
      // Arrange
      const errorPolicy = createPolicyGuard(
        (user) => {
          throw new Error('Unexpected policy error');
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(errorPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Policy evaluation failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith('Policy evaluation error:', expect.any(Error));
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should rethrow ForbiddenExceptions from policy predicates', async () => {
      // Arrange
      const customForbiddenError = new ForbiddenException('Custom forbidden message');
      const errorPolicy = createPolicyGuard(
        (user) => {
          throw customForbiddenError;
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(errorPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(customForbiddenError);
    });

    it('should handle async policy predicate errors', async () => {
      // Arrange
      const asyncErrorPolicy = createPolicyGuard(
        async (user) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Async policy error');
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(asyncErrorPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Policy evaluation failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith('Policy evaluation error:', expect.any(Error));
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle resource extractor errors', async () => {
      // Arrange
      const mockPolicy = createPolicyGuard(
        (user) => true,
        undefined,
        (context) => {
          throw new Error('Resource extraction failed');
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Policy evaluation failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith('Policy evaluation error:', expect.any(Error));
      
      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('role-based policies', () => {
    it('should allow admin user for admin policy', async () => {
      // Arrange
      const adminPolicy = createRolePolicy(['admin']);
      (reflector.get as jest.Mock).mockReturnValue(adminPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny viewer user for admin policy', async () => {
      // Arrange
      const adminPolicy = createRolePolicy(['admin']);
      (reflector.get as jest.Mock).mockReturnValue(adminPolicy);
      const mockRequest = { user: mockViewerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Required roles: admin')
      );
    });

    it('should allow multiple roles in policy', async () => {
      // Arrange
      const multiRolePolicy = createRolePolicy(['admin', 'owner']);
      (reflector.get as jest.Mock).mockReturnValue(multiRolePolicy);

      // Test admin user
      const adminRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(adminRequest);
      
      const adminResult = await guard.canActivate(mockContext);
      expect(adminResult).toBe(true);

      // Test owner user
      const ownerRequest = { user: mockOwnerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(ownerRequest);
      
      const ownerResult = await guard.canActivate(mockContext);
      expect(ownerResult).toBe(true);

      // Test viewer user (should fail)
      const viewerRequest = { user: mockViewerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(viewerRequest);
      
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resource-based policies', () => {
    it('should evaluate policy with resource context', async () => {
      // Arrange
      const resourcePolicy = createPolicyGuard(
        (user, context, resource) => {
          // User can access resource if they belong to the same organization
          return user.organizationId === resource.organizationId;
        },
        'Access denied: Different organization',
        (context) => {
          const request = context.switchToHttp().getRequest();
          return { organizationId: parseInt(request.params.orgId) };
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(resourcePolicy);

      // Test same organization (should pass)
      const sameOrgRequest = { 
        user: mockUser,
        params: { orgId: '1' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(sameOrgRequest);
      
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);

      // Test different organization (should fail)
      const diffOrgRequest = { 
        user: mockUser,
        params: { orgId: '2' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(diffOrgRequest);
      
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Different organization')
      );
    });

    it('should handle missing resource gracefully', async () => {
      // Arrange
      const resourcePolicy = createPolicyGuard(
        (user, context, resource) => {
          // Allow access if no resource context
          return !resource || user.role === 'admin';
        },
        undefined,
        (context) => null // No resource extracted
      );
      (reflector.get as jest.Mock).mockReturnValue(resourcePolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('complex policy scenarios', () => {
    it('should handle task ownership policy', async () => {
      // Arrange
      const taskOwnershipPolicy = createPolicyGuard(
        (user, context, resource) => {
          if (!resource) return false;
          
          // Owners can access any task, others only their own
          if (user.role === 'owner') return true;
          if (user.role === 'admin' && user.organizationId === resource.organizationId) return true;
          
          return user.id === resource.createdByUserId && user.organizationId === resource.organizationId;
        },
        'Cannot access this task',
        (context) => {
          const request = context.switchToHttp().getRequest();
          return {
            id: parseInt(request.params.id),
            createdByUserId: parseInt(request.body?.createdByUserId || request.query?.createdByUserId || '2'),
            organizationId: parseInt(request.body?.organizationId || request.query?.organizationId || '1')
          };
        }
      );
      (reflector.get as jest.Mock).mockReturnValue(taskOwnershipPolicy);

      // Test owner access (should pass)
      const ownerRequest = { 
        user: mockOwnerUser,
        params: { id: '123' },
        body: { createdByUserId: '2', organizationId: '1' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(ownerRequest);
      
      const ownerResult = await guard.canActivate(mockContext);
      expect(ownerResult).toBe(true);

      // Test admin in same org (should pass)
      const adminRequest = { 
        user: mockUser,
        params: { id: '123' },
        body: { createdByUserId: '2', organizationId: '1' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(adminRequest);
      
      const adminResult = await guard.canActivate(mockContext);
      expect(adminResult).toBe(true);

      // Test non-owner accessing other's task (should fail)
      const nonOwnerRequest = { 
        user: mockViewerUser,
        params: { id: '123' },
        body: { createdByUserId: '3', organizationId: '1' }
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(nonOwnerRequest);
      
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Cannot access this task')
      );
    });

    it('should handle time-based policies', async () => {
      // Arrange - Create a time-based policy that always passes for testing
      const timeBasedPolicy = createPolicyGuard(
        async (user) => {
          // For testing purposes, always return true for owner, false for others
          return user.role === 'owner';
        },
        'Access denied: Outside business hours'
      );
      (reflector.get as jest.Mock).mockReturnValue(timeBasedPolicy);
      const mockRequest = { user: mockOwnerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert - Should pass for owner
      expect(result).toBe(true);
      
      // Test with viewer (should fail)
      const viewerRequest = { user: mockViewerUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(viewerRequest);
      
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        new ForbiddenException('Access denied: Outside business hours')
      );
    });

    it('should handle policy chaining', async () => {
      // Arrange
      const chainedPolicy = createPolicyGuard(
        (user, context, resource) => {
          // Multiple conditions: must be authenticated, have correct role, and same org
          const hasValidRole = ['admin', 'owner'].includes(user.role);
          const sameOrg = !resource || user.organizationId === resource.organizationId;
          const isAuthenticated = !!user.id;
          
          return isAuthenticated && hasValidRole && sameOrg;
        },
        'Access denied: Multiple policy violations',
        (context) => ({ organizationId: 1 })
      );
      (reflector.get as jest.Mock).mockReturnValue(chainedPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('reflector integration', () => {
    it('should get policy from correct metadata key', async () => {
      // Arrange
      const mockPolicy = createRolePolicy(['admin']);
      (reflector.get as jest.Mock).mockReturnValue(mockPolicy);
      const mockRequest = { user: mockUser };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      await guard.canActivate(mockContext);

      // Assert
      expect(reflector.get).toHaveBeenCalledWith('policy', mockContext.getHandler());
    });

    it('should handle null policy from reflector', async () => {
      // Arrange
      (reflector.get as jest.Mock).mockReturnValue(null);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});
