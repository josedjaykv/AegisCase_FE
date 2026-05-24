# Architecture & Design (Service / State / Errors / Permissions / UX Guards)

> Originally §4.1–§4.5 of CLAUDE.md. The **§4.6 Visual Design System** lives separately in [`docs/design-system.md`](../design-system.md). Load this doc whenever you are designing data flow, state management, error handling, or permission gating in a feature.

## 1. Service architecture

- **One typed client module per backend service** under `src/services/<domain>/`, each exposing:
  - `*.api.ts` — raw axios calls returning typed promises.
  - `*.types.ts` — request/response TypeScript types (mirroring backend DTOs and entity JSON).
  - `*.queries.ts` — TanStack Query `useQuery`/`useMutation` hooks built on the api functions.
  - `*.schemas.ts` — Zod schemas for forms (mirror backend `class-validator`).
- All clients share a single `httpClient` axios instance with the auth interceptor.
- The audit endpoints and media upload have their **own DTO mappers** that translate camelCase ↔ snake_case at the network boundary, so the rest of the app uses camelCase uniformly.

## 2. State management design

| Layer | Scope | Tool | Examples |
|---|---|---|---|
| **Server state** | Cached responses from backend | TanStack Query | `useCase(id)`, `useTasks(filters)`, `useAuditFeed()` |
| **Auth state** | Tokens + decoded user | Zustand (`useAuthStore`) | `accessToken`, `refreshToken`, `user: { sub, email, role }` |
| **UI state** | Modals, dialogs, layout prefs | Zustand (`useUiStore`) or local `useState` | Evidence-view-confirmation dialog open, sidebar collapsed |
| **Form state** | In-progress form values | React Hook Form | Create case form, transfer custody form |
| **URL state** | Filters, pagination | React Router search params | `?page=2&assignedToUserId=...` synced with TanStack Query keys |

**Tokens live in memory** (Zustand store), with the refresh token mirrored to `sessionStorage` so a tab refresh can re-bootstrap. We do **not** put the access token in `localStorage` (XSS exfiltration risk).

## 3. Error handling strategy

The backend has a uniform error envelope (see `BACKEND_INVESTIGATION_REPORT.md` §9):

```ts
type ApiError = {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | { message: string[]; error: string; statusCode: number };
};
```

A single `apiError.ts` helper normalizes this into `{ status, message, fieldErrors? }`. Handling rules:

| Status | Handling |
|---|---|
| `400` validation (array message) | Map field errors back onto RHF via `setError` |
| `400` business rule (string message, e.g. "A closed case cannot be modified") | Toast error + disable the offending action |
| `401` | Axios interceptor calls `POST /auth/refresh`; on second failure, log out and redirect to `/login` |
| `403` | Toast "You don't have permission for this action"; ideally the UI should not have offered it (see RoleGate) |
| `404` | Show empty/not-found state per route |
| `409` | Toast surfacing the server message (it is already user-friendly: "Document already registered") |
| `429` | Exponential back-off + toast: "Too many requests, retrying…" |
| `5xx` | Toast + retry button; Sentry capture |
| `503` (Keycloak/S3 down) | Persistent banner: "Authentication service unavailable" / "File storage unavailable" |

A top-level `<ErrorBoundary>` catches render errors and reports to Sentry without leaking the JWT.

## 4. Permission model implementation

The canonical role/action matrix lives in `src/auth/permissions.ts`, mirroring `BACKEND_INVESTIGATION_REPORT.md` §2.1 and `libs/auth/src/permissions.reference.ts`. Two primitives:

```tsx
// Hook
const { can } = usePermissions();
if (can('case.archive')) { ... }

// Component gate
<RoleGate roles={['ADMIN', 'DETECTIVE']}>
  <Button>Create case</Button>
</RoleGate>
```

`RoleGate` renders nothing when the user lacks the role. Hiding ≠ securing — the server still enforces. The gate is for UX hygiene.

Additional **conditional gates** the matrix alone cannot express (must be coded into the component):

- Analyst-only-own-task: `task.assignedToUserId === user.sub` for update/status routes.
- Reopen-closed-case: only ADMIN when current `status === CLOSED`.
- Cancel task: ANALYST cannot send `CANCELLED`.

## 5. Critical UX guards

These come straight from the backend's side-effect endpoints (`BACKEND_INVESTIGATION_REPORT.md` §3.6, §6.2) and must be implemented as explicit components:

- **`<EvidenceViewDialog>`** — wraps `GET /evidence/:id`. Required because viewing inserts a chain-of-custody row with `transferReason="Viewed by user"` and mutates `currentCustodianId = viewer.sub`. Detail page must:
  1. Default to showing read-only summary using the list payload + `GET /evidence/:id/chain-of-custody`.
  2. Require explicit confirmation ("Viewing this evidence will record you as the current custodian") before calling `GET /evidence/:id`.
- **`<MediaUpload>`** — uses snake_case form keys (`entity_type`, `entity_id`); pre-check file size against `MAX_FILE_SIZE` (default 50 MB) and reject locally above 100 MB hard cap.
- **`<TaskStatusPicker>`** — disables `CANCELLED` for ANALYST, disables all transitions when `status === COMPLETED` or `CANCELLED`.
- **`<ArchiveButton>`** — visible only to ADMIN; double-confirm; uses `PATCH /cases/:id/archive` or `PATCH /evidence/:id/archive`.
- **`<KanbanBoard>`** — Jira-style board for tasks (see [phases/phase-6/plan.md](../phases/phase-6/plan.md)). Columns mapped to `TaskStatus`, drag-and-drop changes status via `PATCH /tasks/:id/status`, client-side enforcement of analyst/COMPLETED/CANCELLED rules, fully keyboard-accessible, drag disabled on `< md` viewports.
