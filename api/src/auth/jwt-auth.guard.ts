import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determine if the request should be authenticated
   * @param context - Execution context
   * @returns Boolean or Promise<boolean> indicating if request is authorized
   */
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
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
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   * @param err - Authentication error
   * @param user - User object (if any)
   * @param info - Additional info
   * @returns User object or throws error
   */
  override handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw new UnauthorizedException('Invalid token or authentication failed');
    }
    return user;
  }
}