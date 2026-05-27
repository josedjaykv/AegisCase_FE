# Phase 2 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phase 1 (auth, session, role gating, AppShell)

This phase delivers the **Users module** (`/users`, `/users/new`, `/users/:id`) and establishes the canonical list / detail / form patterns reused by Cases, Evidence, Tasks and Involved later.

---

## What shipped

### Backend integrations (per `BACKEND_INVESTIGATION_REPORT.md` §5.3)

| Endpoint | Hook | Notes |
|---|---|---|
| `POST /users` | `useCreateUserMutation` | ADMIN only; 409 on `document`/`keycloakUserId` collision → inline field error |
| `GET /users` | `useUsersListQuery({ page, limit })` | `staleTime` 5 min, `gcTime` 10 min, `keepPreviousData` so pagination doesn't flash |
| `GET /users/:id` | `useUserQuery(id)` | Used by the detail/edit page |
| `PUT /users/:id` | `useUpdateUserMutation(id)` | `keycloakUserId` is not updatable (input is disabled in edit mode) |

All calls go through the shared `httpClient` (auth header, 401-refresh, 429/503 toasts already wired in Phase 1).

### New service module — `src/services/users/`

- `users.types.ts` — `User`, `CreateUserInput`, `UpdateUserInput`, `UsersListParams`.
- `users.api.ts` — typed axios wrappers (`list`, `getById`, `create`, `update`).
- `users.schemas.ts` — `CreateUserSchema`, `UpdateUserSchema` (Zod, mirrors backend `class-validator` 1:1: `@IsString @IsNotEmpty` → `.min(1)`, `@IsEnum(UserRole)` → `z.enum(ROLES)`, `@IsDateString` → `YYYY-MM-DD` regex).
- `users.queryKeys.ts` — hierarchical keys (`['users']`, `['users','list',params]`, `['users','detail',id]`).
- `users.queries.ts` — TanStack Query hooks with proper invalidation on mutation success.

### New shared UI primitives (shadcn-style) — `src/components/ui/`

- `table.tsx` — `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (tabular-nums, hover row, mobile horizontal scroll wrapper).
- `card.tsx` — `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `select.tsx` — accessible `Select` wrapping `@radix-ui/react-select`.
- `skeleton.tsx` — animated placeholder.

### New shared data components — `src/components/data/`

- `DataTable.tsx` — generic, headless wrapper around `@tanstack/react-table` (added as an approved dependency). Loading skeleton, empty state slot, optional row click, no per-feature styling overrides.
- `PaginationBar.tsx` — "Showing N–M of T · page X of Y · Prev/Next", URL-driven via the parent.
- `EmptyState.tsx` — neutral empty / no-results card with optional icon + action.

### New feature module — `src/features/users/`

- `pages/UserListPage.tsx` — list archetype: title + "New user" button, `DataTable` (Name, Document, Role, Created), `PaginationBar` driven by `?page=N` so deep links and back/forward work. Clicking a row navigates to detail.
- `pages/UserNewPage.tsx` — form archetype, centered `max-w-2xl`, breadcrumb back link.
- `pages/UserDetailPage.tsx` — same form archetype in edit mode (Keycloak ID disabled). Renders 404 message cleanly.
- `components/UserForm.tsx` — RHF + Zod, handles:
  - **400 with field array** → `form.setError(field, …)` per `services/http/errors.ts`'s `fieldErrors` grouping.
  - **409 conflict** → routed inline under `document` or `keycloakUserId` based on the server message (no toast, per architecture §3).
  - **401 / 403 / 5xx** → handled centrally by the axios interceptor / RoleGate.
- `components/RoleBadge.tsx` — `ADMIN`→primary, `DETECTIVE`→info, `ANALYST`→neutral (per `docs/design-system.md` §2).

### Routing

`src/app/routes.tsx` now nests the three user routes under a second `<ProtectedRoute roles={['ADMIN']}>`. Non-ADMIN visitors get the existing "You don't have permission" toast + redirect to `/` (the 403-safe fallback). The sidebar item is already role-filtered (Phase 1).

