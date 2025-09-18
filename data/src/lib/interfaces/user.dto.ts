import { Role } from '../enums/role.enum.js';

export interface UserDto {
  id: number;
  email: string;
  role: Role;
  organizationId: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  role: Role;
  organizationId: number;
}

export interface UpdateUserDto {
  email?: string;
  role?: Role;
}
