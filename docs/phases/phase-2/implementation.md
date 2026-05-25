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
