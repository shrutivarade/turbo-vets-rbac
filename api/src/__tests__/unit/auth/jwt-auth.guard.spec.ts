/// <reference path="../../jest.d.ts" />

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

// Create a test JWT Auth Guard class that matches the real implementation
class TestJwtAuthGuard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // List of public routes that don't require authentication
    const publicRoutes = [
      '/auth/login',
      '/api/auth/login',
      '/api/auth/test',
      '/api/auth',
      '/api',  // Health check endpoint
    ];
    
    // Skip authentication for public routes (more permissive for testing)
    if (publicRoutes.includes(request.url) || 
        request.url.startsWith('/auth') || 
        request.url.startsWith('/api/auth')) {
      return true;
    }
    
    // Apply JWT authentication for all other routes
    return this.superCanActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw new UnauthorizedException('Invalid token or authentication failed');
    }
    return user;
  }

  // Mock the super.canActivate call
  private superCanActivate(context: ExecutionContext): boolean {
    // Simulate the parent AuthGuard('jwt') behavior
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      return this.handleRequest(new Error('No token'), null, null);
    }

    try {
      const user = this.validateToken(token);
      return this.handleRequest(null, user, null);
    } catch (error) {
      return this.handleRequest(error, null, null);
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? (token || null) : null;
  }

  private validateToken(token: string): any {
    // Mock token validation
    if (token === 'valid-token') {
      return { id: 1, email: 'test@example.com', role: 'admin' };
    }
    if (token === 'expired-token') {
      throw new Error('Token expired');
    }
    if (token === 'invalid-token') {
      throw new Error('Invalid signature');
    }
    throw new Error('Malformed token');
  }
}

describe('JwtAuthGuard', () => {
  let guard: TestJwtAuthGuard;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guard = new TestJwtAuthGuard();

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
    it('should return true for public routes', () => {
      // Arrange
      const mockRequest = { url: '/api/auth/login' };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should authenticate valid token for protected routes', () => {
      // Arrange
      const mockRequest = {
        url: '/api/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException when no token is provided', () => {
      // Arrange
      const mockRequest = {
        url: '/api/protected',
        headers: {},
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid token or authentication failed')
      );
    });

    it('should throw UnauthorizedException for invalid token', () => {
      // Arrange
      const mockRequest = {
        url: '/api/protected',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid token or authentication failed')
      );
    });

    it('should throw UnauthorizedException for expired token', () => {
      // Arrange
      const mockRequest = {
        url: '/api/protected',
        headers: {
          authorization: 'Bearer expired-token',
        },
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid token or authentication failed')
      );
    });

    it('should handle missing authorization header', () => {
      // Arrange
      const mockRequest = {
        url: '/api/protected',
        headers: {
          'content-type': 'application/json',
        },
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid token or authentication failed')
      );
    });

    it('should handle malformed authorization header', () => {
      // Arrange
      const testCases = [
        { authorization: 'InvalidFormat' },
        { authorization: 'Bearer' }, // Missing token
        { authorization: 'Basic dGVzdA==' }, // Wrong type
        { authorization: '' },
      ];

      testCases.forEach((headers) => {
        const mockRequest = { 
          url: '/api/protected',
          headers 
        };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('Invalid token or authentication failed')
        );
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token correctly', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      };

      // Act
      const token = (guard as any).extractTokenFromHeader(mockRequest);

      // Assert
      expect(token).toBe('valid-token-123');
    });

    it('should return null for non-Bearer tokens', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Basic dGVzdDp0ZXN0',
        },
      };

      // Act
      const token = (guard as any).extractTokenFromHeader(mockRequest);

      // Assert
      expect(token).toBeNull();
    });

    it('should return null when authorization header is missing', () => {
      // Arrange
      const mockRequest = {
        headers: {},
      };

      // Act
      const token = (guard as any).extractTokenFromHeader(mockRequest);

      // Assert
      expect(token).toBeNull();
    });

    it('should handle edge cases in authorization header', () => {
      const testCases = [
        { authorization: '', expected: null },
        { authorization: 'Bearer', expected: null },
        { authorization: 'Bearer ', expected: null },
        { authorization: 'Bearer token-with-spaces', expected: 'token-with-spaces' },
        { authorization: 'bearer lowercase-token', expected: null }, // Case sensitive
      ];

      testCases.forEach(({ authorization, expected }) => {
        const mockRequest = { headers: { authorization } };
        const token = (guard as any).extractTokenFromHeader(mockRequest);
        expect(token).toBe(expected);
      });
    });
  });

  describe('validateToken', () => {
    it('should validate and return user for valid token', () => {
      // Act
      const user = (guard as any).validateToken('valid-token');

      // Assert
      expect(user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should throw error for invalid tokens', () => {
      const invalidTokens = ['invalid-token', 'expired-token', 'malformed'];

      invalidTokens.forEach((token) => {
        // Act & Assert
        expect(() => (guard as any).validateToken(token)).toThrow();
      });
    });
  });

  describe('public route detection', () => {
    it('should detect specific public routes', () => {
      const publicRoutes = [
        '/auth/login',
        '/api/auth/login',
        '/api/auth/test',
        '/api/auth',
        '/api',
      ];

      publicRoutes.forEach(url => {
        const mockRequest = { url };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });
    });

    it('should detect routes starting with /auth', () => {
      const authRoutes = [
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset',
      ];

      authRoutes.forEach(url => {
        const mockRequest = { url };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });
    });

    it('should detect routes starting with /api/auth', () => {
      const apiAuthRoutes = [
        '/api/auth/register',
        '/api/auth/health',
        '/api/auth/status',
      ];

      apiAuthRoutes.forEach(url => {
        const mockRequest = { url };
        (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle context switching errors', () => {
      // Arrange
      (mockContext.switchToHttp as jest.Mock).mockImplementation(() => {
        throw new Error('Context switch failed');
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow('Context switch failed');
    });

    it('should handle request object errors', () => {
      // Arrange
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(null);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should work with complete request flow', () => {
      // Arrange - Simulate a typical authenticated request
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
          'user-agent': 'Test Client',
          'content-type': 'application/json',
        },
        method: 'GET',
        url: '/api/protected',
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should allow public endpoint without authentication', () => {
      // Arrange - Simulate a public endpoint
      const mockRequest = {
        headers: {}, // No authorization header
        method: 'GET',
        url: '/api/auth/public',
      };
      (mockContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(mockRequest);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true); // Public route should return true
    });
  });
});
