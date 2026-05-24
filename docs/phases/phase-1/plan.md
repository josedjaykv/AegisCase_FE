# Phase 1 — Auth, session, and role gating

**Status:** ⬜ Not started
**Duration estimate:** 3–4 days
**Dependencies:** Phase 0

## Objective

Implement `/login`, token storage, axios interceptors, `GET /auth/me`, `RoleGate`, `ProtectedRoute`, logout, refresh.

## Deliverables

Working login for all three roles; auto-logout on refresh failure; sidebar items hidden by role.

## Backend integrations

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/validate`

## Success criteria

All three roles can log in; access token refresh works transparently on 401; 403 from any backend route surfaces a clear toast.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/auth.md`](../../architecture/auth.md) — login flow, token lifecycle, refresh interceptor, role enforcement, stale-token edges
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — axios base config and interceptors
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §2 state management (auth store), §3 error handling, §4 permission model
- [`docs/architecture/folder-structure.md`](../../architecture/folder-structure.md) — `auth/`, `services/auth/`, `services/http/`
- [`docs/design-system.md`](../../design-system.md) — for the `/login` page (Form archetype) and Topbar user menu
- `BACKEND_INVESTIGATION_REPORT.md` §5.2 (auth-service endpoints) and §4 (auth/authz model)

## Implementation notes

- Replace the Phase 0 `setPreviewRole` stub in `useAuthStore` with real `login` / `logout` / `refresh` actions.
- Remove the "Preview role" selector from `Topbar` (it was dev-only scaffolding).
- Add `<ProtectedRoute roles={...}>` wrapping the AppShell tree; unauthenticated users redirect to `/login`.
- `httpClient` request interceptor injects `Authorization: Bearer <accessToken>`.
- `httpClient` response interceptor catches 401, queues parallel requests, calls `/auth/refresh`, retries once; on second failure, force logout.
- Mobile drawer for the Sidebar (deferred from Phase 0) lands here alongside the user menu.
