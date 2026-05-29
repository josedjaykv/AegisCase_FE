# Feature 002 — Team member role management

**Status:** ✅ Shipped
**Date:** 2026-05-29
**Phase:** 3 (Cases module) — added on top of the shipped phase
**Scope:** Backend (new endpoint) + Frontend (wiring + UI)

## Summary

Inside a case, an ADMIN or DETECTIVE can now change the team role of an **already-added** member directly from the **Manage** team page (`/cases/:id/team`) — promoting a `MEMBER` to `LEAD` or demoting a `LEAD` to `MEMBER` — without removing and re-adding them.

---

## Motivation (why)

Team composition was effectively write-once: you could add a member with a role and read the team, but never change a role afterwards. The only mutating endpoint was `POST /cases/:id/team`, which **409s** when the `(caseId, userId)` pair already exists, and there is no "remove member" route — so "delete and re-add" wasn't an option either. The single realistic correction (someone added as `MEMBER` who should be `LEAD`) was impossible. This feature closes that gap.

---

## Backend changes (and why)

A **new** route was required — none of the existing team endpoints could express "change this member's role":

```
PATCH /cases/:id/team/:userId
Authorization: Bearer <token>
Roles: ADMIN, DETECTIVE
Body: { "teamRole": "LEAD" | "MEMBER" }

200 → { caseId, userId, teamRole, linkedAt }   // the updated row
```

Key contract decisions (full brief in [`../phases/phase-3/backend-prompt-team-role-update.md`](../phases/phase-3/backend-prompt-team-role-update.md)):

- **A separate `PATCH` route, not a widened `POST`.** `POST` 409s on an existing pair; reusing it would mean overloading "create" with "update" semantics. A dedicated route keyed by the composite PK `(caseId, userId)` is the clean fit.
- **`userId` in the path is the Keycloak `sub`** — the same `user_id` returned by `GET /cases/:id/team`, **not** an internal id.
- **Only `LEAD ↔ MEMBER`.** `CREATOR` is immutable provenance: you cannot change the creator's row, and `CREATOR` cannot be assigned to anyone via this route (both → `400`). This preserves "who created the case" as an auditable fact.
- **Closed-case consistency.** A `CLOSED` case rejects the change with `400 "A closed case cannot be modified"`, matching the existing `PUT /cases/:id` rule, so team composition can't drift on a closed case.
- **Idempotent.** Sending the role a member already has returns `200` unchanged (no `409`).
- **No event emitted.** Consistent with add/read team operations (only `case.created` / `case.closed` / `case.archived` exist).

Errors the FE handles: `400` (invalid/missing role, CREATOR rules, closed case), `403` (ANALYST), `404` (`"Case not found"` vs `"Team member not found"` to distinguish).

---

## Frontend changes (and why)

| File | Change |
|------|--------|
| `src/services/cases/cases.api.ts` | `updateTeamMemberRole(id, userId, teamRole)` → `PATCH /cases/:id/team/:userId`. |
| `src/services/cases/cases.queries.ts` | `useUpdateTeamMemberRoleMutation(id)`; on success invalidates `casesQueryKeys.team(id)` and `detail(id)` so both the team page and the case header reflect the change. |
| `src/auth/permissions.ts` | New action `case.team.updateRole` → `[ADMIN, DETECTIVE]`, mirroring the backend role matrix. |
| `src/features/cases/components/TeamMemberList.tsx` | New `caseId` + `editable` props. When editable, `LEAD`/`MEMBER` rows render an inline role `Select` (`RolePicker`); the `CREATOR` row always renders a static badge. Idempotent: selecting the current role is a no-op. Fire-and-forget with a success toast; `403` is left to the axios interceptor. |
| `src/features/cases/pages/CaseTeamPage.tsx` | Computes `canManage = can('case.team.updateRole') && !locked`, where `locked` = case `CLOSED` or `archived`. Passes `editable={canManage}`, hides **Add member** under the same gate, and shows a read-only banner explaining why editing is off. |

Design notes:

- **Editing lives only on the dedicated Manage page** (`/cases/:id/team`). The Overview tab's team card stays read-only — that surface is a summary, not a control panel.
- **`CREATOR` is never offered as a target** and the creator's row is never turned into a picker, matching the backend's immutability rule client-side so the UI never lets you attempt an action the server will reject.
- **Closed/archived → read-only UI**, with the backend `400` as the safety net if a request is somehow issued anyway.

---

## Behavior / rules summary

| Situation | UI behavior | Backend |
|-----------|-------------|---------|
| MEMBER ↔ LEAD by ADMIN/DETECTIVE | Inline dropdown; toast on success | `200`, returns updated row |
| Selecting the current role | No request (short-circuit) | `200` no-op if it had been sent |
| CREATOR row | Static badge, not editable | `400` if attempted |
| Assigning CREATOR | Not offered | `400` if attempted |
| Closed / archived case | Controls hidden + banner | `400 "A closed case cannot be modified"` |
| ANALYST | Static badges only | `403` if attempted |

---

## How to test

Manual steps are in [`../phases/phase-3/manual-testing.md`](../phases/phase-3/manual-testing.md) §15:

1. Open a case → **Manage** team.
2. Promote a `MEMBER` to `LEAD` (and back) — confirm the toast and the `PATCH /cases/<id>/team/<sub>` request.
3. Confirm the `CREATOR` row has no dropdown.
4. Close the case → controls disappear, banner shows; curl PATCH → `400`.
5. As ANALYST → static badges only; curl PATCH → `403`.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

---

## Related docs

- Backend brief: [`../phases/phase-3/backend-prompt-team-role-update.md`](../phases/phase-3/backend-prompt-team-role-update.md)
- Phase 3 implementation report (Addendum 2): [`../phases/phase-3/implementation.md`](../phases/phase-3/implementation.md)
- Phase 3 manual testing (§15): [`../phases/phase-3/manual-testing.md`](../phases/phase-3/manual-testing.md)
