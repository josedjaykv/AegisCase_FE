# Phase 4 — Involved persons module

**Status:** ⬜ Not started
**Duration estimate:** 3–4 days
**Dependencies:** Phase 3

## Objective

Person registry and linking to cases.

## Deliverables

`/involved`, `/involved/:id`, link dialog from a case page, `/cases/:id/involved` tab.

## Backend integrations

- `POST /involved-persons`
- `GET /involved-persons`
- `GET /involved-persons/:id`
- `PUT /involved-persons/:id`
- `GET /involved-persons/:id/cases`
- `POST /involved-persons/:id/cases/:caseId`

## Success criteria

Linking respects involvement type enum; 409 (already linked) surfaces gracefully; client-side caseId pre-check (because backend does not validate it).

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md)
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §3 error handling (409 toast)
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Involved persons flow
- [`docs/design-system.md`](../../design-system.md) — §2 `InvolvementType` badge mapping (VICTIM info, SUSPECT destructive, WITNESS warning, OTHER muted)
- `BACKEND_INVESTIGATION_REPORT.md` §5.5 (involved-service)

## Implementation notes

- **caseId is NOT validated by the backend** when linking — the FE must call `GET /cases/:caseId` first to confirm the case exists, or pre-populate the case selector from a search/typeahead bound to `GET /cases`.
- `document` is unique sparse (only when set) — 409 on conflict.
- No "unlink" endpoint exists; once linked, the link can only be edited via direct DB intervention — the UI must not offer unlink.
- Link-to-case dialog is reachable from two places: person detail page and case detail page (Involved tab); reuse the same component.