### Dependencies added

- `@tanstack/react-table` — listed in `docs/architecture/tech-stack.md` as the chosen table library.
- `@radix-ui/react-select` — needed for the accessible role picker; same family as the other Radix primitives shadcn ships.

No other libs added.

---

## Success criteria verification

| Criterion | Status |
|---|---|
| Pagination works (`?page=N` synced) | ✅ `PaginationBar` writes URL params; `keepPreviousData` keeps rows visible during page changes |
| 400 validation errors mapped to RHF fields | ✅ `UserForm` consumes `NormalizedApiError.fieldErrors` and calls `setError` |
| 409 conflicts on `document` show inline | ✅ Inline under the offending field, no toast |
| ADMIN-only access; non-ADMIN sees 403-safe fallback | ✅ Nested `<ProtectedRoute roles={['ADMIN']}>` + sidebar role filter |
| Lint / typecheck / tests / build all green | ✅ `npm run lint`, `npm run typecheck`, `npm run test:run` (8 passing), `npm run build` |

---

## Patterns established (reused in later phases)

1. **Service layout per microservice** (`*.api.ts`, `*.types.ts`, `*.schemas.ts`, `*.queryKeys.ts`, `*.queries.ts`) — already required by architecture §1, now demonstrated end-to-end.
2. **`DataTable` + `PaginationBar` + `EmptyState`** — used identically by `/cases`, `/tasks`, `/evidence`, `/involved`, `/audit` (phase 3+).
3. **URL search params drive pagination** — back/forward and deep-links Just Work.
4. **TanStack Query keys are hierarchical** — `qc.invalidateQueries({ queryKey: usersQueryKeys.lists() })` invalidates every page of every filter combination after a mutation.
5. **Error → RHF mapping** — `NormalizedApiError.fieldErrors` from `services/http/errors.ts` + `setError`; 409s show inline; toasts only for non-field errors.
6. **Form archetype** — `Card`-centered, `max-w-2xl`, sticky footer actions; breadcrumb back link above.

---

## Known limitations / out-of-scope

- The list has no client-side search/filter yet. Backend `GET /users` doesn't accept any filter param besides pagination, so we don't fake one. A search box can be added later if the backend grows the filter.
- No optimistic create/update yet — the user list re-fetches after mutation. Optimistic patterns will land in Phase 6 (Tasks/Kanban) where they actually move the needle.
- No bulk operations; the backend doesn't support them.

---

## Addendum — Keycloak ↔ user-service field-ownership policy (FE-only)

Added on top of the original Phase 2 scope to keep `user-service` consistent with Keycloak without backend changes.

### Policy in one sentence

Identity fields (`keycloakUserId`, `firstNames`, `lastNames`, `role`) **belong to Keycloak**; the FE may display them but never lets a human edit them through `<UserForm>`. The only local mutation path for `role` is a self-sync action that pulls the value down from `/auth/me`.

The full rationale, table of editable-vs-locked fields and acknowledged limitations are in [`docs/architecture/architecture.md` §4.7](../../architecture/architecture.md). A summary lives in `CLAUDE.md` "Always-on guardrails" so future phases honor it.

### Changes

1. **`UserForm.tsx`**
   - `mode === 'edit'` now **disables** `keycloakUserId`, `firstNames`, `lastNames` and `role`.
   - The PUT payload only contains `document`, `birthDate`, `jobTitle`. The Keycloak-owned fields are never sent on edit.
   - An inline info note explains the contract in both create and edit modes.

2. **`KeycloakSyncBanner.tsx`** (new, in `features/users/components/`)
   - Shown by `UserDetailPage` only when:
     - The loaded profile's `keycloakUserId === authUser.sub` (i.e., the admin is looking at their own profile), AND
     - The loaded profile's `role` differs from `authUser.role` (drift between user-service and Keycloak).
   - One-click `PUT /users/:id { role }` with the Keycloak-reported role. Toast confirms.

3. **No new endpoints, no new backend dependency.** The mutation goes through the same `useUpdateUserMutation` already in `services/users/users.queries.ts`.

