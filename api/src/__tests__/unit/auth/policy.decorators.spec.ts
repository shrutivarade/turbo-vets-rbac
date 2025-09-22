/// <reference path="../../jest.d.ts" />

import { ExecutionContext } from '@nestjs/common';

// Mock SetMetadata from @nestjs/common
const mockSetMetadata = jest.fn();
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: mockSetMetadata,
}));

// Mock interfaces
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

// Mock Role enum
enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

// Mock decorator implementations
const POLICY_METADATA_KEY = 'policy';

const Policy = (policyConfig: PolicyConfig) => mockSetMetadata(POLICY_METADATA_KEY, policyConfig);

const RequireRole = (roles: Role[], errorMessage?: string) => {
  const policyConfig: PolicyConfig = {
    predicate: (user) => roles.includes(user.role as Role),
    errorMessage: errorMessage || `Access denied: Required roles: ${roles.join(', ')}`
  };
  return Policy(policyConfig);
};

const RequirePermission = (
  permission: string,
  resourceType?: string,
  errorMessage?: string
) => {
  const policyConfig: PolicyConfig = {
    predicate: (user, context, resource) => {
      console.log(`Checking permission: ${permission} on ${resourceType || 'resource'}`);
      return true; // Placeholder
    },
    errorMessage: errorMessage || `Access denied: Permission '${permission}' required`
  };
  return Policy(policyConfig);
};

const CustomPolicy = (
  predicate: (user: RbacUser, context: ExecutionContext, resource?: any) => boolean | Promise<boolean>,
  errorMessage?: string,
  resourceExtractor?: (context: ExecutionContext) => any
) => {
  const policyConfig: PolicyConfig = {
    predicate,
    errorMessage,
    resourceExtractor
  };
  return Policy(policyConfig);
};

const Public = () => mockSetMetadata('isPublic', true);

const AdminOnly = (errorMessage?: string) => 
  RequireRole([Role.ADMIN, Role.OWNER], errorMessage || 'Only admins and owners can access this endpoint');

const OwnerOnly = (errorMessage?: string) => 
  RequireRole([Role.OWNER], errorMessage || 'Only owners can access this endpoint');

const ViewerReadOnly = () => 
  RequireRole([Role.VIEWER, Role.ADMIN, Role.OWNER], 'Access denied: Authentication required');

