export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
    organizationId: number;
  };
}

export interface JwtPayload {
  sub: number;         // userId
  email: string;
  role: string;
  orgId: number;       // organizationId
}
