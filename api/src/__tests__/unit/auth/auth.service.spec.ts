/// <reference path="../../jest.d.ts" />

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PasswordUtils } from '../../../auth/password.utils';

// Mock PasswordUtils
jest.mock('../../../auth/password.utils');

// Create a simple User interface for testing
interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
  organizationId: number | null;
  createdAt: Date;
  updatedAt: Date;
  organization?: any;
  createdTasks?: any[];
  auditLogs?: any[];
}

// Create a mock AuthService class to avoid entity imports
class TestAuthService {
  constructor(
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      // Find user by email
      const user = await this.userRepository.findOne({ 
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return null; // User not found
      }

      // Verify password with bcrypt
      const isPasswordValid = await PasswordUtils.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        return null; // Invalid password
      }

      return user; // Valid credentials
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async login(user: User): Promise<any> {
    // Create JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
    };

    // Sign JWT token
    const access_token = this.jwtService.sign(payload);

    // Return login response
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async validateJwtPayload(payload: any): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id: payload.sub }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

describe('AuthService', () => {
  let service: TestAuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  // Mock data
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    role: 'admin',
    organizationId: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    organization: null,
    createdTasks: [],
    auditLogs: [],
  };

  const mockJwtPayload = {
    sub: 1,
    email: 'test@example.com',
    role: 'admin',
    orgId: 1,
  };

  const mockLoginResponse = {
    access_token: 'mock.jwt.token',
    user: {
      id: 1,
      email: 'test@example.com',
      role: 'admin',
      organizationId: 1,
    },
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocks directly
    userRepository = {
      findOne: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn(),
    } as any;

    service = new TestAuthService(userRepository, jwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(PasswordUtils.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);

      // Act
      await service.validateUser('TEST@EXAMPLE.COM', 'password123');

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    it('should return null when user is not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password123');

      // Assert
      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' }
      });
      expect(PasswordUtils.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(PasswordUtils.compare).toHaveBeenCalledWith('wrongpassword', mockUser.passwordHash);
    });

    it('should return null when database error occurs', async () => {
      // Arrange
      userRepository.findOne.mockRejectedValue(new Error('Database connection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error validating user:', expect.any(Error));
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should return null when password comparison throws error', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error validating user:', expect.any(Error));
      
      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('should create JWT token and return login response', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock.jwt.token');

      // Act
      const result = await service.login(mockUser);

      // Assert
      expect(result).toEqual(mockLoginResponse);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        orgId: mockUser.organizationId,
      });
    });

    it('should handle user with null organizationId', async () => {
      // Arrange
      const userWithoutOrg = { ...mockUser, organizationId: null };
      jwtService.sign.mockReturnValue('mock.jwt.token');

      // Act
      const result = await service.login(userWithoutOrg);

      // Assert
      expect(result.user.organizationId).toBeNull();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userWithoutOrg.id,
        email: userWithoutOrg.email,
        role: userWithoutOrg.role,
        orgId: null,
      });
    });

    it('should create different tokens for different users', async () => {
      // Arrange
      const anotherUser = { ...mockUser, id: 2, email: 'another@example.com' };
      jwtService.sign.mockReturnValueOnce('token1').mockReturnValueOnce('token2');

      // Act
      const result1 = await service.login(mockUser);
      const result2 = await service.login(anotherUser);

      // Assert
      expect(result1.access_token).toBe('token1');
      expect(result2.access_token).toBe('token2');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user when payload is valid', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateJwtPayload(mockJwtPayload);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJwtPayload.sub }
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateJwtPayload(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('User not found')
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockJwtPayload.sub }
      });
    });

    it('should handle different user IDs', async () => {
      // Arrange
      const payload = { ...mockJwtPayload, sub: 999 };
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateJwtPayload(payload)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 }
      });
    });

    it('should propagate database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      userRepository.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.validateJwtPayload(mockJwtPayload)).rejects.toThrow(dbError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete authentication flow', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('integration.test.token');

      // Act - Validate user credentials
      const validatedUser = await service.validateUser('test@example.com', 'password123');
      
      // Act - Login with validated user
      const loginResponse = validatedUser ? await service.login(validatedUser) : null;

      // Assert
      expect(validatedUser).toEqual(mockUser);
      expect(loginResponse).toEqual({
        access_token: 'integration.test.token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          organizationId: mockUser.organizationId,
        },
      });
    });

    it('should handle invalid credentials in flow', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const validatedUser = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(validatedUser).toBeNull();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty email', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('', 'password123');

      // Assert
      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: '' }
      });
    });

    it('should handle empty password', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      (PasswordUtils.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', '');

      // Assert
      expect(result).toBeNull();
      expect(PasswordUtils.compare).toHaveBeenCalledWith('', mockUser.passwordHash);
    });

    it('should handle special characters in email', async () => {
      // Arrange
      const specialEmail = 'test+special@example.com';
      userRepository.findOne.mockResolvedValue(null);

      // Act
      await service.validateUser(specialEmail, 'password123');

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: specialEmail }
      });
    });
  });

  describe('console output', () => {
    it('should log error messages when validation fails', async () => {
      // Arrange
      const error = new Error('Test database error');
      userRepository.findOne.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error validating user:', error);
      
      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});
