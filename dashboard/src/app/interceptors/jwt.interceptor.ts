import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private tokenService: TokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding token for login requests and public endpoints
    if (this.isPublicEndpoint(req.url)) {
      console.log('JWT Interceptor: Skipping public endpoint:', req.url);
      return next.handle(req);
    }

    // Get the token
    const token = this.tokenService.getToken();
    const isExpired = this.tokenService.isTokenExpired();
    
    console.log('JWT Interceptor:', {
      url: req.url,
      hasToken: !!token,
      isExpired: isExpired
    });
    
    if (token && !isExpired) {
      // Clone the request and add the Authorization header
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('JWT Interceptor: Adding Authorization header');
      return next.handle(authReq);
    }
    
    console.log('JWT Interceptor: No valid token, proceeding without auth');
    // If no valid token, proceed with original request
    return next.handle(req);
  }

  /**
   * Check if the endpoint is public and doesn't require authentication
   */
  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/auth/login',
      '/api/auth/login',
      '/api/auth/test',
      '/api/auth',
      '/api/health',  // Specific health check endpoint
    ];

    return publicEndpoints.some(endpoint => 
      url.includes(endpoint) || url.endsWith(endpoint)
    );
  }
}
