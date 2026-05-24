# Phase 2 — Users module (ADMIN) and shared list/form patterns

**Status:** ⬜ Not started
**Duration estimate:** 3–4 days
**Dependencies:** Phase 1

## Objective

Users CRUD as the canonical "list + detail + form" pattern. Establishes `DataTable`, `PaginationBar`, RHF+Zod conventions, optimistic-update conventions.

## Deliverables

`/users`, `/users/new`, `/users/:id` working under ADMIN; non-ADMIN sees 403-safe fallback.

## Backend integrations

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`

## Success criteria

Pagination, validation errors (NestJS array format) map to RHF fields; 409 conflicts on `document` show inline.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — pagination, query keys, mutation invalidation
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §3 error handling (400 field errors → RHF `setError`, 409 inline)
- [`docs/architecture/dev-standards.md`](../../architecture/dev-standards.md) — TS strictness, naming, testing
- [`docs/design-system.md`](../../design-system.md) — List & Form archetypes (§10), badges for `role`
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — User admin workflow
- `BACKEND_INVESTIGATION_REPORT.md` §5.3 (user-service endpoints, DTOs, conflict cases)

## Implementation notes

- This phase establishes the **canonical patterns** reused by Cases / Evidence / Tasks / Involved later. Pay attention to:
  - `<DataTable>` (TanStack Table headless wrapper) in `components/data/`.
  - `<PaginationBar>` driven by URL search params (`?page=2`).
  - RHF + Zod schema co-located in `features/users/schemas/`.
  - Zod schemas mirror backend `class-validator` decorators 1:1.
- ADMIN-only route gating uses `<ProtectedRoute roles={['ADMIN']}>` + `<RoleGate>` for inline buttons.
- Backend returns 409 on duplicate `document` / `keycloakUserId` → render inline under the field, not as a toast.