### What this does NOT do (deferred, requires backend)

- **No Keycloak prefill on create.** The FE still cannot list Keycloak users (no gateway endpoint). The admin types `keycloakUserId`/names/role manually.
- **No drift detection for other users.** `/auth/me` is scoped to the caller; an admin viewing user X cannot pull X's Keycloak values down.
- **No name sync even for self.** `/auth/me` does not return `firstNames`/`lastNames`.

When the gateway grows a server-side sync endpoint (e.g. `POST /users/:id/sync`), the FE only needs to add a button — the field-ownership contract is already enforced.

---

## Addendum 2 — Keycloak user picker on create (requires backend endpoint)

### What changed in the FE

- New service module: `services/auth/keycloakUsers.{types,api,queries}.ts` with `useKeycloakUsersSearch({ search, page, limit })`. Standard `Paginated<KeycloakUser>` response with `provisioned` + `userServiceId` flags.
- New shared hook: `hooks/useDebouncedValue.ts` (300 ms by default; used by the picker).
- New component: `features/users/components/KeycloakUserPicker.tsx`. Search input + results list:
  - Matches by name / email / UUID (server-side).
  - Provisioned matches are rendered disabled with an "Open profile" link to `/users/<userServiceId>` — they cannot be selected.
  - Unprovisioned matches are selectable; selecting locks the identity portion of the form to the Keycloak values.
  - Empty results render the "Create the user in Keycloak first" guidance.
  - `404` from the endpoint says explicitly the backend has not shipped the route yet — no silent fallback to manual entry.
- `UserForm` refactor: split into `CreateUserForm` (picker + operational fields only) and `EditUserForm` (read-only Keycloak summary + operational fields). Schemas reduced to operational fields (`document`, `birthDate`, `jobTitle`); identity fields are no longer in form state at all.

### Endpoint contract assumed (lives in `docs/architecture/api-integration.md` §7)

```
GET /auth/keycloak-users?search=<q>&page=<n>&limit=<m>     (ADMIN only)

200 →
{
  data: [
    {
      sub: string,
      firstName: string,
      lastName: string,
      email: string,
      role: 'ADMIN' | 'DETECTIVE' | 'ANALYST' | null,
      provisioned: boolean,
      userServiceId: string | null
    },
    ...
  ],
  total: number, page: number, limit: number
}
```

Until the backend ships this route, `/users/new` shows a clear "endpoint not available" error from the picker. The rest of `/users` keeps working.

### Backend prompt (paste into your backend AI)

See [`docs/phases/phase-2/backend-prompt-keycloak-search.md`](./backend-prompt-keycloak-search.md).

### Full explainer

A standalone reference covering the shipped flow, the alternatives we weighed, and the required Keycloak service-account configuration (with reasoning) is in [`docs/phases/phase-2/keycloak-user-search.md`](./keycloak-user-search.md).

### Backend status

✅ Shipped. Response shape matches the contract above verbatim. Implementation chose option (b) (HTTP join via a new internal `GET /users/by-keycloak-ids` on `user-service`) because `auth-service` had no DB connection. Service-account uses client-credentials against the same confidential client; admin token is cached. Tests: 41 unit + 11 e2e covering 401/403/400/happy/provisioned-join/`role: null`/offset-math/503/`/auth/me` regression.

**Operational caveat** (flagged by backend): the route returns `503 Authentication service unavailable` until the `aegiscase-backend` Keycloak client's service account has `view-users` + `query-users` from `realm-management`. This is infra config — captured as a prerequisite in `manual-testing.md` §0.

### FE follow-up after backend shipped

- **Error-envelope nesting fix** — backend's `AllExceptionsFilter` wraps non-validation errors as `body.message.message` (string). The FE's `services/http/errors.ts` previously only handled `body.message` (string) and `body.message.message` (string[] = validation). Added a branch for the string case so that 503/business-400 messages surface verbatim instead of falling back to axios' generic `error.message`. `types/api.ts` `ApiErrorPayload` widened accordingly. No behavior change for routes that return a plain `body.message` string.
