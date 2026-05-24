# Authentication & Authorization

> Originally §5 of CLAUDE.md. Load this doc when working on Phase 1 or any feature that touches login, token refresh, role detection, or logout.

## 1. Login flow

1. User enters email + password on `/login`.
2. `POST /auth/login` → `{ access_token, refresh_token, token_type, expires_in, refresh_expires_in }`.
3. Tokens go into `useAuthStore`. Refresh token also into `sessionStorage` (for tab restore).
4. `GET /auth/me` resolves `{ sub, email, role, keycloak_user_id }` → stored as `user`.
5. Redirect to `/dashboard` (role-specific dashboard).

## 2. Token lifecycle

- **Access token** — kept in memory only; attached as `Authorization: Bearer …` by axios request interceptor.
- **Refresh** — axios response interceptor catches `401`, queues parallel requests, calls `POST /auth/refresh`, retries the original request once. If refresh fails (Keycloak returns 401), force logout.
- **Logout** — `POST /auth/logout { refresh_token }` (the endpoint is `@Public()` — works with expired access token), then clear stores + storage, redirect to `/login`.
- **Tab visibility** — when the tab regains focus and the access token is within 30s of expiry, proactively refresh.

## 3. Role enforcement

- Role is read from `GET /auth/me`. We **do not parse the JWT for role** (the backend already does the `realm_access.roles → domain role` mapping; doing it client-side risks drift).
- `RoleGate` and `usePermissions().can(action)` enforce UI gating.
- Route-level: a `<ProtectedRoute roles={...}>` wrapper redirects unauthorized users to `/dashboard` or `/login`.

## 4. Stale-token edge cases

- If the user is logged in but the underlying Keycloak user was deactivated, the next refresh returns 401 → forced logout.
- The 503 (Keycloak unavailable) shows a banner; do **not** auto-retry refresh aggressively (it counts against the auth rate limit of 20/60s).
