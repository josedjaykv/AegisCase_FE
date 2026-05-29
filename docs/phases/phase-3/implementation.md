# Phase 3 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phase 2 (service module pattern, DataTable / PaginationBar / EmptyState, Card form archetype, `KeycloakUserPicker`)

Phase 3 delivers the **Cases module**: CRUD, status transitions with the closed-case reopen guard, ADMIN-only archive with double-confirm, and team management. It also establishes the **Detail archetype with tabs** reused by Evidence / Tasks / Involved later.

---

## Routes

| Route | Roles (FE gate) | Page |
|---|---|---|
| `/cases` | all authed | `CaseListPage` |
| `/cases/new` | ADMIN, DETECTIVE | `CaseNewPage` |
| `/cases/:id` | all authed | `CaseDetailPage` (tabs) |
| `/cases/:id/edit` | ADMIN, DETECTIVE | `CaseEditPage` |
| `/cases/:id/team` | all authed (add gated) | `CaseTeamPage` |

Create/edit are wrapped in a nested `<ProtectedRoute roles={['ADMIN','DETECTIVE']}>`. Read routes are open to any authenticated role. The server remains authoritative; gates are UX hygiene.

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §5.4)

| Endpoint | Hook | Notes |
|---|---|---|
| `GET /cases` | `useCasesListQuery` | `staleTime` 1 min; `keepPreviousData`; **no `team`** in list payload |
| `GET /cases/:id` | `useCaseQuery` | `staleTime` 30 s, **`refetchInterval` 60 s** (paused in background tab); includes `team` |
| `POST /cases` | `useCreateCaseMutation` | invalidates list, seeds detail cache |
| `PUT /cases/:id` | `useUpdateCaseMutation` | 400 "A closed case cannot be modified" shown inline |
| `PATCH /cases/:id/status` | `useChangeCaseStatusMutation` | reopen guard (see below) |
| `PATCH /cases/:id/archive` | `useArchiveCaseMutation` | ADMIN only; 409 "already archived" → toast |
| `GET /cases/:id/team` | `useCaseTeamQuery` | raw array (no pagination) |
| `POST /cases/:id/team` | `useAddTeamMemberMutation` | 409 "already a team member" → inline |

## New service module — `src/services/cases/`

`cases.types.ts` (enums `CaseStatus`/`CasePriority`/`TeamRole` + `Case`, `CaseTeamMember`, inputs), `cases.api.ts`, `cases.queryKeys.ts` (hierarchical: `list`, `detail`, `team`), `cases.queries.ts`, `cases.schemas.ts` (Zod mirrors `CreateCaseDto` 1:1; `leaderUserId` is `.uuid()` supplied by the picker).

## New shared primitives & components

- `components/ui/dialog.tsx` — Radix dialog (modal). 
- `components/ui/tabs.tsx` — Radix tabs (new dep `@radix-ui/react-tabs`).
- `components/feedback/ConfirmDialog.tsx` — reusable confirm with optional **type-to-confirm** phrase (used by archive double-confirm).

## New feature module — `src/features/cases/`

- `pages/` — List, New, Detail, Edit, Team.
- `components/CaseBadges.tsx` — `CaseStatusBadge`, `CasePriorityBadge`, `ArchivedPill` (tones from design-system §2).
- `components/CaseForm.tsx` — create/edit; title/description/priority via RHF, leader via `KeycloakUserPicker`.
- `components/CaseStatusPicker.tsx` — status dropdown with the reopen guard.
- `components/ArchiveButton.tsx` — ADMIN-only, double-confirm (type the `caseCode`).
- `components/TeamMemberList.tsx` + `components/AddTeamMemberDialog.tsx`.

## Key behaviors / guardrails honored

- **Reopen guard** — `CaseStatusPicker` only renders for `case.changeStatus` roles. When `status === CLOSED` and the actor is **not** ADMIN, the dropdown is disabled with a "Only an admin can reopen a closed case" hint. Backend 403 is the safety net; if it ever fires, the interceptor toast covers it.
- **Closed-case edit** — `CaseEditPage` short-circuits to a warning banner ("A closed case cannot be modified") and does not render the form. If a PUT slips through anyway, `CaseForm` surfaces the backend's 400 message inline.
- **Archive** — visible only to ADMIN (`RoleGate`), double-confirmed by typing the `caseCode`. Soft-delete; archived cases render `opacity-60` + an "Archived" pill and lose their Edit/status affordances.
- **`caseCode`** — never shown as an input (server-generated).
- **Detail tab shell** — Overview is live (description + team summary + actions); Evidence / Tasks / Involved / Audit / Media render labeled placeholders pointing at their future phases.

## `KeycloakUserPicker` generalization

The Phase 2 picker gained a `mode` prop:
- `provision` (default, unchanged) — pick a Keycloak user **without** a local profile to create one; provisioned matches are disabled + link to their profile.
- `assign` — pick an **existing** app user (case leader / team member); only provisioned users are selectable, un-provisioned show "No profile yet".

This keeps user-selection logic in one place for the leader picker, the add-team-member dialog, and future assignee/custodian pickers.

## Success criteria verification

