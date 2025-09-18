import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { JwtPayload } from '@rbac-workspace/data';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret_change_me',
    });
  }

  /**
   * Validate JWT payload and return user object
   * This method is called automatically when a JWT token is validated
   * @param payload - Decoded JWT payload
   * @returns User object that will be attached to request.user
   */
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
}