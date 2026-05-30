# Feature 006 — Tasks board: case & assignee filters + create-with-case

**Status:** ✅ Shipped
**Date:** 2026-05-30
**Phase:** 6 (Tasks)
**Scope:** Frontend only (backend already supported everything)

## Summary

On the global Tasks board (`/tasks`):

1. **Filter by case** — a case selector narrows the board to one case (server-side `GET /tasks?caseId=`).
2. **Filter by assignee** — a selector lists the users who actually have tasks in view (resolved to names), filtering the board to one assignee.
3. **Create a task from the board, choosing any case** — a **New task** button opens the form with a **case picker** (plus the existing assignee/priority/due-date fields).

No backend changes were needed: `GET /tasks` already accepts `caseId` and `assignedToUserId`, and `POST /tasks` takes `caseId` in the body.

## Motivation (why)

The board could only be narrowed by priority / "mine" / overdue, and tasks could only be created from inside a case (`/cases/:id/tasks/new`). Investigators working across cases needed to slice the board by case or person and to add a task to any case without first navigating into it.

## Changes

| File | Change |
|------|--------|
| `features/cases/components/CaseSelect.tsx` (new) | Reusable case chooser backed by `GET /cases` (readable by all roles). `allowAll` adds an "All cases" option for filters; without it, it's a required picker for the form. Lists up to 100 cases (`code · title`). |
| `features/tasks/components/TasksView.tsx` | Added a **case filter** (only on the global board; the case-scoped board fixes `caseId`) passed **server-side** to the query, and an **assignee filter** whose options derive from the fetched set and are resolved to names via `/users/directory` (works for every role — no admin-only user-search needed). Replaced the "Assigned to me" toggle with the assignee selector (which surfaces a "Me (…)" option when you have tasks). |
| `features/tasks/components/TaskForm.tsx` | In create mode **without** a fixed `caseId`, renders the `CaseSelect` as a required **Case** field; submit uses the picked case. With a fixed `caseId` (from a case context) it behaves as before. |
| `features/tasks/pages/TasksPage.tsx` | Added a **New task** button (ADMIN/DETECTIVE) → `/tasks/new`. |
| `app/routes.tsx` | New `/tasks/new` route (ADMIN/DETECTIVE) — `TaskNewPage` already renders the case picker when there's no `:id`. |

## Design notes

- **Case filter is server-side** (`caseId` query param) so it's correct at any volume — the same reasoning as the case-scoped board.
- **Assignee filter is client-side**, intentionally: its options come from the assignees present in the fetched tasks (resolved via `/users/directory`, which all roles can call). A server-side assignee filter would shrink its own option list after selection (confusing), and the only user-*search* endpoint (`/auth/keycloak-users`) is ADMIN-only — so deriving options from the data is the only approach that works for DETECTIVE/ANALYST too.
- **Create-with-case** reuses `CaseSelect`; the case-scoped create flow is unchanged (case stays fixed, no picker).

## How to test

See `docs/phases/phase-6/manual-testing.md` §19–§21: filter the board by case, by assignee, and create a task from `/tasks/new` choosing a case.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- `CaseSelect` lists the first 100 cases via a plain `Select` (no search). Fine for current scale; a searchable combobox can replace it later.
- The assignee filter operates over the fetched page (`limit: 100`); combine it with the case filter to scope precisely on very large datasets.
