import { httpClient } from '@/services/http/client';
import type { Paginated } from '@/types/api';
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserDirectoryEntry,
  UsersListParams,
} from './users.types';

export const usersApi = {
  async list(params: UsersListParams): Promise<Paginated<User>> {
    const { data } = await httpClient.get<Paginated<User>>('/users', {
      params: { page: params.page, limit: params.limit },
    });
    return data;
  },

  async getById(id: string): Promise<User> {
    const { data } = await httpClient.get<User>(`/users/${id}`);
    return data;
  },

  async create(input: CreateUserInput): Promise<User> {
    const { data } = await httpClient.post<User>('/users', input);
    return data;
  },

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const { data } = await httpClient.put<User>(`/users/${id}`, input);
    return data;
  },

  /**
   * Resolve a batch of Keycloak `sub`s into the minimal display projection.
   * Backed by `GET /users/directory` (all-roles, PII-free). Returns only the
   * subs that have a local profile; unknown subs are silently omitted.
   */
  async getDirectory(subs: string[]): Promise<UserDirectoryEntry[]> {
    if (subs.length === 0) return [];
    const { data } = await httpClient.get<UserDirectoryEntry[]>('/users/directory', {
      params: { ids: subs.join(',') },
    });
    return data;
  },
};
