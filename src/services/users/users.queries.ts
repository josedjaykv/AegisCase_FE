import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { usersApi } from './users.api';
import { usersQueryKeys } from './users.queryKeys';
import type {
  CreateUserInput,
  UpdateUserInput,
  UsersListParams,
} from './users.types';

const FIVE_MIN = 1000 * 60 * 5;
const TEN_MIN = 1000 * 60 * 10;

export function useUsersListQuery(params: UsersListParams) {
  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: () => usersApi.list(params),
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    placeholderData: keepPreviousData,
  });
}

export function useUserQuery(id: string | undefined) {
  return useQuery({
    queryKey: usersQueryKeys.detail(id ?? ''),
    queryFn: () => usersApi.getById(id as string),
    enabled: !!id,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
  });
}

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.lists() });
      qc.setQueryData(usersQueryKeys.detail(user.id), user);
    },
  });
}

/**
 * Resolve a batch of Keycloak subs into display names. Open to every
 * authenticated role (backend `/users/directory`). Returns a `displayName(sub)`
 * helper that falls back to `null` when the sub is unknown — consumers should
 * render the raw sub in that case so the UI never blanks out.
 */
export function useDisplayNames(subs: string[]) {
  // Dedupe + sort so two callers passing the same subs in different orders
  // share one cache entry.
  const stable = useMemo(
    () => Array.from(new Set(subs.filter(Boolean))).sort(),
    // join is cheap and stable for string arrays; this avoids stale closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subs.join('|')],
  );

  const query = useQuery({
    queryKey: usersQueryKeys.directory(stable),
    queryFn: () => usersApi.getDirectory(stable),
    enabled: stable.length > 0,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
  });

  const byId = useMemo(() => {
    const m = new Map<string, string>();
    query.data?.forEach((e) => m.set(e.keycloakUserId, `${e.firstNames} ${e.lastNames}`.trim()));
    return m;
  }, [query.data]);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    displayName: (sub: string): string | null => byId.get(sub) ?? null,
  };
}

export function useUpdateUserMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersApi.update(id, input),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: usersQueryKeys.lists() });
      qc.setQueryData(usersQueryKeys.detail(id), user);
    },
  });
}
