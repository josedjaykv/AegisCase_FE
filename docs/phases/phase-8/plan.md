# Phase 8 — Audit & activity feeds

**Status:** ⬜ Not started
**Duration estimate:** 4–5 days
**Dependencies:** Phases 3–7

## Objective

Searchable audit and per-entity timelines.

## Deliverables

`/audit` with filters (`entityType`, `entityId`, `userId`, `action`, date range), `/cases/:id/audit` and per-entity audit tabs, `<AuditFeed>` dashboard widget polling every 30 s.

## Backend integrations

- `GET /audit` (snake_case query params)
- `GET /audit/entity/:entityType/:entityId` (chronological, no pagination envelope)
- `GET /audit/user/:userId`
- `GET /audit/:id`

## Success criteria

Snake_case query mapping correct; `userId="system"` (overdue events) rendered as "System" not a UUID; filter by action name from the catalog enum.

## Required reading before starting

- `CLAUDE.md` (always — note the **always-on guardrail** about snake_case audit query params)
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — §6 the audit DTO mapper example is the template; §3 caching with 30 s refetch on audit feed
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Audit traversal patterns
- [`docs/design-system.md`](../../design-system.md) — Compact density default for audit list; `font-mono` for IDs / JSON; timeline visual treatment
- `BACKEND_INVESTIGATION_REPORT.md` §3.10, §5.9, §6.5 — audit entity, query/filter shape, action catalog

## Implementation notes

- The audit query DTO uses snake_case fields (`entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`, `action`). Translate at the boundary in `services/audit/audit.api.ts` — the rest of the app uses camelCase.
- `userId` can be the literal string `"system"` (for `task.overdue` events) — render it as "System" with a `Cog` icon, not as a UUID.
- `from_date` / `to_date` accept either `YYYY-MM-DD` or full ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`). Use `YYYY-MM-DD` from a date picker.
- `GET /audit/entity/:type/:id` returns chronological order (replay) and has **no** `page`/`limit` — paginate client-side if needed.
- Action enum filter values are the strings in the action map (e.g. `CASE_CREATED`, `EVIDENCE_CUSTODY_TRANSFERRED`, `TASK_OVERDUE`). Expose as a select with friendly labels.
- Each entity detail page already has an "Audit" tab placeholder from Phase 3 — fill it here using `GET /audit/entity/:type/:id` scoped to that entity.
- `<AuditFeed>` widget on the dashboard polls every 30 s with `from_date=<lastSeenIso>&limit=100` and merges by `eventId` for dedup.
