# Phase 5 — Evidence module + chain-of-custody UX

**Status:** ⬜ Not started
**Duration estimate:** 5–7 days
**Dependencies:** Phase 3

## Objective

Most safety-critical module due to `GET /evidence/:id` side effect.

## Deliverables

`/cases/:id/evidence` list, evidence detail behind `EvidenceViewDialog`, COC timeline (`/evidence/:id/chain`), transfer custody dialog, ADMIN archive.

## Backend integrations

- `POST /evidence`
- `GET /evidence` (list, with `caseId?` filter)
- `GET /evidence/:id` ⚠️ **MUTATES** chain-of-custody
- `GET /evidence/:id/chain-of-custody` (read-only)
- `PUT /evidence/:id`
- `PATCH /evidence/:id/transfer-custody`
- `PATCH /evidence/:id/archive`

## Success criteria

Detail page **never** auto-fetches `/evidence/:id` without explicit user confirmation; COC timeline renders chronologically; transfer invalidates both evidence and COC queries.

## Required reading before starting

- `CLAUDE.md` (always — note the **always-on guardrail** about evidence view side effect)
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §5 `<EvidenceViewDialog>` is THE critical UX guard for this phase
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — `/evidence/:id` set to "manual fetch only"
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Evidence custody chain
- [`docs/design-system.md`](../../design-system.md) — §2 `EvidenceStatus` badges; `ShieldAlert` icon paired with the view-warning dialog
- `BACKEND_INVESTIGATION_REPORT.md` §3.6, §5.6, §6.2 — entity, endpoints, full workflow including the "view = take responsibility" pattern

## Implementation notes

- The evidence-detail route should **default to a read-only summary** assembled from the list payload + `GET /evidence/:id/chain-of-custody`. Only after the user confirms `<EvidenceViewDialog>` should the app issue `GET /evidence/:id`.
- The dialog copy: "Viewing this evidence will record you as the current custodian. Continue?". Confirm button uses `--warning` color.
- Transfer custody dialog: pick `newCustodianId` from a typeahead bound to `GET /users`; optional `transferReason` text field. On submit, invalidate `['evidence', 'detail', id]`, `['evidence', 'chain', id]`, `['evidence', 'list']`.
- Custody chain timeline: vertical, oldest first; pair `transferReason` with the user who triggered it and a relative timestamp ("3 days ago").
- ARCHIVED action is ADMIN-only via `<RoleGate>` + double-confirm; 409 if already archived.
- Note backend quirk: `PUT /evidence/:id` does **not** block archived evidence from being edited. The FE should still grey out the edit button when `archived: true` to avoid accidental edits.
