# Feature 010 — Editing evidence requires custody

**Status:** ✅ Shipped (FE) · ⏳ needs backend enforcement
**Date:** 2026-05-30
**Phase:** 5 (Evidence)
**Scope:** Frontend + backend (coordinated)

## Summary

Only the **current custodian** can edit an evidence record. A non-custodian who tries to edit is
asked to **take custody first** — exactly like the download flow (Option C / Feature 007). Taking
custody writes a chain-of-custody row, so it is recorded in the audit trail.

- **Detail page → Edit:** if you hold custody, Edit opens the form as before. If not, Edit opens a
  confirm dialog ("Take custody to edit?"); on confirm it calls `take-custody` and then navigates to
  the edit form (you're now the custodian).
- **Edit page guard:** if you reach `/evidence/:id/edit` without custody (e.g. a direct link), the
  form is replaced by a "Only the current custodian can edit… Take custody & edit" panel. Taking
  custody reveals the form.

## Motivation (why)

Evidence integrity/confidentiality: edits to a record must be tied to whoever is formally
responsible for the item at that moment. Previously any ADMIN/DETECTIVE could edit regardless of
custody, leaving no trace of who took responsibility. Routing edits through a deliberate custody
transfer makes every change attributable in the chain of custody.

## Backend changes (required — not yet shipped)

The FE gate is UX only. Real enforcement is server-side:

- **`PUT /evidence/:id` → 403** when the caller is not the current `currentCustodianId` (all roles,
  even ADMIN). Custodian → 200.
- `PATCH /evidence/:id/take-custody` already exists (Feature 007) and records the custody transfer
  in the chain + audit, so "taking custody to edit" is already audited.
- Recommended: emit `evidence.updated` on edit and record `EVIDENCE_UPDATED` in audit for full
  edit-level traceability.

Full contract + acceptance criteria:
[`../phases/phase-5/backend-prompt-evidence-edit-custody.md`](../phases/phase-5/backend-prompt-evidence-edit-custody.md).

> ⚠️ **Until the backend ships the 403**, a non-custodian could still `PUT /evidence/:id` directly
> (bypassing the UI). The FE gate prevents it in the app, but it is not a security boundary on its
> own.

## Frontend changes

| File | Change |
|------|--------|
| `features/evidence/pages/EvidenceDetailPage.tsx` | Edit button is custody-aware: custodian → link to edit; non-custodian → `<ConfirmDialog>` "Take custody to edit?" → `takeCustody` → navigate to edit. Reuses the existing `isCustodian` / `useTakeCustodyMutation` from Feature 007. |
| `features/evidence/pages/EvidenceEditPage.tsx` | Guard: renders the form only for the custodian; otherwise a "Take custody & edit" panel (covers direct-URL access). |

No new service code — reuses `useTakeCustodyMutation` (`PATCH /evidence/:id/take-custody`), which
seeds the detail cache so `isCustodian` flips immediately and the form appears.

## Behavior / rules

- Applies on top of the existing role gate (`evidence.update` = ADMIN/DETECTIVE). ANALYST still can't
  edit at all; ADMIN/DETECTIVE must additionally hold custody.
- Archived evidence remains non-editable (unchanged).
- After taking custody, the user is the custodian → edit proceeds with no further prompt.

## How to test

On an evidence whose custodian is someone else (sign in as a DETECTIVE who isn't the custodian):

1. Detail page → **Edit** → a "Take custody to edit?" dialog appears.
2. Confirm → toast "Custody transferred to you", a chain-of-custody row is added (visible in the
   chain + in the case/evidence **Audit** as a custody transfer), and you land on the edit form.
3. Save changes → succeeds (you're now the custodian).
4. Direct-link `/evidence/:id/edit` as a non-custodian → the form is gated behind the same
   "Take custody & edit" panel.
5. As the custodian, **Edit** opens the form directly (no prompt).

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- FE gate only until the backend returns 403 on `PUT /evidence/:id` for non-custodians.
- Edit-level audit (`EVIDENCE_UPDATED`) depends on the recommended backend event; the custody
  transfer itself is already audited.
