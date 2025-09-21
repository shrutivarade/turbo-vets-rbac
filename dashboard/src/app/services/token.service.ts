import { Injectable } from '@angular/core';
import { JwtPayload, TokenValidationResult } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly TOKEN_PREFIX = 'Bearer ';

  /**
   * Store JWT token in localStorage
   */
  setToken(token: string): void {
    if (token.startsWith(this.TOKEN_PREFIX)) {
      token = token.substring(this.TOKEN_PREFIX.length);
    }
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Retrieve JWT token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get token with Bearer prefix for HTTP headers
   */
  getTokenWithPrefix(): string | null {
    const token = this.getToken();
    return token ? `${this.TOKEN_PREFIX}${token}` : null;
  }

  /**
   * Remove token and user data from localStorage
   */
  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if token exists and is not expired
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const validation = this.validateToken(token);
    return validation.isValid && !validation.isExpired;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    const validation = this.validateToken(token);
    return validation.isExpired;
  }

  /**
   * Decode and validate JWT token
   */
  validateToken(token: string): TokenValidationResult {
    try {
      const payload = this.decodeToken(token);
      
      if (!payload) {
        return {
          isValid: false,
          isExpired: true,
          error: 'Invalid token format'
        };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;

      return {
        isValid: true,
        isExpired,
        payload: isExpired ? undefined : payload
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: true,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Decode JWT token payload
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      // Simple base64url decode
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as JwtPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    return payload ? new Date(payload.exp * 1000) : null;
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiration(): number {
    const expiration = this.getTokenExpiration();
    if (!expiration) {
      return 0;
    }

    const now = new Date();
    const diff = Math.floor((expiration.getTime() - now.getTime()) / 1000);
    return Math.max(0, diff);
  }

  /**
   * Check if token will expire soon (within specified minutes)
   */
  willExpireSoon(minutes: number = 5): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration();
    return timeUntilExpiration > 0 && timeUntilExpiration < (minutes * 60);
  }
}
