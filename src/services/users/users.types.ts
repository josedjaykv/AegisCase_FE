import type { Role } from '@/auth/permissions';

export interface User {
  id: string;
  keycloakUserId: string;
  firstNames: string;
  lastNames: string;
  document: string;
  birthDate?: string | null;
  role: Role;
  jobTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  keycloakUserId: string;
  firstNames: string;
  lastNames: string;
  document: string;
  birthDate?: string;
  role: Role;
  jobTitle?: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'keycloakUserId'>>;

export interface UsersListParams {
  page: number;
  limit: number;
}
