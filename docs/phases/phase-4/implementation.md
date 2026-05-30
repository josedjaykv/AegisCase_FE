# Phase 4 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phase 3 (cases module, DataTable/cards pattern, dialogs, Detail tab shell)

Phase 4 delivers the **Involved persons module**: a person registry (CRUD) and linking persons to cases, plus the live **Involved** tab on the case detail page.

---

## Routes

| Route | Roles (FE gate) | Page |
|---|---|---|
| `/involved` | all authed | `InvolvedListPage` |
| `/involved/new` | ADMIN, DETECTIVE | `InvolvedNewPage` |
| `/involved/:id` | all authed | `InvolvedDetailPage` |
| `/involved/:id/edit` | ADMIN, DETECTIVE | `InvolvedEditPage` |

The case-detail **Involved** tab (`/cases/:id`, in-page tab) hosts the link action.

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §5.5)

| Endpoint | Hook | Notes |
|---|---|---|
| `GET /involved-persons` | `useInvolvedListQuery` | `staleTime` 5 min, `keepPreviousData` |
| `GET /involved-persons/:id` | `useInvolvedPersonQuery` | includes `caseLinks` |
| `POST /involved-persons` | `useCreateInvolvedMutation` | 409 on duplicate `document` → inline |
| `PUT /involved-persons/:id` | `useUpdateInvolvedMutation` | 409 on document collision → inline |
| `GET /involved-persons/:id/cases` | `useInvolvedCasesQuery` | raw array |
| `POST /involved-persons/:id/cases/:caseId` | `useLinkInvolvedMutation` | 409 "already linked" → inline in dialog |

## New service module — `src/services/involved/`

`involved.types.ts` (enum `InvolvementType`, `InvolvedPerson`, `CaseInvolvedPerson`, inputs), `involved.api.ts`, `involved.queryKeys.ts` (`list`/`detail`/`cases`), `involved.queries.ts`, `involved.schemas.ts` (Zod mirrors `CreateInvolvedPersonDto`: only `firstNames` required).

## New feature module — `src/features/involved/`

- `pages/` — List (DataTable on `md+`, cards on mobile per feature-003), New, Detail, Edit.
- `components/InvolvementBadge.tsx` — VICTIM info · SUSPECT destructive · WITNESS warning · OTHER neutral (design-system §2).
- `components/InvolvedForm.tsx` — create/edit; 409 document conflict rendered inline.
- `components/InvolvedCard.tsx` — mobile card.
- `components/CaseLinksList.tsx` — a person's linked cases (involvement badge, observations, link to `/cases/:caseId`).
- `components/LinkToCaseDialog.tsx` — **reusable, two modes** (see below).

## The link dialog (reused from two places)

`LinkToCaseDialog` has two modes so a single component serves both entry points (plan requirement):

- **`pick-case`** — on the person detail page; person is fixed, the user searches and picks a **case**.
- **`pick-person`** — on the case detail Involved tab; case is fixed, the user searches and picks a **person**.

Both then choose an `involvementType` and optional `observations` and submit via `useLinkInvolvedMutation` (which takes the person id in its variables so it serves both modes).

### caseId pre-check (success criterion)

The backend does **not** validate `caseId` on link. We satisfy the required pre-check **by construction**: in `pick-case` mode the case is chosen from a picker bound to `GET /cases`, so we can only ever submit a `caseId` that the backend just returned as a real case. This is the sanctioned alternative the plan lists ("pre-populate the case selector from a search/typeahead bound to `GET /cases`"). No invalid id can be typed.

### Client-side filtering (no server search)

Neither `GET /cases` nor `GET /involved-persons` accepts a `search` param, so both pickers fetch a page (`limit: 100`) and filter client-side by title/code (cases) or name/document (persons). Documented as a limitation below.

## Case-detail Involved tab

The **Involved** tab is now live with a **Link person** action (ADMIN/DETECTIVE, hidden on archived cases). It does **not** list the roster of people linked to the case — see the limitation below.

## Guardrails honored

- **No "unlink".** There is no unlink endpoint; the UI never offers one (plan + §17.18).
- **409 graceful.** Duplicate `document` (create/edit) and "already linked" (link dialog) surface inline, not as bare toasts.
- **Role gating.** Register/edit/link gated to ADMIN+DETECTIVE via routes and `RoleGate`; ANALYST is read-only. Server remains authoritative.
- **InvolvementType enum** drives the badge and the link dialog select 1:1 with the backend enum.

## Success criteria verification

| Criterion | Status |
|---|---|
| Linking respects involvement type enum | ✅ select bound to `INVOLVEMENT_TYPES` |
| 409 (already linked) surfaces gracefully | ✅ inline in the dialog |
| Client-side caseId pre-check | ✅ by construction via the `GET /cases`-bound picker |
| Lint / typecheck / tests / build | ✅ all green |

## Known limitations

- **No server-side search** in the case/person pickers — client-side filter over the first 100 records. Fine for current scale; revisit if datasets grow or the backend adds `search`.
- **Linked cases** now show the case **title + code + status**, resolved client-side via `useCaseSummaries` (batched per-id case fetches reusing the detail cache), since `GET /involved-persons/:id/cases` returns only the join rows. Falls back to the `caseId` while a title loads.

---

## Addendum — Feature 004 (roster, edit, unlink, hide-linked)

After the initial Phase 4 ship, the backend added three endpoints and the FE consumed them. This **resolves the original "no roster of persons for a case" and "no unlink" limitations**. Full write-up: [`../../features/feature-004-case-involved-link-management.md`](../../features/feature-004-case-involved-link-management.md).

- **Roster** — the case Involved tab now lists linked persons via `GET /involved-persons/by-case/:caseId` (person embedded), replacing the placeholder.
- **Edit involvement type** — inline `Select` on roster/link rows → `PATCH /involved-persons/:id/cases/:caseId`.
- **Unlink** — destructive confirm → `DELETE /involved-persons/:id/cases/:caseId`.
- **Hide already-linked** — pickers exclude cases/people already linked (FE-only filter).

Manual steps for these are in `manual-testing.md` §11–§14.
