# Feature 004 — Case ↔ involved-person link management

**Status:** ✅ Shipped
**Date:** 2026-05-29
**Phase:** 4 (Involved persons) — added on top of the shipped phase
**Scope:** Backend (3 endpoints) + Frontend (roster, picker filtering, edit, unlink)

## Summary

Four capabilities around the case ↔ person link:

1. The case-detail **Involved** tab now lists **who is linked to the case** (roster), not just a "link" button.
2. The link pickers **hide already-linked** items — a case the person already belongs to, or a person already on the case.
3. You can **unlink** a person from a case.
4. You can **edit** a person's **involvement type** on a case.

## Motivation (why)

After Phase 4 shipped, the case Involved tab could only offer "link a person" — it couldn't show the roster (no backend endpoint), couldn't edit an involvement type, and couldn't unlink (the join was effectively write-once). All four gaps are closed here.

## Backend changes (and why)

Three new routes on involved-service (full brief: [`../phases/phase-4/backend-prompt-case-involved-roster.md`](../phases/phase-4/backend-prompt-case-involved-roster.md)). **Final paths as delivered:**

| Route | Roles | Purpose |
|---|---|---|
| `GET /involved-persons/by-case/:caseId` | ADMIN, DETECTIVE, ANALYST | Roster of persons linked to a case, **with the person embedded** (`id, firstNames, lastNames, document`) — no N+1. Empty `[]`, not 404. |
| `PATCH /involved-persons/:id/cases/:caseId` | ADMIN, DETECTIVE | Edit the link's `involvementType` / `observations` (≥1 field; empty body → 400; idempotent). |
| `DELETE /involved-persons/:id/cases/:caseId` | ADMIN, DETECTIVE | Unlink (hard delete of the join row; person + case untouched; missing pair → 404). |

> ⚠️ The roster path is **`/involved-persons/by-case/:caseId`**, *not* `/cases/:id/involved` — `/cases/*` is reserved for case-service at the gateway. The FE service layer matches the delivered path.

What stayed **frontend-only** (no backend filtering): hiding already-linked cases/people in the pickers — see below.

## Frontend changes (and why)

### Service layer — `src/services/involved/`

| File | Change |
|------|--------|
| `involved.types.ts` | `CaseInvolvedPersonWithPerson` (roster row w/ embedded person), `UpdateCaseLinkInput`. |
| `involved.api.ts` | `getByCase(caseId)`, `updateLink(personId, caseId, input)`, `unlink(personId, caseId)`. |
| `involved.queryKeys.ts` | `byCase(caseId)` key. |
| `involved.queries.ts` | `useCaseInvolvedQuery`, `useUpdateCaseLinkMutation`, `useUnlinkMutation` — all invalidate the case roster (`byCase`), the person's `cases`, and the person `detail` on success. `useLinkInvolvedMutation` now also invalidates `byCase` so a new link shows on the case roster. |

### UI

| File | Change |
|------|--------|
| `features/involved/components/LinkActions.tsx` (new) | Shared inline controls for a link: an involvement-type `Select` (edit) + a trash button → `ConfirmDialog` (unlink). Used by both surfaces. |
| `features/involved/components/CaseInvolvedList.tsx` (new) | The case roster: person name + document (links to the person), observations, and — when manageable — `LinkActions` (ADMIN/DETECTIVE; falls back to a static badge for ANALYST). |
| `features/cases/pages/CaseDetailPage.tsx` | The **Involved** tab renders `CaseInvolvedList` (live roster) instead of the "no endpoint yet" placeholder. The **Link person** dialog gets `excludePersonIds` from the roster. Editing is disabled on archived cases (`manageable={!c.archived}`). |
| `features/involved/components/LinkToCaseDialog.tsx` | Pickers now hide already-linked items: **pick-case** excludes cases from the person's `GET /involved-persons/:id/cases`; **pick-person** excludes persons via the `excludePersonIds` prop (the case roster). |
| `features/involved/components/CaseLinksList.tsx` | The person's "Linked cases" list also exposes `LinkActions` (edit/unlink) per row for ADMIN/DETECTIVE, and now shows the **case title + code + status** (resolved via `useCaseSummaries`) instead of a raw `caseId`. |
| `services/cases/cases.queries.ts` | `useCaseSummaries(caseIds)` — batches per-id case fetches (via `useQueries`, reusing the detail cache) to resolve titles where only a `caseId` is available. |
| `features/involved/pages/InvolvedDetailPage.tsx` | Passes `personId` + `personLabel` so the linked-cases list can edit/unlink. |

### Why the "hide already-linked" filters are frontend-only

The data needed to filter already exists client-side: the person's links (`GET /involved-persons/:id/cases`) for the case picker, and the case roster (the new `by-case` endpoint) for the person picker. Filtering in the FE avoids adding query params to `GET /cases` / `GET /involved-persons` (which live in different services) and keeps those list contracts clean.

## Behavior / rules

| Action | UI | Backend |
|--------|----|---------|
| Edit involvement type | Inline `Select` on a roster/link row (ADMIN/DETECTIVE); same value = no-op | `PATCH …` 200 |
| Unlink | Trash → confirm dialog (destructive, re-linkable) | `DELETE …` 200; missing → 404 |
| Already-linked case | Hidden from the "Link to a case" picker | — (FE filter) |
| Already-linked person | Hidden from the "Link person" picker | — (FE filter) |
| Archived case | Roster is read-only (no edit/unlink, no link button) | mutations still gated server-side |
| ANALYST | Static badges only, no controls | 403 on mutations |

## How to test

Manual steps in [`../phases/phase-4/manual-testing.md`](../phases/phase-4/manual-testing.md) §11–§14: roster appears on the case Involved tab; editing the involvement type; unlinking with confirm; and confirming already-linked items disappear from both pickers.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Related docs

- Backend brief: [`../phases/phase-4/backend-prompt-case-involved-roster.md`](../phases/phase-4/backend-prompt-case-involved-roster.md)
- Phase 4 implementation report: [`../phases/phase-4/implementation.md`](../phases/phase-4/implementation.md)
