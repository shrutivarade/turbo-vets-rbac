export interface User {
  id: number;
  email: string;
  role: 'owner' | 'admin' | 'viewer';
  organizationId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
  orgId: number;
  iat: number;
  exp: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  payload?: JwtPayload;
  error?: string;
}
