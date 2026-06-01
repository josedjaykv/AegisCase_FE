# Feature 011 — Read-only evidence summary on reload / deep-link

**Status:** ✅ Shipped (FE) · ⏳ needs backend endpoint
**Date:** 2026-05-31
**Phase:** 5 (Evidence)
**Scope:** Frontend + backend (coordinated)

## Summary

Opening `/evidence/:id` directly (page reload or a shared deep-link) used to show *"A read-only
summary isn't cached for this item…"* with no details. The FE now falls back to a **read-only**
single-evidence endpoint (`GET /evidence/:id/summary`) — which has **no custody side effect** —
to populate the detail and edit pages. It only fires when nothing is in cache, and degrades
gracefully (shows the old message) until the backend ships the endpoint.

## Why this happened (root cause)

`GET /evidence/:id` **mutates** (records the viewer as custodian + adds a chain-of-custody row), so
the FE never calls it automatically. The detail page derives its read-only summary from a **cached
list** query instead. On a fresh load/deep-link there is no cached list and no "viewed" record, so
`viewed ?? cached` is `undefined` → the placeholder message. There was **no read-only single-GET**
to fall back to. This was expected given the guardrail, but a poor experience for reloads/deep-links.

## Backend changes (required — not yet shipped)

`GET /evidence/:id/summary` — returns the `Evidence` summary (same fields as the list), **no**
custody mutation, no chain row, no events; `404` when missing; readable by all three roles. Full
contract + acceptance criteria:
[`../phases/phase-5/backend-prompt-evidence-readonly-summary.md`](../phases/phase-5/backend-prompt-evidence-readonly-summary.md).

## Frontend changes

| File | Change |
|------|--------|
| `services/evidence/evidence.api.ts` | `getSummary(id)` → `GET /evidence/:id/summary` (read-only). |
| `services/evidence/evidence.queryKeys.ts` | New `summary(id)` key (distinct from the mutating `detail`). |
| `services/evidence/evidence.queries.ts` | `useEvidenceSummaryQuery(id, enabled)` — auto-fetch safe, `retry: false` so a 404 (before backend ships) falls back without hammering. |
| `features/evidence/pages/EvidenceDetailPage.tsx` | `e = viewed ?? cached ?? summaryQuery.data`; summary only fetched when nothing is cached; a "Loading summary…" state while it resolves. |
| `features/evidence/pages/EvidenceEditPage.tsx` | Same fallback so editing works after a reload too. |

## Design notes

- **Guardrail preserved:** the mutating `GET /evidence/:id` is still never auto-called. The new
  summary query hits a **separate, side-effect-free** endpoint.
- **Only fires when needed:** `enabled: !viewed && !cached`, so navigating from a list (cache warm)
  makes no extra request.
- **Graceful before backend:** `retry: false`; on 404 the page shows the original "summary not
  cached" message, exactly as today — no regression.

## How to test

1. Open a case → evidence list → an item → details render (from list cache). ✅ unchanged.
2. **Reload** `/evidence/:id` (or open it in a new tab). Before backend: brief "Loading summary…",
   then the "not cached" message (graceful). After backend ships `…/summary`: the read-only summary
   loads — **without** recording you as custodian (verify the chain of custody gains no
   "Viewed by user" row).
3. Reload `/evidence/:id/edit` as the custodian → the form loads from the summary fallback.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- Until the backend ships `GET /evidence/:id/summary`, reload/deep-link still shows the placeholder
  message (no regression, just no fix yet).
