# Phase 5 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phase 3 (cases module, DataTable/cards pattern, dialogs, Detail tab shell, `useDisplayNames`, `KeycloakUserPicker`)

Phase 5 delivers the **Evidence module + chain-of-custody UX** — the most safety-critical module, because `GET /evidence/:id` mutates the chain of custody and reassigns custody to the viewer.

---

## The central safety guarantee

> **The detail page never auto-fetches `GET /evidence/:id`.**

This is enforced structurally, not by discipline:

- The side-effecting read is modeled as a **mutation** (`useViewEvidenceMutation`), so it physically cannot run during a component render — only an explicit user action can call `mutateAsync`.
- The only caller is `<EvidenceViewDialog>` (warning copy + `ShieldAlert` + `--warning` confirm button).
- The detail page assembles a **read-only summary** from cache (`readEvidenceFromCache`, scanning cached list pages — no network) and renders the **read-only** chain via `GET /evidence/:id/chain-of-custody` (safe). The full record (with `custodyChain`) only appears after the user confirms the dialog.
- `useViewedEvidence` is a disabled query that only ever reads the cache the mutation seeds — it never fetches.

## Routes

| Route | Roles (FE gate) | Page |
|---|---|---|
| `/evidence` | all authed | `EvidenceListPage` (global list; makes the existing nav item live) |
| `/cases/:id/evidence` | all authed | `CaseEvidenceListPage` (case-scoped, paginated) |
| `/cases/:id/evidence/new` | ADMIN, DETECTIVE | `EvidenceNewPage` |
| `/evidence/:id` | all authed | `EvidenceDetailPage` (read-only by default) |
| `/evidence/:id/edit` | ADMIN, DETECTIVE | `EvidenceEditPage` |
| `/evidence/:id/chain` | all authed | `EvidenceChainPage` (read-only COC timeline) |

The case-detail **Evidence tab** is now live (embeds `EvidenceList` for the case + Register/View-all).

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §5.6, §6.2)

| Endpoint | Hook | Notes |
|---|---|---|
| `GET /evidence` (+ `caseId?`) | `useEvidenceListQuery` | `staleTime` 30 s, `keepPreviousData`; no `custodyChain` |
| `GET /evidence/:id` ⚠️ | `useViewEvidenceMutation` | **mutation only**, behind the dialog |
| `GET /evidence/:id/chain-of-custody` | `useEvidenceChainQuery` | read-only, **safe**; polls 60 s on detail/chain pages |
| `POST /evidence` | `useCreateEvidenceMutation` | invalidates lists |
| `PUT /evidence/:id` | `useUpdateEvidenceMutation` | edit type/description |
| `PATCH /evidence/:id/transfer-custody` | `useTransferCustodyMutation` | invalidates detail + chain + lists |
| `PATCH /evidence/:id/archive` | `useArchiveEvidenceMutation` | ADMIN only; 409 if already archived |

## New service module — `src/services/evidence/`

`evidence.types.ts` (enums `EvidenceType`/`EvidenceStatus`, `Evidence`, `ChainOfCustody`, inputs), `evidence.api.ts` (the side-effecting reader is named `viewWithSideEffect` with a loud comment), `evidence.queryKeys.ts` (`list`/`detail`/`chain`), `evidence.queries.ts`, `evidence.schemas.ts`.

## New feature module — `src/features/evidence/`

- `pages/` — global list, case list, new, detail, edit, chain.
- `components/EvidenceViewDialog.tsx` — **the** critical guard.
- `components/CustodyChainTimeline.tsx` — vertical, oldest-first; resolves custodian subs to names (`useDisplayNames`); relative timestamps via a new native `lib/date.ts` (`Intl.RelativeTimeFormat`, no dependency).
- `components/TransferCustodyDialog.tsx` — `KeycloakUserPicker` (assign) + optional reason.
- `components/EvidenceForm.tsx` — create (caseId fixed, optional initial custodian) / edit (type + description).
- `components/EvidenceArchiveButton.tsx` — ADMIN, double-confirm (type `ARCHIVE`).
- `components/EvidenceList.tsx` + `EvidenceCard.tsx` — table on `md+`, cards on mobile (feature-003 pattern).
- `components/EvidenceBadges.tsx` — `EvidenceStatus` tones from design-system §2 (REGISTERED info · IN_CUSTODY primary · TRANSFERRED warning · ARCHIVED neutral); type as outline badge.

## Guardrails honored

- **View side effect** — only via `<EvidenceViewDialog>`; detail defaults to read-only summary + read-only chain (always-on guardrail + plan success criterion).
- **Transfer invalidation** — invalidates `detail(id)`, `chain(id)`, and `lists()`.
- **COC chronology** — backend returns ASC; timeline renders oldest-first.
- **Archive** — ADMIN-only `RoleGate` + double-confirm; 409 already-archived keeps the dialog open.
- **Archived edit quirk** — backend allows editing archived evidence; the FE greys out Edit when `archived` (detail page hides mutating actions on archived; edit page shows an archived warning).
- **Custodian display** — subs resolved to names via `useDisplayNames`, with sub fallback.

## Success criteria verification

| Criterion | Status |
|---|---|
| Detail never auto-fetches `/evidence/:id` without confirm | ✅ modeled as a mutation; dialog is the only caller |
| COC timeline renders chronologically | ✅ oldest-first |
| Transfer invalidates evidence + COC queries | ✅ detail + chain + lists |
| Lint / typecheck / tests / build | ✅ all green |

## Notes / scope

- A **global `/evidence`** page was added (beyond the case-scoped deliverable) so the pre-existing sidebar nav item is functional instead of redirecting. It reuses the same `EvidenceList`.
- Evidence is registered **only from within a case** (caseId is required and comes from the case context) — there is no case picker in the create form, matching the workflow.

## Open backend issue

- **`GET /evidence/:id` returns 500 after committing its side effect** (discovered in manual testing). The endpoint inserts the `"Viewed by user"` COC row but 500s instead of returning the entity, and the `currentCustodianId` update does not persist (non-atomic write). This is a **backend bug** — the FE sends a correct request and is structurally right (view only via the dialog). Diagnosis + fix prompt: [`backend-prompt-evidence-view-500.md`](./backend-prompt-evidence-view-500.md). Until fixed, confirming the view dialog shows a "Internal server error" toast even though custody was taken (visible on reload of the chain).

## Known limitations

- **Deep-linking `/evidence/:id` with a cold cache** shows a minimal header ("summary isn't cached") + the read-only chain, until the user takes custody. This is intentional — we never call the mutating endpoint just to render a summary.
- **No server-side search/filter** beyond `caseId` (backend doesn't expose one).
- **Custodian/transfer names** depend on `/users/directory`; unresolved subs fall back to the raw id.
