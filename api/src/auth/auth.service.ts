import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import type { LoginResponseDto, JwtPayload } from '@rbac-workspace/data';
import { PasswordUtils } from './password.utils';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials
   * @param email - User email
   * @param password - Plain text password
   * @returns User object if valid, null if invalid
   */
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

  /**
   * Create JWT token for authenticated user
   * @param user - Authenticated user
   * @returns Login response with JWT token
   */
  async login(user: User): Promise<LoginResponseDto> {
    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,                    // Subject (user ID)
      email: user.email,               // User email
      role: user.role,                 // User role for RBAC
      orgId: user.organizationId,      // Organization for scoping
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

  /**
   * Validate JWT payload and return user
   * @param payload - JWT payload
   * @returns User object for request context
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id: payload.sub }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}