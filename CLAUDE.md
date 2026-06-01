# AegisCase Frontend — CLAUDE.md

The **AegisCase Investigation Management System** frontend: a role-aware SPA (`ADMIN` / `DETECTIVE` / `ANALYST`) over an 8-microservice NestJS backend. Authoritative backend spec: `BACKEND_INVESTIGATION_REPORT.md`. This file is the **always-loaded entry point** that points you to focused docs under `docs/`.

---

## For the assistant — how to use this document

This file is intentionally short. Detailed material lives in `docs/`. **You must read the relevant docs before acting** — see the index below.

### Hard rules

1. **Locate the phase.** Open `docs/phases/phase-N/plan.md` and read it in full before any implementation. Do not start a phase whose dependencies (listed in its plan) are unfinished — flag this to the user instead.
2. **Load only what the phase needs.** Each plan lists "Required reading before starting" — load exactly those docs. Do not pull in unrelated sections.
3. **Honor the always-on guardrails** in this file (next section). They apply to every phase regardless of what you loaded.
4. **Use the exact endpoints** from `BACKEND_INVESTIGATION_REPORT.md` §5; the FE-side index lives in `docs/architecture/api-integration.md`.
5. **All visual choices come from `docs/design-system.md`** — never hardcode colors, spacing, breakpoints, or enum→badge mappings.
6. **Verify against success criteria.** Before reporting a phase complete, walk its plan's success criteria and the hard checklist in `docs/architecture/quality-gates.md`.

### When a decision conflicts with documented material

Update the relevant doc *first*, get user agreement on the change, then write code. Code that drifts from the docs without an update there is a regression.

### When the user names a phase

(e.g. "let's start Phase 5") → treat that phase's `plan.md` deliverables list as the scope contract. Do not silently expand it.

### Docs index — read these for the corresponding task

