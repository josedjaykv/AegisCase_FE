import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { keycloakUsersApi } from './keycloakUsers.api';
import type { KeycloakUsersSearchParams } from './keycloakUsers.types';

export const keycloakUsersQueryKeys = {
  all: ['keycloakUsers'] as const,
  search: (params: KeycloakUsersSearchParams) =>
    [...keycloakUsersQueryKeys.all, 'search', params] as const,
};

const THIRTY_SEC = 30_000;
const TWO_MIN = 120_000;

export function useKeycloakUsersSearch(params: KeycloakUsersSearchParams, enabled = true) {
  return useQuery({
    queryKey: keycloakUsersQueryKeys.search(params),
    queryFn: () => keycloakUsersApi.search(params),
    enabled,
    staleTime: THIRTY_SEC,
    gcTime: TWO_MIN,
    placeholderData: keepPreviousData,
  });
}
