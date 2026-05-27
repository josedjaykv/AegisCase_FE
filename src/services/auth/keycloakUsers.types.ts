import type { Role } from '@/auth/permissions';

/**
 * A Keycloak user as seen through the gateway's lookup endpoint.
 * `provisioned` and `userServiceId` are computed server-side by joining
 * Keycloak's user list against user-service profiles.
 */
export interface KeycloakUser {
  sub: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Mapped Keycloak realm role. `null` if the user has no app role assigned. */
  role: Role | null;
  /** True if user-service already has a profile keyed by this `sub`. */
  provisioned: boolean;
  /** `users.id` in user-service if `provisioned`, else null. */
  userServiceId: string | null;
}

export interface KeycloakUsersSearchParams {
  search: string;
  page: number;
  limit: number;
}

export interface KeycloakUsersSearchResponse {
  data: KeycloakUser[];
  total: number;
  page: number;
  limit: number;
}
