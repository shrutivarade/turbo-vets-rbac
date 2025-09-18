import { Controller, Post, Body, Get, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto, LoginResponseDto } from '@rbac-workspace/data';

/**
 * Authentication Controller
 * 
 * Handles user authentication and JWT token generation for the Secure Task Management System.
 * All endpoints in this controller are public and do not require authentication.
 * 
 * @security No authentication required (public endpoints)
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authentication Health Check
   * 
   * @route GET /auth/test
   * @description Simple health check endpoint to verify authentication routes are working
   * @access Public (no authentication required)
   * @returns {Object} Simple status message with timestamp
   * 
   * @example
   * GET /auth/test
   * Response: { "message": "Auth routes working!", "timestamp": "2025-09-18T19:45:15.099Z" }
   */
  @Get('test')
  test() {
    return { message: 'Auth routes working!', timestamp: new Date().toISOString() };
  }

  /**
   * User Login Endpoint
   * 
   * @route POST /auth/login
   * @description Authenticates user credentials and returns JWT token with user context
   * @access Public (no authentication required)
   * @param {LoginDto} loginDto - User credentials (email and password)
   * @returns {LoginResponseDto} JWT access token and user information
   * @throws {BadRequestException} When email or password is missing
   * @throws {UnauthorizedException} When credentials are invalid
   * 
   * @example
   * POST /auth/login
   * Body: { "email": "owner@techcorp.com", "password": "owner123" }
   * Response: { 
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": { "id": 1, "email": "owner@techcorp.com", "role": "owner", "organizationId": 1 }
   * }
   * 
   * @example
   * POST /auth/login
   * Body: { "email": "admin@techcorp.com", "password": "admin123" }
   * Response: { 
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": { "id": 2, "email": "admin@techcorp.com", "role": "admin", "organizationId": 1 }
   * }
   * 
   * @example
   * POST /auth/login
   * Body: { "email": "viewer@techcorp.com", "password": "viewer123" }
   * Response: { 
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": { "id": 3, "email": "viewer@techcorp.com", "role": "viewer", "organizationId": 1 }
   * }
   */
  @Post('login')
  async login(@Body() loginDto: any): Promise<any> {
    try {
      // Basic validation
      if (!loginDto.email || !loginDto.password) {
        throw new BadRequestException('Email and password are required');
      }

      console.log('Login attempt:', loginDto.email);

      // Validate user credentials
      const user = await this.authService.validateUser(
        loginDto.email, 
        loginDto.password
      );

      console.log('User validation result:', user ? 'FOUND' : 'NOT_FOUND');

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT token and return response
      const result = await this.authService.login(user);
      console.log('Login successful for:', loginDto.email);
      return result;
    } catch (error: any) {
      console.error('Login error:', error.message);
      throw error;
    }
  }
}