| Criterion | Status |
|---|---|
| Detective drives OPEN → UNDER_INVESTIGATION → CLOSED | ✅ via `CaseStatusPicker` (DETECTIVE has `case.changeStatus`) |
| Admin can reopen a closed case | ✅ ADMIN sees enabled picker when `CLOSED` |
| Non-admin reopen blocked client-side | ✅ picker disabled + hint when `CLOSED` & not ADMIN |
| …and shows 403 if bypassed | ✅ interceptor toast on `PATCH .../status` 403 |
| Lint / typecheck / tests / build green | ✅ all four |

## Known limitations

- **No "remove team member"** — the backend exposes no such endpoint.
- **Team role editing** is limited to `LEAD ↔ MEMBER`; `CREATOR` is immutable (see addendum below).
- **No client-side case filters/search yet** — `GET /cases` only accepts pagination. Add when the backend grows filters.
- **Leader reassignment on edit** is optional: the current leader shows by name (or the raw sub if their profile hasn't been provisioned); searching and picking a new one replaces it, otherwise the existing value is kept.

---

## Addendum — sub → name resolution via `/users/directory`

After the initial Phase 3 ship, the backend added `GET /users/directory?ids=<sub1>,<sub2>,...` (all-roles, PII-free, returns `{ keycloakUserId, firstNames, lastNames, role }`). The FE now uses it to render names wherever a Keycloak sub used to be shown as a raw UUID. See [`backend-prompt-user-directory.md`](./backend-prompt-user-directory.md) for the prompt and contract the backend implemented, and [`user-directory.md`](./user-directory.md) for the standalone explainer (why we did it, BE changes + rationale, FE changes + rationale).

### FE wiring

- **`services/users`**:
  - `users.types.ts` — new `UserDirectoryEntry` (the four-field projection).
  - `users.api.ts` — `getDirectory(subs)` calling `GET /users/directory?ids=a,b,c`.
  - `users.queryKeys.ts` — new `directory(subs)` key (sub list is deduped + sorted by the hook so different consumers share the cache).
  - `users.queries.ts` — `useDisplayNames(subs)` returns a `displayName(sub) => string | null` helper backed by the directory query, with a 5-minute `staleTime`.

- **Consumers updated**:
  - `features/cases/components/TeamMemberList.tsx` — primary line is now the resolved name; if a sub doesn't resolve (e.g. profile not yet provisioned locally), the row falls back to the mono UUID so it never blanks out.
  - `features/cases/pages/CaseDetailPage.tsx` — the **Leader** and **Created by** metadata cells now render the resolved name with the same UUID fallback.

### Why fallback to the sub

`/users/directory` silently omits unknown subs (no 404). That happens when a Keycloak user has not been provisioned locally yet — perfectly valid state. Rendering the raw sub keeps the UI honest instead of showing a blank cell.

### Closes the original limitation

The Phase 3 "Known limitations" entry about team/leader being shown as UUIDs is **resolved**. The previous reasoning (don't show names for admins only) was specifically about the existing ADMIN-only `/users/by-keycloak-ids` route; the new `/users/directory` is open to all authenticated roles and PII-free, so names are now consistent for ADMIN, DETECTIVE and ANALYST alike.

---

## Addendum 2 — editing a team member's role

After the initial ship, the backend added `PATCH /cases/:id/team/:userId { teamRole }` (all the contract details are in [`backend-prompt-team-role-update.md`](./backend-prompt-team-role-update.md)). The FE now lets an ADMIN/DETECTIVE change an existing member's role from the **Manage** (team) page.

### FE wiring

- **`services/cases/cases.api.ts`** — `updateTeamMemberRole(id, userId, teamRole)` → `PATCH /cases/:id/team/:userId`.
- **`services/cases/cases.queries.ts`** — `useUpdateTeamMemberRoleMutation(id)`; invalidates `casesQueryKeys.team(id)` and `detail(id)` on success.
- **`auth/permissions.ts`** — added `case.team.updateRole` (ADMIN, DETECTIVE), mirroring the backend matrix.
- **`features/cases/components/TeamMemberList.tsx`** — gains `caseId` + `editable` props. When editable, `LEAD`/`MEMBER` rows render an inline role `Select` (`RolePicker`); the `CREATOR` row always renders a static badge — its role is immutable. The change is fire-and-forget with a success toast; `403` is left to the interceptor.
- **`features/cases/pages/CaseTeamPage.tsx`** — computes `canManage = can('case.team.updateRole') && !locked`, where `locked` is true when the case is `CLOSED` or `archived`. Passes `editable={canManage}`. A read-only banner explains why editing is disabled on a closed/archived case. The **Add member** button is hidden under the same `canManage` gate.

### Behavior honored from the backend contract

- **Only `LEAD ↔ MEMBER`.** `CREATOR` is never offered as a target nor editable on the creator's row.
- **Closed/archived case → read-only.** The FE hides the controls; the backend 400 ("A closed case cannot be modified") is the safety net.
- **Idempotent.** Selecting the role a member already has is a no-op (we early-return without calling).
- **Detail-page Overview team card stays read-only** — editing happens only on the dedicated `/cases/:id/team` page.