| Doing this kind of work… | Read these docs |
|---|---|
| **Starting a phase** | `docs/phases/phase-N/plan.md` + everything its "Required reading" lists |
| **Any UI / visual work** | `docs/design-system.md` (mandatory) |
| **Wiring an API endpoint or query** | `docs/architecture/api-integration.md` + `BACKEND_INVESTIGATION_REPORT.md` §5 |
| **Auth / login / refresh / role gating** | `docs/architecture/auth.md` + `docs/architecture/architecture.md` §4 |
| **State management or error handling** | `docs/architecture/architecture.md` §1–§3 |
| **Mapping a workflow to screens** | `docs/architecture/workflows.md` |
| **Adding a file / unsure where it belongs** | `docs/architecture/folder-structure.md` |
| **Proposing a new dependency** | `docs/architecture/tech-stack.md` (don't add libs absent from there without user approval) |
| **Writing tests / lint / naming** | `docs/architecture/dev-standards.md` |
| **Declaring a phase complete / preparing for ship** | `docs/architecture/quality-gates.md` |
| **Setting up the project / env vars / scripts** | `docs/running.md` |
| **Backend deep dives (entities, events, errors)** | `BACKEND_INVESTIGATION_REPORT.md` directly |

---

## Always-on guardrails (non-negotiable, every phase)

These apply on every turn regardless of which docs you loaded. Violations are regressions.

### Backend side effects you must guard

- **`GET /evidence/:id` MUTATES** the chain-of-custody and reassigns custody to the viewer. **Never call it without explicit user confirmation through `<EvidenceViewDialog>`.** For read-only inspection use `GET /evidence/:id/chain-of-custody`.
- **`GET /tasks` and `GET /tasks/:id` sweep OVERDUE** on every read. That is fine, but be aware it triggers `task.overdue` events.
- **`POST /media` re-verifies MIME via magic bytes** server-side. Always pre-check size locally; declare `text/plain` for files without magic bytes.

### Field-casing boundary

- The app uses **camelCase everywhere internal**. The wire format is camelCase **except**:
  - `POST /media` form fields: `entity_type`, `entity_id` (snake_case).
  - `GET /audit*` query params: `entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`, `action` (snake_case).
- Translate at the network boundary in `services/<domain>/`, never anywhere else.

### Keycloak vs. user-service field ownership

- `keycloakUserId`, `firstNames`, `lastNames`, `role` are **owned by Keycloak**. The FE never authors them via free-text inputs — `<UserForm mode="edit">` shows them only as a read-only summary and omits them from the PUT payload.
- `<UserForm mode="create">` uses `<KeycloakUserPicker>` against `GET /auth/keycloak-users?search=` (see `docs/architecture/api-integration.md` §7). The identity portion of the create payload (`keycloakUserId`/`firstNames`/`lastNames`/`role`) is taken verbatim from the selected Keycloak user — there is no manual override.
- The only sanctioned local mutation of `role` is `<KeycloakSyncBanner>`, which is shown only when the current user is viewing their own profile and the local role has drifted from `/auth/me`. It pulls the Keycloak value down via `PUT /users/:id { role }`.
- Full policy + remaining limitations (cross-user sync, name drift) are in `docs/architecture/architecture.md` §4.7.

### Permissions (FE gating; backend is authoritative)

- Use `<RoleGate roles={…}>` and `usePermissions().can(action)`. Hiding ≠ securing — the server still enforces. The gate is for UX hygiene.
- Conditional gates not expressible in the matrix:
  - **ANALYST may only update / change-status tasks where `assignedToUserId === user.sub`**. Other tasks render non-draggable / read-only.
  - **ANALYST cannot send `CANCELLED`.** Remove the option from `<TaskStatusPicker>`.
  - **Only ADMIN may reopen a CLOSED case** (`PATCH /cases/:id/status`). The picker hides non-ADMIN options when current status is `CLOSED`.
  - **Only ADMIN may archive** cases/evidence (`PATCH /:id/archive`) or **soft-delete media** (`DELETE /media/:id`).
- `caseId` validity is **not** checked by some backend endpoints (involved-link, evidence-create, task-create). Pre-check on the FE before submitting.

### Layering

- **`services/`** is the only layer allowed to make HTTP calls or know about snake_case mapping or TanStack Query keys.
- **`features/`** consumes hooks from `services/`. It never imports axios.
- **`components/ui/`** holds shadcn primitives — do not edit them outside that folder.

### Visual

- All colors / spacing / radii / typography come from `docs/design-system.md` tokens. Never hardcode HSL or hex.
- Status / priority badges follow `docs/design-system.md` §2 enum→color mappings exactly.
- Every UI change is verified on **mobile (375 × 812)**, **tablet (768 × 1024)**, **desktop (1440 × 900)** before merge.
- No hover-only affordances — every action reachable on desktop via hover must have a tap-equivalent on mobile.

### Tokens / secrets

- Tokens live in memory (Zustand). Refresh token mirrored to `sessionStorage` only. **Never** put the access token in `localStorage` (XSS risk).
- Anything `VITE_`-prefixed in env is inlined into the client bundle and visible to users. Do not put secrets there.

---

## Folder structure (slim — full detail in `docs/architecture/folder-structure.md`)

```
src/
├── app/             Router + providers (App, routes, QueryProvider, ThemeProvider, ToastProvider)
├── auth/            permissions.ts, RoleGate, ProtectedRoute, usePermissions
├── services/        One folder per backend microservice; the ONLY HTTP layer
├── features/        Domain UI grouped by microservice (pages, components, schemas)
├── components/      Shared UI: ui/ (shadcn), data/, layout/, feedback/
├── stores/          Zustand (auth.store, ui.store)
├── hooks/           Cross-feature hooks
├── lib/             env, utils, date, format
├── types/           Paginated<T>, ApiError, domain re-exports
├── styles/          globals.css with design tokens
└── main.tsx
docs/
├── architecture/    backend, tech-stack, architecture, auth, api-integration, workflows, folder-structure, dev-standards, quality-gates
├── design-system.md
├── running.md
└── phases/phase-N/  plan.md (+ implementation.md and manual-testing.md once shipped)
```

**Rules:** `services/` = only HTTP. `features/` = consumes hooks. `components/ui/` = shadcn primitives, untouched outside that folder.

---

## Phase completion log

| Phase | Status | Plan | Implementation | Manual test |
|---|---|---|---|---|
| 0 — Tooling & component baseline | ✅ Completed | [plan](docs/phases/phase-0/plan.md) | [report](docs/phases/phase-0/implementation.md) | [guide](docs/phases/phase-0/manual-testing.md) |
| 1 — Auth, session, role gating | ✅ Completed | [plan](docs/phases/phase-1/plan.md) | [report](docs/phases/phase-1/implementation.md) | [guide](docs/phases/phase-1/manual-testing.md) |
| 2 — Users module | ✅ Completed | [plan](docs/phases/phase-2/plan.md) | [report](docs/phases/phase-2/implementation.md) | [guide](docs/phases/phase-2/manual-testing.md) |
| 3 — Cases module | ✅ Completed | [plan](docs/phases/phase-3/plan.md) | [report](docs/phases/phase-3/implementation.md) | [guide](docs/phases/phase-3/manual-testing.md) |
| 4 — Involved persons | ✅ Completed | [plan](docs/phases/phase-4/plan.md) | [report](docs/phases/phase-4/implementation.md) | [guide](docs/phases/phase-4/manual-testing.md) |
| 5 — Evidence + COC | ✅ Completed | [plan](docs/phases/phase-5/plan.md) | [report](docs/phases/phase-5/implementation.md) | [guide](docs/phases/phase-5/manual-testing.md) |
| 6 — Tasks + Kanban | ✅ Completed | [plan](docs/phases/phase-6/plan.md) | [report](docs/phases/phase-6/implementation.md) | [guide](docs/phases/phase-6/manual-testing.md) |
| 7 — Media | ✅ Completed | [plan](docs/phases/phase-7/plan.md) | [report](docs/phases/phase-7/implementation.md) | [guide](docs/phases/phase-7/manual-testing.md) |
| 8 — Audit & feeds | ✅ Completed | [plan](docs/phases/phase-8/plan.md) | [report](docs/phases/phase-8/implementation.md) | [guide](docs/phases/phase-8/manual-testing.md) |
| 9 — Polling, polish, E2E | ⬜ Not started | [plan](docs/phases/phase-9/plan.md) | — | — |
| 10 — Perf, a11y, hardening | ⬜ Not started | [plan](docs/phases/phase-10/plan.md) | — | — |

When a phase ships, update its status and link its `implementation.md` and `manual-testing.md`.

---

**End of CLAUDE.md.** Always-on rules are above. Phase-specific scope is in `docs/phases/phase-N/plan.md`. Architecture detail is in `docs/architecture/`. The visual contract is in `docs/design-system.md`.
