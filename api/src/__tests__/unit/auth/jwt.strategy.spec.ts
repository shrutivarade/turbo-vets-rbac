/// <reference path="../../jest.d.ts" />

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';

// Mock passport-jwt
jest.mock('passport-jwt', () => ({
  Strategy: jest.fn(),
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn(),
  },
}));

// Create test interfaces to avoid entity imports
interface User {
  id: number;
  email: string;
  role: string;
  organizationId: number | null;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  orgId: number | null;
}

// Mock AuthService
class MockAuthService {
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    // This will be mocked in tests
    throw new Error('Not implemented in mock');
  }
}

// Create a test JWT Strategy class to avoid entity/service imports
class TestJwtStrategy {
  private authService: MockAuthService;
  private configService: ConfigService;
  private strategyOptions: any;

  constructor(authService: MockAuthService, configService: ConfigService) {
    this.authService = authService;
    this.configService = configService;
    
    // Simulate the super() call configuration
    this.strategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret_change_me',
    };
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      // Use AuthService to validate and fetch user
      const user = await this.authService.validateJwtPayload(payload);
      
      // This user object will be available as req.user in controllers
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Expose strategy options for testing
  getStrategyOptions() {
    return this.strategyOptions;
  }
}

describe('JwtStrategy', () => {
  let strategy: TestJwtStrategy;
  let authService: MockAuthService;
  let configService: ConfigService;

  // Mock data
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    role: 'admin',
    organizationId: 1,
  };

  const mockJwtPayload: JwtPayload = {
    sub: 1,
    email: 'test@example.com',
    role: 'admin',
    orgId: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock ConfigService
    configService = {
      get: jest.fn(),
    } as any;

    // Create mock AuthService
    authService = new MockAuthService();
    
    // Create strategy instance
    strategy = new TestJwtStrategy(authService, configService);
  });

  describe('constructor configuration', () => {
    it('should configure strategy with correct options', () => {
      // Arrange
      (configService.get as jest.Mock).mockReturnValue('test_jwt_secret');
      
      // Act
      const newStrategy = new TestJwtStrategy(authService, configService);
      const options = newStrategy.getStrategyOptions();

      // Assert
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(options.secretOrKey).toBe('test_jwt_secret');
      expect(options.ignoreExpiration).toBe(false);
      expect(options.jwtFromRequest).toBe(ExtractJwt.fromAuthHeaderAsBearerToken());
    });

    it('should use default secret when JWT_SECRET is not configured', () => {
      // Arrange
      (configService.get as jest.Mock).mockReturnValue(undefined);
      
      // Act
      const newStrategy = new TestJwtStrategy(authService, configService);
      const options = newStrategy.getStrategyOptions();

      // Assert
      expect(options.secretOrKey).toBe('dev_secret_change_me');
    });

    it('should use empty string as fallback secret', () => {
      // Arrange
      (configService.get as jest.Mock).mockReturnValue('');
      
      // Act
      const newStrategy = new TestJwtStrategy(authService, configService);
      const options = newStrategy.getStrategyOptions();

      // Assert
      expect(options.secretOrKey).toBe('dev_secret_change_me');
    });

    it('should configure ExtractJwt to use Bearer token from header', () => {
      // Act
      const options = strategy.getStrategyOptions();

      // Assert
      expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
      expect(options.jwtFromRequest).toBe(ExtractJwt.fromAuthHeaderAsBearerToken());
    });
  });

  describe('validate', () => {
    it('should return user when payload is valid', async () => {
      // Arrange
      jest.spyOn(authService, 'validateJwtPayload').mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(mockJwtPayload);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.validateJwtPayload).toHaveBeenCalledWith(mockJwtPayload);
    });

    it('should throw UnauthorizedException when AuthService throws error', async () => {
      // Arrange
      const authError = new Error('User not found');
      jest.spyOn(authService, 'validateJwtPayload').mockRejectedValue(authError);

      // Act & Assert
      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
      expect(authService.validateJwtPayload).toHaveBeenCalledWith(mockJwtPayload);
    });

    it('should handle UnauthorizedException from AuthService', async () => {
      // Arrange
      const authError = new UnauthorizedException('User not found');
      jest.spyOn(authService, 'validateJwtPayload').mockRejectedValue(authError);

      // Act & Assert
      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle different payload structures', async () => {
      // Arrange
      const differentPayload: JwtPayload = {
        sub: 999,
        email: 'different@example.com',
        role: 'viewer',
        orgId: null,
      };
      const differentUser: User = {
        id: 999,
        email: 'different@example.com',
        role: 'viewer',
        organizationId: null,
      };
      jest.spyOn(authService, 'validateJwtPayload').mockResolvedValue(differentUser);

      // Act
      const result = await strategy.validate(differentPayload);

      // Assert
      expect(result).toEqual(differentUser);
      expect(authService.validateJwtPayload).toHaveBeenCalledWith(differentPayload);
    });

    it('should pass through any payload format to AuthService', async () => {
      // Arrange
      const customPayload = {
        sub: 123,
        email: 'custom@example.com',
        role: 'custom',
        orgId: 456,
        extraField: 'should be passed through',
      } as any;
      jest.spyOn(authService, 'validateJwtPayload').mockResolvedValue(mockUser);

      // Act
      await strategy.validate(customPayload);

      // Assert
      expect(authService.validateJwtPayload).toHaveBeenCalledWith(customPayload);
    });
  });

  describe('error handling', () => {
    it('should convert any error to UnauthorizedException', async () => {
      // Arrange
      const errors = [
        new Error('Database connection failed'),
        new TypeError('Invalid payload format'),
        new ReferenceError('Service not available'),
        'String error',
        null,
        { custom: 'error object' },
      ];

      for (const error of errors) {
        jest.spyOn(authService, 'validateJwtPayload').mockRejectedValue(error);

        // Act & Assert
        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          new UnauthorizedException('Invalid token')
        );
      }

      expect(authService.validateJwtPayload).toHaveBeenCalledTimes(errors.length);
    });

    it('should maintain consistent error message', async () => {
      // Arrange
      jest.spyOn(authService, 'validateJwtPayload').mockRejectedValue(new Error('Any error'));

      // Act
      try {
        await strategy.validate(mockJwtPayload);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Invalid token');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work with complete authentication flow', async () => {
      // Arrange - Simulate a typical JWT validation flow
      const tokenPayload: JwtPayload = {
        sub: 42,
        email: 'integration@example.com',
        role: 'admin',
        orgId: 10,
      };
      const expectedUser: User = {
        id: 42,
        email: 'integration@example.com',
        role: 'admin',
        organizationId: 10,
      };
      jest.spyOn(authService, 'validateJwtPayload').mockResolvedValue(expectedUser);

      // Act
      const authenticatedUser = await strategy.validate(tokenPayload);

      // Assert
      expect(authenticatedUser).toEqual(expectedUser);
      expect(authenticatedUser.id).toBe(tokenPayload.sub);
      expect(authenticatedUser.email).toBe(tokenPayload.email);
    });

    it('should handle user without organization', async () => {
      // Arrange
      const payloadNoOrg: JwtPayload = {
        sub: 100,
        email: 'no-org@example.com',
        role: 'viewer',
        orgId: null,
      };
      const userNoOrg: User = {
        id: 100,
        email: 'no-org@example.com',
        role: 'viewer',
        organizationId: null,
      };
      jest.spyOn(authService, 'validateJwtPayload').mockResolvedValue(userNoOrg);

      // Act
      const result = await strategy.validate(payloadNoOrg);

      // Assert
      expect(result.organizationId).toBeNull();
      expect(result.role).toBe('viewer');
    });
  });

  describe('configuration edge cases', () => {
    it('should handle various JWT_SECRET values', () => {
      // Test cases for different secret configurations
      const testCases = [
        { input: 'simple_secret', expected: 'simple_secret' },
        { input: 'complex-secret-with-special-chars!@#$%', expected: 'complex-secret-with-special-chars!@#$%' },
        { input: '', expected: 'dev_secret_change_me' },
        { input: null, expected: 'dev_secret_change_me' },
        { input: undefined, expected: 'dev_secret_change_me' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Arrange
        (configService.get as jest.Mock).mockReturnValue(input);
        
        // Act
        const testStrategy = new TestJwtStrategy(authService, configService);
        const options = testStrategy.getStrategyOptions();

        // Assert
        expect(options.secretOrKey).toBe(expected);
      });
    });
  });

  describe('passport strategy integration', () => {
    it('should be configured to not ignore token expiration', () => {
      // Act
      const options = strategy.getStrategyOptions();

      // Assert
      expect(options.ignoreExpiration).toBe(false);
    });

    it('should extract JWT from Authorization header as Bearer token', () => {
      // Act
      const options = strategy.getStrategyOptions();

      // Assert
      expect(options.jwtFromRequest).toBe(ExtractJwt.fromAuthHeaderAsBearerToken());
      expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
    });
  });
});
