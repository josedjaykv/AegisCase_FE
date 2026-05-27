import { httpClient } from '@/services/http/client';
import type {
  KeycloakUsersSearchParams,
  KeycloakUsersSearchResponse,
} from './keycloakUsers.types';

export const keycloakUsersApi = {
  async search(params: KeycloakUsersSearchParams): Promise<KeycloakUsersSearchResponse> {
    const { data } = await httpClient.get<KeycloakUsersSearchResponse>(
      '/auth/keycloak-users',
      {
        params: {
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    return data;
  },
};
