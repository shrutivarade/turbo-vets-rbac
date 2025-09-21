import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse } from '../models/auth.models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {
    // Initialize user from stored token
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored token
   */
  private initializeAuth(): void {
    const token = this.tokenService.getToken();
    if (token && this.tokenService.isTokenValid()) {
      const payload = this.tokenService.decodeToken(token);
      if (payload) {
        const user: User = {
          id: payload.sub,
          email: payload.email,
          role: payload.role as 'owner' | 'admin' | 'viewer',
          organizationId: payload.orgId
        };
        this.currentUserSubject.next(user);
      }
    }
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response: LoginResponse) => {
          // Store token and user data
          this.tokenService.setToken(response.access_token);
          this.currentUserSubject.next(response.user);
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => this.handleAuthError(error));
        })
      );
  }

  /**
   * Logout user and clear stored data
   */
  logout(): void {
    this.tokenService.removeToken();
    this.currentUserSubject.next(null);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenService.isTokenValid();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user as Observable
   */
  getCurrentUserObservable(): Observable<User | null> {
    return this.currentUser$;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Check if user can create tasks
   */
  canCreateTasks(): boolean {
    return this.hasAnyRole(['admin', 'owner']);
  }

  /**
   * Check if user can delete tasks
   */
  canDeleteTasks(): boolean {
    return this.hasRole('owner');
  }

  /**
   * Check if user can view audit logs
   */
  canViewAuditLogs(): boolean {
    return this.hasAnyRole(['admin', 'owner']);
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    return this.hasRole('owner');
  }

  /**
   * Check if user belongs to specific organization
   */
  belongsToOrganization(organizationId: number): boolean {
    const user = this.getCurrentUser();
    return user?.organizationId === organizationId;
  }

  /**
   * Refresh token (if needed in future)
   */
  refreshToken(): Observable<LoginResponse> {
    // This would typically call a refresh endpoint
    // For now, we'll just validate the current token
    if (this.isAuthenticated()) {
      const user = this.getCurrentUser();
      if (user) {
        return new Observable(observer => {
          observer.next({
            access_token: this.tokenService.getToken()!,
            user: user
          });
          observer.complete();
        });
      }
    }
    return throwError(() => new Error('No valid token to refresh'));
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.status === 401) {
      return 'Invalid email or password';
    }
    
    if (error.status === 403) {
      return 'Access denied';
    }
    
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your connection.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get user's organization ID
   */
  getOrganizationId(): number | null {
    const user = this.getCurrentUser();
    return user?.organizationId || null;
  }

  /**
   * Get user's role
   */
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Check if token will expire soon
   */
  isTokenExpiringSoon(): boolean {
    return this.tokenService.willExpireSoon();
  }

  /**
   * Get time until token expires
   */
  getTimeUntilExpiration(): number {
    return this.tokenService.getTimeUntilExpiration();
  }
}
