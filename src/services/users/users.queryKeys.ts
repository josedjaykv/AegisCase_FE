import type { UsersListParams } from './users.types';

export const usersQueryKeys = {
  all: ['users'] as const,
  lists: () => [...usersQueryKeys.all, 'list'] as const,
  list: (params: UsersListParams) => [...usersQueryKeys.lists(), params] as const,
  details: () => [...usersQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersQueryKeys.details(), id] as const,
  /** Sorted to stay cache-stable across consumers that pass the same subs in different order. */
  directory: (subs: readonly string[]) => [...usersQueryKeys.all, 'directory', subs] as const,
};