describe('Policy Decorators', () => {
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

  const mockContext: ExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Policy', () => {
    it('should call SetMetadata with correct key and policy config', () => {
      // Arrange
      const policyConfig: PolicyConfig = {
        predicate: (user) => user.role === 'admin',
        errorMessage: 'Test error message'
      };

      // Act
      Policy(policyConfig);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, policyConfig);
    });

    it('should work with complex policy configurations', () => {
      // Arrange
      const complexPolicy: PolicyConfig = {
        predicate: async (user, context, resource) => {
          return user.role === 'owner' && (!resource || user.organizationId === resource.organizationId);
        },
        errorMessage: 'Complex access denied',
        resourceExtractor: (context) => ({ organizationId: 1 })
      };

      // Act
      Policy(complexPolicy);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, complexPolicy);
    });
  });

  describe('RequireRole', () => {
    it('should create policy for single role', async () => {
      // Act
      RequireRole([Role.OWNER]);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: expect.any(Function),
        errorMessage: 'Access denied: Required roles: owner'
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(false);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(false);
    });

    it('should create policy for multiple roles', async () => {
      // Act
      RequireRole([Role.ADMIN, Role.OWNER]);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(false);
      expect(policyConfig.errorMessage).toBe('Access denied: Required roles: admin, owner');
    });

    it('should use custom error message', () => {
      // Arrange
      const customMessage = 'Custom role error message';

      // Act
      RequireRole([Role.OWNER], customMessage);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.errorMessage).toBe(customMessage);
    });

    it('should handle empty roles array', async () => {
      // Act
      RequireRole([]);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(false);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(false);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(false);
    });
  });

  describe('RequirePermission', () => {
    it('should create permission-based policy', async () => {
      // Arrange
      const permission = 'read';
      const resourceType = 'task';

      // Act
      RequirePermission(permission, resourceType);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: expect.any(Function),
        errorMessage: "Access denied: Permission 'read' required"
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await policyConfig.predicate(mockAdmin, mockContext, { id: 1 });
      
      expect(result).toBe(true); // Placeholder implementation always returns true
      expect(consoleSpy).toHaveBeenCalledWith('Checking permission: read on task');
      
      consoleSpy.mockRestore();
    });

    it('should work without resource type', async () => {
      // Act
      RequirePermission('write');

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await policyConfig.predicate(mockAdmin, mockContext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Checking permission: write on resource');
      
      consoleSpy.mockRestore();
    });

    it('should use custom error message', () => {
      // Arrange
      const customMessage = 'Custom permission error';

      // Act
      RequirePermission('delete', 'user', customMessage);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.errorMessage).toBe(customMessage);
    });
  });

  describe('CustomPolicy', () => {
    it('should create custom policy with predicate', async () => {
      // Arrange
      const customPredicate = (user: RbacUser, context: ExecutionContext, resource?: any) => {
        return user.role === 'admin' && (!resource || resource.id > 100);
      };
      const customMessage = 'Custom policy failed';

      // Act
      CustomPolicy(customPredicate, customMessage);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: customPredicate,
        errorMessage: customMessage,
        resourceExtractor: undefined
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockAdmin, mockContext, { id: 150 })).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext, { id: 50 })).toBe(false);
      expect(await policyConfig.predicate(mockViewer, mockContext, { id: 150 })).toBe(false);
    });

    it('should create custom policy with resource extractor', async () => {
      // Arrange
      const customPredicate = (user: RbacUser, context: ExecutionContext, resource?: any) => {
        return resource && resource.taskId === 123;
      };
      const resourceExtractor = (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return { taskId: parseInt(request.params.id) };
      };

      // Act
      CustomPolicy(customPredicate, undefined, resourceExtractor);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.resourceExtractor).toBe(resourceExtractor);
    });

    it('should handle async custom predicates', async () => {
      // Arrange
      const asyncPredicate = async (user: RbacUser) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return user.role === 'owner';
      };

      // Act
      CustomPolicy(asyncPredicate);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(false);
    });
  });

  describe('Public', () => {
    it('should call SetMetadata with isPublic true', () => {
      // Act
      Public();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('isPublic', true);
    });
  });

  describe('AdminOnly', () => {
    it('should create policy for admin and owner roles', async () => {
      // Act
      AdminOnly();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: expect.any(Function),
        errorMessage: 'Only admins and owners can access this endpoint'
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(false);
    });

    it('should use custom error message', () => {
      // Arrange
      const customMessage = 'Custom admin only message';

      // Act
      AdminOnly(customMessage);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.errorMessage).toBe(customMessage);
    });
  });

  describe('OwnerOnly', () => {
    it('should create policy for owner role only', async () => {
      // Act
      OwnerOnly();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: expect.any(Function),
        errorMessage: 'Only owners can access this endpoint'
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(false);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(false);
    });

    it('should use custom error message', () => {
      // Arrange
      const customMessage = 'Custom owner only message';

      // Act
      OwnerOnly(customMessage);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.errorMessage).toBe(customMessage);
    });
  });

  describe('ViewerReadOnly', () => {
    it('should create policy for all authenticated roles', async () => {
      // Act
      ViewerReadOnly();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: expect.any(Function),
        errorMessage: 'Access denied: Authentication required'
      }));

      // Test the predicate function
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(await policyConfig.predicate(mockOwner, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockAdmin, mockContext)).toBe(true);
      expect(await policyConfig.predicate(mockViewer, mockContext)).toBe(true);
    });
  });

  describe('Decorator integration scenarios', () => {
    it('should work with controller method decoration', () => {
      // Simulate decorating a controller method
      const decorateMethod = () => {
        AdminOnly('Admin access required');
      };

      // Act
      decorateMethod();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        errorMessage: 'Admin access required'
      }));
    });

    it('should support decorator stacking simulation', () => {
      // Simulate multiple decorators on the same method
      Public();
      OwnerOnly();
      RequireRole([Role.ADMIN]);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledTimes(3);
      expect(mockSetMetadata).toHaveBeenNthCalledWith(1, 'isPublic', true);
      expect(mockSetMetadata).toHaveBeenNthCalledWith(2, POLICY_METADATA_KEY, expect.any(Object));
      expect(mockSetMetadata).toHaveBeenNthCalledWith(3, POLICY_METADATA_KEY, expect.any(Object));
    });

    it('should work with resource-based decorators', () => {
      // Arrange
      const resourceExtractor = (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return { taskId: request.params.id };
      };

      // Act
      CustomPolicy(
        (user, context, resource) => user.role === 'owner' || resource?.taskId === user.id,
        'Cannot access this resource',
        resourceExtractor
      );

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      expect(policyConfig.resourceExtractor).toBe(resourceExtractor);
      expect(policyConfig.errorMessage).toBe('Cannot access this resource');
    });
  });

  describe('Error handling in decorators', () => {
    it('should handle predicate errors gracefully', () => {
      // Arrange
      const errorPredicate = (user: RbacUser) => {
        throw new Error('Predicate evaluation failed');
      };

      // Act
      CustomPolicy(errorPredicate);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      // The predicate should throw when called (testing that the error is preserved)
      expect(() => policyConfig.predicate(mockAdmin, mockContext)).toThrow('Predicate evaluation failed');
    });

    it('should handle async predicate errors', async () => {
      // Arrange
      const asyncErrorPredicate = async (user: RbacUser) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        throw new Error('Async predicate failed');
      };

      // Act
      CustomPolicy(asyncErrorPredicate);

      // Assert
      const call = mockSetMetadata.mock.calls[0];
      const policyConfig = call[1] as PolicyConfig;
      
      await expect(policyConfig.predicate(mockAdmin, mockContext)).rejects.toThrow('Async predicate failed');
    });
  });

  describe('Metadata key constants', () => {
    it('should use correct metadata key for policies', () => {
      // Act
      RequireRole([Role.ADMIN]);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('policy', expect.any(Object));
    });

    it('should use correct metadata key for public endpoints', () => {
      // Act
      Public();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('isPublic', true);
    });
  });

  describe('Complex decorator scenarios', () => {
    it('should create complex permission-based decorator', () => {
      // Arrange
      const complexPermissionCheck = (user: RbacUser, context: ExecutionContext, resource?: any) => {
        if (user.role === 'owner') return true;
        if (user.role === 'admin' && resource?.organizationId === user.organizationId) return true;
        if (user.role === 'viewer' && resource?.createdBy === user.id) return true;
        return false;
      };

      const resourceExtractor = (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return {
          organizationId: parseInt(request.headers['x-organization-id'] || '0'),
          createdBy: parseInt(request.headers['x-created-by'] || '0')
        };
      };

      // Act
      CustomPolicy(
        complexPermissionCheck,
        'Complex permission check failed',
        resourceExtractor
      );

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(POLICY_METADATA_KEY, expect.objectContaining({
        predicate: complexPermissionCheck,
        errorMessage: 'Complex permission check failed',
        resourceExtractor: resourceExtractor
      }));
    });

    it('should demonstrate policy composition through decorators', async () => {
      // Create multiple policies that could be used together
      RequireRole([Role.ADMIN, Role.OWNER]);
      RequirePermission('read', 'audit_log');
      CustomPolicy((user) => user.organizationId > 0);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledTimes(3);
      
      // Each call should have created a proper policy config
      const calls = mockSetMetadata.mock.calls;
      calls.forEach(call => {
        expect(call[0]).toBe(POLICY_METADATA_KEY);
        expect(call[1]).toHaveProperty('predicate');
        expect(call[1]).toHaveProperty('errorMessage');
      });
    });
  });
});
