# Phase 3 — Cases module

**Status:** ⬜ Not started
**Duration estimate:** 5–7 days
**Dependencies:** Phase 2

## Objective

Core case CRUD, status transitions, archive, team management.

## Deliverables

`/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit`, `/cases/:id/team`. Status picker with closed-case ADMIN-only reopen guard. ADMIN-only archive action with double-confirm.

## Backend integrations

- `POST /cases`
- `GET /cases`
- `GET /cases/:id`
- `PUT /cases/:id`
- `PATCH /cases/:id/status`
- `PATCH /cases/:id/archive`
- `POST /cases/:id/team`
- `GET /cases/:id/team`

## Success criteria

Detective can drive a case from OPEN → UNDER_INVESTIGATION → CLOSED; admin can reopen; non-admin attempt to reopen is blocked client-side and shows the 403 if bypassed.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — caching strategy for `/cases` and `/cases/:id` (60 s refetch on detail)
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §4 permissions (case.archive, case.reopen guards), §5 `<ArchiveButton>`
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Investigation lifecycle, team management
- [`docs/design-system.md`](../../design-system.md) — §2 `CaseStatus` and `CasePriority` badge mappings; §10 Detail archetype with tabs
- `BACKEND_INVESTIGATION_REPORT.md` §5.4 (case-service endpoints, `case.created`/`case.closed`/`case.archived` events, "A closed case cannot be modified" rule)

## Implementation notes

- `caseCode` is auto-generated server-side (`CASE-<year>-<4 digits>`) — do not show a field for it in the create form.
- `GET /cases` does **not** include the `team` relation; only `GET /cases/:id` does. Plan the case-detail page accordingly.
- Closed-case modification returns 400 with the literal message — display inline ("A closed case cannot be modified").
- Reopen logic: status picker disables non-ADMIN choices when current status is `CLOSED`; backend 403s as a safety net.
- Archive: visible only to ADMIN; double-confirm dialog ("This permanently archives the case. Continue?"); soft-delete (no real delete in backend).
- Build the case-detail tab shell here (Overview · Evidence · Tasks · Involved · Audit · Media) even if some tabs render empty placeholders — Phases 4–8 fill them.
