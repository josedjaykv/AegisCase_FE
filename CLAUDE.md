# AegisCase Frontend — CLAUDE.md

Single source of truth for the **AegisCase Investigation Management System** frontend. All decisions here are derived from `BACKEND_INVESTIGATION_REPORT.md` (the authoritative backend specification). When in doubt, the backend report wins; this document interprets it into frontend choices.

---

## For the assistant — how to use this document

**Before implementing any feature, you must:**

1. **Locate the phase.** Find the matching phase in §9 (Frontend Development Phases). Read its objective, deliverables, backend integrations, success criteria, and dependencies. Do not start a phase if its dependencies are unfinished — flag this to the user instead.
2. **Confirm the stack.** Use only the technologies listed in §3. Do not introduce new libraries without first proposing the change to the user and updating §3.
3. **Follow the architecture.** Respect the folder structure in §8 and the layer rules in §4.1 (only `services/` makes HTTP calls; `features/` consumes hooks). Use the state-management split in §4.2.
4. **Use the exact endpoints.** Cross-reference the backend in §6.2 and `BACKEND_INVESTIGATION_REPORT.md` §5. Match field casing per §6.6 — translate snake_case ↔ camelCase only at the network boundary.
5. **Honor the guards.** Enforce role/permission gating per §4.4 and the critical UX guards in §4.5 (especially `EvidenceViewDialog`, `TaskStatusPicker`, `KanbanBoard` analyst restrictions).
6. **Apply the design system.** All visual choices come from §4.6 — never hardcode colors, spacing, or breakpoints. Map every backend enum to its badge color per §4.6.2.
7. **Respect responsive standards.** Every UI change must work at the three viewports in §4.6.11 / §10.4 (mobile 375 × 812, tablet 768 × 1024, desktop 1440 × 900).
8. **Verify against success criteria.** Before reporting a phase complete, walk the phase's success criteria and the hard checklist in §11.1.

**When a decision conflicts with this document:** update CLAUDE.md *first*, get user agreement on the change, then write code. Code that drifts from CLAUDE.md without an update here is a regression.

**When the user names a phase** (e.g. "let's start Phase 5"), treat the deliverables list in §9 as the scope contract — do not silently expand it.

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [Backend Analysis Summary](#2-backend-analysis-summary)
3. [Technology Stack & Justifications](#3-technology-stack--justifications)
4. [Architecture & Design](#4-architecture--design)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Integration](#6-api-integration)
7. [Business Workflows → Screens](#7-business-workflows--screens)
8. [Folder Structure](#8-folder-structure)
9. [Frontend Development Phases](#9-frontend-development-phases)
10. [Development Standards](#10-development-standards)
11. [Success Metrics & Quality Gates](#11-success-metrics--quality-gates)
12. [Running the Application](#12-running-the-application)

---

## 1. Project Description

AegisCase Frontend is the **web client** for a criminal/operational investigation management platform used by law-enforcement personnel. It is a role-aware single-page application that gives investigators, analysts, and administrators a coherent interface over an 8-microservice backend.

### Core features (from backend)

- **Case management** — create, edit, change status, archive; team assignment.
- **Involved persons registry** — register victims/suspects/witnesses; link to cases.
- **Evidence & chain-of-custody** — register evidence, transfer custody, view full custody chain. Includes the "view = take responsibility" pattern for `GET /evidence/:id`.
- **Task assignment** — create, assign, change status; analyst can only touch own tasks; OVERDUE auto-flip is server-side.
- **Media** — multipart upload (with magic-byte verification), presigned-URL downloads, per-entity galleries.
- **Audit trail** — search by entity/user/action/date, replay-order timelines per entity.
- **User profile management** — ADMIN-only CRUD over the operational users table mirroring Keycloak identities.

### Users

- **ADMIN** — full power; sole role allowed to manage users, archive cases/evidence, soft-delete media, reopen closed cases.
- **DETECTIVE** — operational owner; creates and manages cases/evidence/tasks/team, transfers custody.
- **ANALYST** — read-mostly support; can update only their own tasks; can upload media.

### Sensitivity & non-functionals

- **High data sensitivity** — criminal investigations; access must be strictly role-gated client-side as well as server-side. No raw tokens in URL/logs.
- **No real-time push in V1** — RabbitMQ is server-internal. Frontend approximates real-time via polling.
- **Strict server-side validation** — frontend mirrors server rules for UX, but must always handle 400/403/404/409 responses gracefully.
- **Accessibility** — enterprise users including keyboard-only workflows; target WCAG 2.1 AA.

---

## 2. Backend Analysis Summary

### 2.1 System Requirements

| Dimension | Finding |
|---|---|
| Core workflows | Investigation lifecycle, evidence custody chain, task lifecycle, media upload/download, audit traversal |
| Users / roles | `ADMIN`, `DETECTIVE`, `ANALYST` (encoded in Keycloak JWT, enforced by `RolesGuard`) |
| Data sensitivity | High (criminal/operational investigations) |
| Performance | Gateway throttles 100 req/60s/IP; auth 20/60s — frontend must batch and back off |

### 2.2 Technology Constraints from Backend

| Constraint | Implication for FE |
|---|---|
| **Stack** NestJS + PostgreSQL + RabbitMQ + Keycloak (OIDC RS256) + S3 | Standard REST over HTTPS; no SDK needed |
| **API Gateway** at `http://localhost:3000` (single base URL) | One axios baseURL; route prefixing matches services |
| **Auth** Bearer JWT issued by Keycloak via `/auth/login`; refresh via `/auth/refresh` | Token refresh interceptor on 401 |
| **Authorization** Role baked into JWT (`realm_access.roles` → first of `ADMIN/DETECTIVE/ANALYST`) | Decode JWT or call `GET /auth/me` for role |
| **Microservices to integrate** 8 (auth, users, cases, involved, evidence, tasks, media, audit) | One typed client module per domain |
| **Real-time** None — server-internal RabbitMQ only | Polling strategy (see §6.5) |
| **File storage** S3 with presigned download URLs (1h TTL) | `<a href>` to presigned URL, never proxy through backend |
| **Pagination** `{ data, total, page, limit }`; defaults page=1, limit=20, max 100 (audit 1000) | One generic `Paginated<T>` type |
| **Field casing** camelCase everywhere **except** media upload form (`entity_type`, `entity_id`) and audit query (`entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`) | Per-service DTO mapping where needed |

### 2.3 Functional Requirements

All endpoints catalogued in backend report §5. Frontend integrates against:

- **auth-service** (`/auth/*`): login, refresh, logout, me, validate.
- **user-service** (`/users/*`): create/list/get/update users (ADMIN-mostly).
- **case-service** (`/cases/*`): create, list, get, update, change-status, archive, team CRUD.
- **involved-service** (`/involved-persons/*`): register persons, link to cases.
- **evidence-service** (`/evidence/*`): register, list, get (mutates COC!), update, transfer-custody, archive, chain-of-custody.
- **task-service** (`/tasks/*`): create, list (sweeps overdue!), get, update, change-status.
- **media-service** (`/media/*`): multipart upload, per-entity list, get, presigned download URL, soft-delete.
- **audit-service** (`/audit/*`): query, by-entity timeline, by-user, by-id.

### 2.4 Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | JWT in memory + refresh token; no PII in URL; HTTPS only in production; role-gated UI; CSP-friendly stack |
| Performance | Initial load < 2s on typical office network; route-level code splitting; TanStack Query cache for read endpoints |
| Scalability | Folder structure mirrors microservices so new domains slot in independently |
| Accessibility | WCAG 2.1 AA; keyboard navigation across forms/tables/dialogs; screen-reader labels on icon buttons |

---

## 3. Technology Stack & Justifications

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript** | Largest ecosystem for enterprise admin apps, deep tooling, great library support for tables/forms/auth. Vue/Svelte have smaller enterprise component libraries; Angular is heavier than needed for an 8-domain SPA |
| Build tool | **Vite** | Fast dev server with HMR for a multi-domain app; first-class TS; modern ESM output; far better DX than CRA/Webpack |
| Routing | **React Router v6** | Mature, supports nested routes for `/cases/:id/{evidence,tasks,team,involved,audit}` pattern naturally |
| Server state | **TanStack Query (React Query) v5** | The backend is REST-paginated, no real-time, polling-driven — exactly the use case TanStack Query nails. Cache invalidation, background refetch, `refetchInterval` for polling, retry/backoff for 429 |
| Client state | **Zustand** | Minimal client-side state needed (auth, UI prefs, dialogs). Redux Toolkit is overkill here; Context API would re-render too widely; Zustand is ~1KB with selectors |
| HTTP client | **Axios** | Interceptors for `Authorization` and 401-refresh are first-class; better cancellation ergonomics than fetch for this app size |
| UI components | **shadcn/ui** (Radix primitives + Tailwind) | Owned-in-repo (no version lock-in), accessible by default (Radix), highly customizable for the law-enforcement neutral/professional aesthetic. MUI is heavier and harder to theme; Chakra requires a runtime emotion overhead |
| Styling | **Tailwind CSS** | Pairs natively with shadcn/ui; fastest iteration; zero runtime cost; small final CSS via purging |
| Forms | **React Hook Form + Zod** | Most DTOs have strict validators (`@IsUUID`, `@IsEnum`, `@IsDateString`, `@MinLength`) → Zod schemas can mirror backend validators 1:1. RHF gives us un-controlled performance for large case/evidence forms |
| Tables | **TanStack Table v8** | Headless table for paginated case/task/audit lists; integrates naturally with TanStack Query pagination state |
| Date/time | **date-fns** + **date-fns-tz** | Tree-shakeable; precise control for ISO-8601 (`YYYY-MM-DD`) inputs the backend expects; lighter than moment/luxon |
| File upload | **Native FormData** + axios `onUploadProgress` | Backend re-verifies MIME via magic bytes; FE only needs progress + size pre-check |
| Toasts/notifications | **sonner** | Lightweight, accessible, plays well with shadcn/ui |
| Icons | **lucide-react** | Default for shadcn/ui; tree-shakeable |
| Drag-and-drop | **@dnd-kit/core** + **@dnd-kit/sortable** | Powers the Kanban board; accessible (keyboard + screen reader), tree-shakeable, lighter than `react-beautiful-dnd` (which is unmaintained) |
| Error tracking | **Sentry** (browser SDK) | Capture client exceptions and failed API calls; respect privacy (no PII in breadcrumbs) |
| Testing | **Vitest** + **React Testing Library** + **MSW** (mock-service-worker) | Vitest matches Vite; MSW lets us mock the 8 services without coupling to fetch internals; Playwright for E2E in Phase 9 |
| Lint/format | **ESLint** (typescript-eslint, react, react-hooks, jsx-a11y) + **Prettier** | jsx-a11y enforces our a11y goals; Prettier removes style debates |
| i18n | **Deferred** (not in V1) | Backend is single-locale; messages currently English/Spanish-mixed. Add `react-intl` only if a second locale lands |
| Analytics | **Deferred** | Law-enforcement context; do not ship third-party analytics in V1 |

### 3.1 Rejected alternatives (with reasoning)

- **Redux Toolkit + RTK Query** — RTK Query overlaps with TanStack Query but is more verbose; Redux adds boilerplate we don't need for an app whose client state is essentially `{ auth, ui }`.
- **MUI** — Beautiful but theming the professional/neutral law-enforcement aesthetic away from "Material" is significant work, and bundle weight is higher.
- **Next.js / Remix** — No SEO needs; this is an authenticated app behind a login wall. SSR adds operational complexity without clear gain.
- **GraphQL/Apollo** — Backend is REST and event-driven; introducing a BFF is out of scope for V1.

---

## 4. Architecture & Design

### 4.1 Service architecture

- **One typed client module per backend service** under `src/services/<domain>/`, each exposing:
  - `*.api.ts` — raw axios calls returning typed promises.
  - `*.types.ts` — request/response TypeScript types (mirroring backend DTOs and entity JSON).
  - `*.queries.ts` — TanStack Query `useQuery`/`useMutation` hooks built on the api functions.
  - `*.schemas.ts` — Zod schemas for forms (mirror backend `class-validator`).
- All clients share a single `httpClient` axios instance with the auth interceptor.
- The audit endpoints and media upload have their **own DTO mappers** that translate camelCase ↔ snake_case at the network boundary, so the rest of the app uses camelCase uniformly.

### 4.2 State management design

| Layer | Scope | Tool | Examples |
|---|---|---|---|
| **Server state** | Cached responses from backend | TanStack Query | `useCase(id)`, `useTasks(filters)`, `useAuditFeed()` |
| **Auth state** | Tokens + decoded user | Zustand (`useAuthStore`) | `accessToken`, `refreshToken`, `user: { sub, email, role }` |
| **UI state** | Modals, dialogs, layout prefs | Zustand (`useUiStore`) or local `useState` | Evidence-view-confirmation dialog open, sidebar collapsed |
| **Form state** | In-progress form values | React Hook Form | Create case form, transfer custody form |
| **URL state** | Filters, pagination | React Router search params | `?page=2&assignedToUserId=...` synced with TanStack Query keys |

**Tokens live in memory** (Zustand store), with the refresh token mirrored to `sessionStorage` so a tab refresh can re-bootstrap. We do **not** put the access token in `localStorage` (XSS exfiltration risk).

### 4.3 Error handling strategy

The backend has a uniform error envelope (see backend report §9):

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

### 4.4 Permission model implementation

The canonical role/action matrix lives in `src/auth/permissions.ts`, mirroring backend report §2.1 and `libs/auth/src/permissions.reference.ts`. Two primitives:

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

### 4.5 Critical UX guards

These come straight from the backend's side-effect endpoints (report §3.6, §6.2) and must be implemented as explicit components:

- **`<EvidenceViewDialog>`** — wraps `GET /evidence/:id`. Required because viewing inserts a chain-of-custody row with `transferReason="Viewed by user"` and mutates `currentCustodianId = viewer.sub`. Detail page must:
  1. Default to showing read-only summary using the list payload + `GET /evidence/:id/chain-of-custody`.
  2. Require explicit confirmation ("Viewing this evidence will record you as the current custodian") before calling `GET /evidence/:id`.
- **`<MediaUpload>`** — uses snake_case form keys (`entity_type`, `entity_id`); pre-check file size against `MAX_FILE_SIZE` (default 50 MB) and reject locally above 100 MB hard cap.
- **`<TaskStatusPicker>`** — disables `CANCELLED` for ANALYST, disables all transitions when `status === COMPLETED` or `CANCELLED`.
- **`<ArchiveButton>`** — visible only to ADMIN; double-confirm; uses `PATCH /cases/:id/archive` or `PATCH /evidence/:id/archive`.
- **`<KanbanBoard>`** — Jira-style board for tasks (see Phase 6 spec). Columns mapped to `TaskStatus`, drag-and-drop changes status via `PATCH /tasks/:id/status`, client-side enforcement of analyst/COMPLETED/CANCELLED rules, fully keyboard-accessible, drag disabled on `< md` viewports.

### 4.6 Visual Design System

The app's visual language is **professional, neutral, and information-dense** — closer to enterprise tooling (Linear, GitHub) than consumer software. The user is doing serious work over long sessions; the UI must reduce cognitive load, never compete for attention. Tokens live in `tailwind.config.ts` and CSS variables in `styles/globals.css`, so shadcn primitives consume them automatically.

#### 4.6.1 Color tokens (semantic, not raw)

Tokens are HSL CSS variables to support light/dark switching. Components reference semantic names only — never raw hex.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `0 0% 100%` | `222 47% 8%` | Page background |
| `--foreground` | `222 47% 11%` | `210 20% 95%` | Body text |
| `--muted` | `210 16% 96%` | `217 33% 14%` | Subtle surfaces (table headers, disabled fields) |
| `--muted-foreground` | `215 16% 40%` | `215 16% 60%` | Secondary text, metadata |
| `--card` | `0 0% 100%` | `222 47% 10%` | Card / panel surface |
| `--border` | `214 20% 88%` | `217 33% 20%` | Divider, input border |
| `--primary` | `215 65% 30%` | `212 80% 60%` | Brand: deep institutional blue. Primary actions, links |
| `--primary-foreground` | `0 0% 100%` | `222 47% 8%` | Text on primary |
| `--accent` | `215 30% 92%` | `217 33% 18%` | Hover / selected row |
| `--destructive` | `0 72% 45%` | `0 70% 55%` | Delete, archive, irreversible actions |
| `--warning` | `38 92% 45%` | `40 90% 55%` | OVERDUE, "viewing records you as custodian" |
| `--success` | `142 60% 35%` | `142 55% 50%` | COMPLETED, successful upload |
| `--info` | `200 75% 40%` | `200 70% 55%` | Info banners, audit highlights |

Brand rationale: the deep institutional blue evokes uniform/badge contexts without being literal; it stays legible at small sizes and reads as "serious" rather than "consumer-friendly."

#### 4.6.2 Enum → color mapping

Every status/priority enum from the backend renders as a `<Badge>` with consistent colors so users build muscle memory across modules.

**`CaseStatus`**
| Value | Color | Badge variant |
|---|---|---|
| `OPEN` | `--info` | outline |
| `UNDER_INVESTIGATION` | `--primary` | solid |
| `PAUSED` | `--muted-foreground` | outline |
| `CLOSED` | `--success` | subtle |

**`CasePriority` / `TaskPriority`**
| Value | Color |
|---|---|
| `LOW` | `--muted-foreground` |
| `MEDIUM` | `--info` |
| `HIGH` | `--warning` |
| `CRITICAL` / `URGENT` | `--destructive` |

**`TaskStatus`**
| Value | Color |
|---|---|
| `PENDING` | `--muted-foreground` |
| `IN_PROGRESS` | `--info` |
| `COMPLETED` | `--success` |
| `OVERDUE` | `--destructive` (high-emphasis: solid badge + icon) |
| `CANCELLED` | `--muted` (strikethrough title in lists) |

**`EvidenceStatus`**
| Value | Color |
|---|---|
| `REGISTERED` | `--info` |
| `IN_CUSTODY` | `--primary` |
| `TRANSFERRED` | `--warning` |
| `ARCHIVED` | `--muted-foreground` |

**`InvolvementType`**
| Value | Color |
|---|---|
| `VICTIM` | `--info` |
| `SUSPECT` | `--destructive` |
| `WITNESS` | `--warning` |
| `OTHER` | `--muted-foreground` |

Archived entities (`archived: true` on cases/evidence, `deleted: true` on media) render with reduced opacity (`opacity-60`) and a small "Archived" pill regardless of their status badge.

#### 4.6.3 Typography

- **Family:** `Inter` (UI) with system fallback (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). `JetBrains Mono` for IDs, hashes, S3 keys, JSON snippets in the audit viewer.
- **Scale (Tailwind):** `text-xs` (12px) metadata · `text-sm` (14px) body/tables · `text-base` (16px) form inputs · `text-lg` (18px) section titles · `text-xl` (20px) page titles · `text-2xl` (24px) dashboard headings.
- **Weight:** body `400`, emphasis `500`, headings `600`. No `700`+ in UI chrome.
- **Line height:** `leading-normal` (1.5) for prose, `leading-tight` (1.25) for headings and tables.
- **Numerals:** `font-variant-numeric: tabular-nums` on all tables and counters so columns align.

#### 4.6.4 Spacing, radii, elevation

- **Spacing scale:** Tailwind default 4px base; UI uses primarily `2, 3, 4, 6, 8` (8/12/16/24/32 px).
- **Radii:** `--radius: 0.5rem` (8px) global; inputs/buttons `rounded-md`, cards `rounded-lg`, badges `rounded-full`.
- **Elevation:** minimal — `shadow-sm` for cards, `shadow-md` for dialogs/popovers, no shadows on lists or tables. Borders carry structure, not shadows.
- **Layout grid:** sidebar `w-64` (collapsible to `w-16`), top bar `h-14`, content max-width `max-w-7xl` with `px-6` gutters.

#### 4.6.5 Density

Two density modes, persisted in `useUiStore`:

- **Comfortable** (default) — table rows `h-12`, form fields `h-10`. Used everywhere by default.
- **Compact** — table rows `h-9`, form fields `h-8`. Toggle on audit/task list views where the user scans many rows.

#### 4.6.6 Iconography

- **Library:** `lucide-react`, sized `h-4 w-4` inline, `h-5 w-5` in buttons, `h-6 w-6` in section headers.
- **Conventions:** stroke-only icons; never filled. Status icons paired with badges (e.g. `AlertTriangle` for OVERDUE, `CheckCircle2` for COMPLETED, `ShieldAlert` for evidence view warnings, `Lock` for archived).
- **Color:** inherit from text by default; only colored when paired with a semantic state.

#### 4.6.7 Light & dark mode

Both ship from day one. Toggle in the top bar, persisted in `localStorage` (`aegiscase:theme = light | dark | system`). `system` follows `prefers-color-scheme`. Dark mode is the recommended default for night-shift operational use.

#### 4.6.8 Motion

Restrained. `transition-colors` and `transition-opacity` on interactive elements (150 ms). No spring physics, no page transitions. Dialogs use shadcn defaults (~200 ms fade + 4 px translate). Respect `prefers-reduced-motion`: disable all non-essential transitions when set.

#### 4.6.9 Accessibility tokens

- Minimum contrast: text `4.5:1`, large text and icons `3:1`. All semantic tokens above pass WCAG AA against their paired foreground.
- Focus ring: `ring-2 ring-primary ring-offset-2 ring-offset-background` on every interactive element. Never `outline: none` without a replacement.
- Hit targets: minimum `40 × 40 px`. Icon-only buttons always carry `aria-label`.

#### 4.6.10 Page archetypes

To keep visual rhythm consistent, every screen follows one of four archetypes:

| Archetype | Used for | Layout |
|---|---|---|
| **List** | `/cases`, `/users`, `/tasks`, `/evidence`, `/audit` | Page title + filters bar + `DataTable` + `PaginationBar` |
| **Detail** | `/cases/:id`, `/evidence/:id`, `/tasks/:id`, `/involved/:id` | Breadcrumb + entity header (title, status badges, key metadata, action menu) + tabs (Overview · Evidence · Tasks · Involved · Audit · Media) |
| **Form** | `/cases/new`, `/users/new`, edit pages | Card-centered, max `max-w-2xl`, label-above-input, sticky action bar |
| **Dashboard** | `/dashboard` per role | Grid of cards (`grid-cols-1 lg:grid-cols-3`), each card a focused widget |

#### 4.6.11 Responsive design

**Desktop-first, but 100% mobile-compatible.** The app is optimized for ≥ 1280 px (the realistic working surface for investigators), and remains fully usable down to 360 px (field/phone use for status checks, quick task updates, evidence intake from the scene).

**Tailwind breakpoints used:**

| Token | Min width | Primary use |
|---|---|---|
| `sm` | 640 px | Phones in landscape |
| `md` | 768 px | Tablets |
| `lg` | 1024 px | Small laptop / desktop (target floor for full-feature parity) |
| `xl` | 1280 px | Standard desktop (design baseline) |
| `2xl` | 1536 px | Wide desktop |

**Responsive behavior by archetype:**

| Archetype | < `md` (mobile) | `md`–`lg` (tablet) | ≥ `lg` (desktop) |
|---|---|---|---|
| Shell | Sidebar collapses to bottom drawer triggered by a top-bar menu icon; top bar sticky | Sidebar collapsible (`w-16`) | Sidebar expanded (`w-64`) |
| List | Cards (one per row) replace `DataTable`; non-essential columns hidden; filter bar collapses into a `Sheet` | `DataTable` with reduced columns | Full `DataTable` |
| Detail | Tabs become a horizontally scrollable scroller; entity header stacks vertically; action menu collapses into a `…` menu | Two-column inner layout | Two/three-column inner layout |
| Form | Single column, full width, sticky bottom action bar | Single column max `max-w-2xl` | Centered card `max-w-2xl` |
| Dashboard | `grid-cols-1`, cards stack | `grid-cols-2` | `grid-cols-3` |
| **Kanban** | Single visible column with horizontal swipe between status columns + segmented control to jump | 2 columns scrollable | All 5 status columns visible with horizontal scroll if needed |

**Rules:**
- Touch targets stay ≥ 44 × 44 px on `< md` (overrides the 40 px desktop minimum).
- Tables that cannot collapse cleanly (audit, custody chain) become horizontally scrollable with a sticky first column, never get truncated.
- Dialogs become full-screen `Sheet`s on `< md` to preserve form ergonomics.
- File upload supports the device camera on `< md` via `<input capture="environment">` for evidence intake from the field.
- No hover-only affordances: every action reachable by hover on desktop must have a tap-equivalent on mobile (long-press is **not** used — visible buttons or menus only).

**Testing matrix:** every feature is verified on three viewport profiles before merge — `375 × 812` (mobile), `768 × 1024` (tablet), `1440 × 900` (desktop). Playwright E2E suite (Phase 9) runs against the desktop profile; visual smoke runs against mobile.

#### 4.6.12 Implementation notes

- All tokens defined once in `styles/globals.css` (CSS vars) and `tailwind.config.ts` (semantic theme).
- shadcn/ui primitives consume these tokens automatically — no per-component color overrides in feature code.
- A `/styleguide` route (dev-only, gated behind `import.meta.env.DEV`) renders every token, badge, and archetype for visual regression review.

---

## 5. Authentication & Authorization

### 5.1 Login flow

1. User enters email + password on `/login`.
2. `POST /auth/login` → `{ access_token, refresh_token, token_type, expires_in, refresh_expires_in }`.
3. Tokens go into `useAuthStore`. Refresh token also into `sessionStorage` (for tab restore).
4. `GET /auth/me` resolves `{ sub, email, role, keycloak_user_id }` → stored as `user`.
5. Redirect to `/dashboard` (role-specific dashboard).

### 5.2 Token lifecycle

- **Access token** — kept in memory only; attached as `Authorization: Bearer …` by axios request interceptor.
- **Refresh** — axios response interceptor catches `401`, queues parallel requests, calls `POST /auth/refresh`, retries the original request once. If refresh fails (Keycloak returns 401), force logout.
- **Logout** — `POST /auth/logout { refresh_token }` (the endpoint is `@Public()` — works with expired access token), then clear stores + storage, redirect to `/login`.
- **Tab visibility** — when the tab regains focus and the access token is within 30s of expiry, proactively refresh.

### 5.3 Role enforcement

- Role is read from `GET /auth/me`. We **do not parse the JWT for role** (the backend already does the `realm_access.roles → domain role` mapping; doing it client-side risks drift).
- `RoleGate` and `usePermissions().can(action)` enforce UI gating.
- Route-level: a `<ProtectedRoute roles={...}>` wrapper redirects unauthorized users to `/dashboard` or `/login`.

### 5.4 Stale-token edge cases

- If the user is logged in but the underlying Keycloak user was deactivated, the next refresh returns 401 → forced logout.
- The 503 (Keycloak unavailable) shows a banner; do **not** auto-retry refresh aggressively (it counts against the auth rate limit of 20/60s).

---

## 6. API Integration

### 6.1 Base configuration

```ts
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});
```

Interceptors: auth header injection, 401-refresh, 429 exponential back-off, error normalization.

### 6.2 Service inventory (mapped to FE modules)

| Backend service | FE module | Key endpoints | Notes |
|---|---|---|---|
| auth-service | `services/auth` | login, refresh, logout, me, validate | Tokens in memory |
| user-service | `services/users` | POST/GET/PUT users | ADMIN-only for writes |
| case-service | `services/cases` | CRUD + status + archive + team | Team is loaded only on `GET /cases/:id` |
| involved-service | `services/involved` | CRUD + link-to-case | `caseId` not validated by backend → FE must verify |
| evidence-service | `services/evidence` | CRUD + transfer + archive + COC | **`GET /:id` mutates** — wrap in dialog |
| task-service | `services/tasks` | CRUD + status | List triggers `OVERDUE` sweep |
| media-service | `services/media` | upload + by-entity + download-url + delete | Snake_case form fields; presigned URL for download |
| audit-service | `services/audit` | query + by-entity + by-user + by-id | Snake_case query params |

### 6.3 Caching strategy (TanStack Query)

| Resource | `staleTime` | `cacheTime` / `gcTime` | `refetchInterval` |
|---|---|---|---|
| `/auth/me` | Infinity (until logout) | Infinity | — |
| `/users` list | 5 min | 10 min | — |
| `/cases` list | 1 min | 5 min | — |
| `/cases/:id` | 30 s | 5 min | 60 s (on detail page focus) |
| `/tasks` for me | 0 | 5 min | 30–60 s (drives overdue sweep) |
| `/evidence` list | 30 s | 5 min | — |
| `/evidence/:id` | Manual fetch only (via dialog) | 1 min | — |
| `/evidence/:id/chain-of-custody` | 30 s | 5 min | 60 s on detail focus |
| `/audit` feed | 0 | 5 min | 30 s (when feed widget visible) |
| `/media/entity/:type/:id` | 1 min | 5 min | — |

Mutations invalidate the relevant list queries (`cases`, `cases.detail(id)`, `cases.team(id)`, etc.) using strict query keys like `['cases', { page, limit }]`.

### 6.4 Pagination integration

- One generic `usePaginatedQuery<T>(key, fetcher, { page, limit })` returning `{ data, total, page, limit }`.
- URL search params drive `page` and filter state so deep links and back/forward work.
- For endpoints that **lack** pagination (`/media/entity/...`, `/cases/:id/team`, `/audit/entity/...`, `/evidence/:id/chain-of-custody`, `/involved-persons/:id/cases`), we accept the raw array and paginate client-side if needed.

### 6.5 Polling strategy (replacement for real-time)

| Surface | Endpoint | Interval | Trigger |
|---|---|---|---|
| My active tasks widget | `GET /tasks?assignedToUserId=<me>` | 30–60 s | While dashboard mounted |
| Case detail | `GET /cases/:id` + tasks/evidence subqueries | 60 s | While route active and tab visible |
| Audit feed | `GET /audit?from_date=<lastSeenIso>&limit=100` | 30 s | While feed widget visible |
| Task detail | `GET /tasks/:id` | 60 s | Active route only |

All polling is `refetchIntervalInBackground: false` so hidden tabs do not eat the 100 req/60s budget.

### 6.6 Field-casing translation

The data layer handles all DTO mapping at the network boundary. The app code only ever sees camelCase.

```ts
// services/audit/audit.api.ts
function toAuditQuery(input: AuditQuery): URLSearchParams {
  return new URLSearchParams({
    ...(input.entityType && { entity_type: input.entityType }),
    ...(input.entityId && { entity_id: input.entityId }),
    ...(input.userId && { user_id: input.userId }),
    ...(input.fromDate && { from_date: input.fromDate }),
    ...(input.toDate && { to_date: input.toDate }),
    ...(input.action && { action: input.action }),
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });
}
```

Same pattern for `POST /media` multipart fields.

---

## 7. Business Workflows → Screens

Each workflow from backend report §6 maps to a route and a small component tree.

| Workflow | Screens | Components |
|---|---|---|
| Login / refresh | `/login` | `LoginForm`, `AuthProvider` |
| Investigation lifecycle | `/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit` | `CaseList`, `CaseForm`, `CaseDetail`, `CaseStatusPicker`, `ArchiveButton` |
| Team management | `/cases/:id/team` | `TeamMemberList`, `AddTeamMemberDialog` |
| Involved persons | `/involved`, `/involved/:id`, `/cases/:id/involved` | `InvolvedList`, `InvolvedForm`, `LinkToCaseDialog` |
| Evidence + COC | `/cases/:id/evidence`, `/evidence/:id`, `/evidence/:id/chain` | `EvidenceList`, `EvidenceViewDialog`, `EvidenceForm`, `TransferCustodyDialog`, `CustodyChainTimeline` |
| Task lifecycle | `/tasks`, `/tasks/:id`, `/cases/:id/tasks` | `TaskBoard`, `TaskForm`, `TaskStatusPicker`, `OverdueBadge` |
| Media | embedded in case/evidence/task/involved pages + `/media/upload` | `MediaUpload`, `MediaGallery`, `MediaDownloadLink` |
| Audit | `/audit`, `/cases/:id/audit`, `/audit/user/:id` | `AuditFilters`, `AuditFeed`, `AuditTimeline` |
| User admin | `/users`, `/users/new`, `/users/:id` | `UserList`, `UserForm` (ADMIN-only) |

### 7.1 Critical UX flows

- **Creating a case** → form → on success, redirect to `/cases/:id` with team-builder prompt.
- **Viewing evidence detail** → list → click → `EvidenceViewDialog` ("This will record you as the current custodian. Continue?") → on confirm, fetch `GET /evidence/:id` → render detail.
- **Transferring custody** → from detail → `TransferCustodyDialog` selects new custodian and reason → invalidates evidence + COC queries.
- **Uploading media** → from any entity detail → drag-and-drop → local size/MIME hint → multipart upload with progress → on success, append to gallery (TanStack Query optimistic update).
- **Browsing audit** → top-level audit page with filters; per-entity tab on every entity detail showing chronological timeline.

---

## 8. Folder Structure

```
src/
├── app/
│   ├── App.tsx                 # Router + providers
│   ├── routes.tsx              # Route tree (lazy-loaded per module)
│   └── providers/
│       ├── QueryProvider.tsx   # TanStack Query client
│       ├── AuthProvider.tsx    # Hydrates auth from session
│       └── ToastProvider.tsx   # sonner mount
│
├── auth/
│   ├── permissions.ts          # Canonical role/action matrix
│   ├── RoleGate.tsx
│   ├── ProtectedRoute.tsx
│   └── usePermissions.ts
│
├── services/                   # One folder per backend microservice
│   ├── http/
│   │   ├── client.ts           # axios instance + interceptors
│   │   └── errors.ts           # ApiError normalization
│   ├── auth/
│   │   ├── auth.api.ts
│   │   ├── auth.types.ts
│   │   └── auth.queries.ts
│   ├── users/         …
│   ├── cases/         …
│   ├── involved/      …
│   ├── evidence/      …
│   ├── tasks/         …
│   ├── media/         …
│   └── audit/         …
│
├── features/                   # Domain UI grouped by microservice
│   ├── cases/
│   │   ├── pages/              # CaseListPage, CaseDetailPage, …
│   │   ├── components/         # CaseForm, CaseStatusPicker, …
│   │   └── schemas/            # Zod schemas for case forms
│   ├── evidence/    …
│   ├── tasks/       …
│   ├── involved/    …
│   ├── media/       …
│   ├── audit/       …
│   ├── users/       …
│   └── auth/        …
│
├── components/                 # Shared UI building blocks
│   ├── ui/                     # shadcn/ui generated primitives
│   ├── data/
│   │   ├── DataTable.tsx       # TanStack Table wrapper
│   │   ├── PaginationBar.tsx
│   │   └── EmptyState.tsx
│   ├── layout/
│   │   ├── AppShell.tsx        # sidebar + header
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── feedback/
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
│
├── stores/
│   ├── auth.store.ts           # Zustand
│   └── ui.store.ts
│
├── hooks/
│   ├── usePaginatedQuery.ts
│   ├── useDebouncedValue.ts
│   └── useVisibility.ts        # tab-visibility for polling pause
│
├── lib/
│   ├── date.ts                 # date-fns wrappers (ISO date helpers)
│   ├── format.ts
│   └── env.ts
│
├── types/
│   ├── api.ts                  # Paginated<T>, ApiError, JwtPayload
│   └── domain.ts               # Re-exports of entity types from services
│
├── styles/
│   ├── globals.css             # Tailwind base + tokens
│   └── tailwind.css
│
└── main.tsx
tests/
├── unit/                       # Vitest + RTL
├── integration/                # MSW-driven flows
└── e2e/                        # Playwright (Phase 9+)
```

Folder rules:
- **`services/`** is the only place that knows about HTTP, snake_case mapping, or TanStack Query keys.
- **`features/`** consumes `services/` hooks; it does **not** make raw HTTP calls.
- **`components/ui/`** holds shadcn-generated primitives — never edit them outside `components/ui`.

---

## 9. Frontend Development Phases

Ten phases. Each is independently shippable to staging; the order respects backend integration dependencies.

### Phase completion log

| Phase | Status | Docs |
|---|---|---|
| 0 — Tooling & component baseline | ✅ Completed | [docs/phase-0-tooling-baseline.md](docs/phase-0-tooling-baseline.md) · [manual test](docs/phase-0-manual-testing.md) |
| 1 — Auth, session, role gating | ⬜ Not started | — |
| 2 — Users module | ⬜ Not started | — |
| 3 — Cases module | ⬜ Not started | — |
| 4 — Involved persons | ⬜ Not started | — |
| 5 — Evidence + COC | ⬜ Not started | — |
| 6 — Tasks + Kanban | ⬜ Not started | — |
| 7 — Media | ⬜ Not started | — |
| 8 — Audit & feeds | ⬜ Not started | — |
| 9 — Polling, polish, E2E | ⬜ Not started | — |
| 10 — Perf, a11y, hardening | ⬜ Not started | — |

When a phase ships, update this table and link to its `docs/phase-N-*.md` pair.

### Phase 0 — Tooling & component baseline (1–2 days)

- **Objective:** Vite + React + TS scaffold; ESLint/Prettier/Vitest; Tailwind; shadcn/ui init; CI lint+typecheck job; baseline `<AppShell>` with role-aware sidebar; environment config (`VITE_API_BASE_URL`).
- **Deliverables:** Project compiles, Storybook (optional) or showcase route renders shadcn primitives. Husky pre-commit running ESLint+Prettier.
- **Backend integrations:** none.
- **Success criteria:** `npm run build`, `npm test`, `npm run lint` all green in CI.
- **Dependencies:** none.

### Phase 1 — Auth, session, and role gating (3–4 days)

- **Objective:** Implement `/login`, token storage, axios interceptors, `GET /auth/me`, `RoleGate`, `ProtectedRoute`, logout, refresh.
- **Deliverables:** Working login for all three roles; auto-logout on refresh failure; sidebar items hidden by role.
- **Backend integrations:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/validate`.
- **Success criteria:** All three roles can log in; access token refresh works transparently on 401; 403 from any backend route surfaces a clear toast.
- **Dependencies:** Phase 0.

### Phase 2 — Users module (ADMIN) and shared list/form patterns (3–4 days)

- **Objective:** Users CRUD as the canonical "list + detail + form" pattern. Establishes `DataTable`, `PaginationBar`, RHF+Zod conventions, optimistic-update conventions.
- **Deliverables:** `/users`, `/users/new`, `/users/:id` working under ADMIN; non-ADMIN sees 403-safe fallback.
- **Backend integrations:** `POST/GET/PUT /users`, `GET /users/:id`.
- **Success criteria:** Pagination, validation errors (NestJS array format) map to RHF fields; 409 conflicts on `document` show inline.
- **Dependencies:** Phase 1.

### Phase 3 — Cases module (5–7 days)

- **Objective:** Core case CRUD, status transitions, archive, team management.
- **Deliverables:** `/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit`, `/cases/:id/team`. Status picker with closed-case ADMIN-only reopen guard. ADMIN-only archive action with double-confirm.
- **Backend integrations:** `POST/GET/PUT /cases`, `PATCH /cases/:id/status`, `PATCH /cases/:id/archive`, `POST/GET /cases/:id/team`.
- **Success criteria:** Detective can drive a case from OPEN → UNDER_INVESTIGATION → CLOSED; admin can reopen; non-admin attempt to reopen is blocked client-side and shows the 403 if bypassed.
- **Dependencies:** Phase 2.

### Phase 4 — Involved persons module (3–4 days)

- **Objective:** Person registry and linking to cases.
- **Deliverables:** `/involved`, `/involved/:id`, link dialog from a case page, `/cases/:id/involved` tab.
- **Backend integrations:** `POST/GET/PUT /involved-persons`, `GET /involved-persons/:id/cases`, `POST /involved-persons/:id/cases/:caseId`.
- **Success criteria:** Linking respects involvement type enum; 409 (already linked) surfaces gracefully; client-side caseId pre-check (because backend does not validate it).
- **Dependencies:** Phase 3.

### Phase 5 — Evidence module + chain-of-custody UX (5–7 days)

- **Objective:** Most safety-critical module due to `GET /evidence/:id` side effect.
- **Deliverables:** `/cases/:id/evidence` list, evidence detail behind `EvidenceViewDialog`, COC timeline (`/evidence/:id/chain`), transfer custody dialog, ADMIN archive.
- **Backend integrations:** `POST/GET/PUT /evidence`, `GET /evidence/:id/chain-of-custody`, `PATCH /evidence/:id/transfer-custody`, `PATCH /evidence/:id/archive`.
- **Success criteria:** Detail page **never** auto-fetches `/evidence/:id` without explicit user confirmation; COC timeline renders chronologically; transfer invalidates both evidence and COC queries.
- **Dependencies:** Phase 3.

### Phase 6 — Tasks module + Kanban board (6–8 days)

- **Objective:** Task module with two complementary views — a **Kanban board** (primary) and a paginated list (secondary) — plus role-aware actions and OVERDUE handling.
- **Deliverables:**
  - `/tasks` defaulting to **Kanban view** (Jira-style), with a toggle to switch to list view (persisted in `useUiStore`).
  - `/tasks/:id` detail page.
  - `/cases/:id/tasks` showing the kanban scoped to that case.
  - My-tasks dashboard widget polling every 30–60 s.
  - `TaskStatusPicker` honoring analyst-only-own + cancel restrictions and COMPLETED-terminal rule.
  - `<KanbanBoard>` component (see below).
- **Kanban specification:**
  - **Columns:** one per `TaskStatus` — `PENDING`, `IN_PROGRESS`, `OVERDUE`, `COMPLETED`, `CANCELLED`. Each column shows count + cards ordered by `priority DESC` then `dueDate ASC`.
  - **Card content:** title, priority badge, assignee avatar/initials, due date (with "X days overdue" in `--destructive` when applicable), case code link.
  - **Drag-and-drop:** card drag changes status via `PATCH /tasks/:id/status`. Library: **`@dnd-kit/core`** (accessible, keyboard support, lighter than `react-beautiful-dnd`).
  - **Drop restrictions enforced client-side** (server still authoritative):
    - Cannot drop from `COMPLETED` (terminal — rule from backend, returns 400).
    - ANALYST cannot drop into `CANCELLED` (returns 403).
    - ANALYST can only drag cards where `assignedToUserId === user.sub` (others render non-draggable with a small lock icon).
  - **Optimistic update:** card moves immediately on drop; revert with toast if the mutation fails.
  - **Filters:** assignee, priority, case, due-date range — drive the same TanStack Query key used by the list view.
  - **Keyboard:** focus a card with `Tab`, `Space` to grab, arrow keys to move between columns, `Space` to drop (dnd-kit handles this).
  - **Responsive behavior:** see §4.6.11 — desktop shows all 5 columns; tablet 2 scrollable; mobile single column with swipe + segmented control. Drag-and-drop is **disabled on `< md`**; on mobile, status changes via the card's tap-to-open `TaskStatusPicker`.
  - **Polling:** kanban refetches every 30 s while visible (drives OVERDUE sweep server-side); newly-OVERDUE cards animate into the OVERDUE column.
- **Backend integrations:** `POST/GET /tasks`, `GET /tasks/:id`, `PUT /tasks/:id`, `PATCH /tasks/:id/status`.
- **Success criteria:**
  - All three roles can use the board within their permissions; analyst-restricted cards are visibly non-draggable and tap-actions hide forbidden transitions.
  - Dragging from `PENDING` → `IN_PROGRESS` → `COMPLETED` works end-to-end with optimistic UI and proper invalidation.
  - OVERDUE badge appears after server flip; cards reflow into the OVERDUE column without page refresh.
  - Toast surfaces newly-overdue tasks discovered during a poll.
  - Kanban is keyboard-navigable (Tab/Space/arrows) and passes axe-core.
  - Mobile experience: swipe between columns, tap card to change status via picker — no drag-and-drop required.
- **Dependencies:** Phase 3 (cases must exist).

### Phase 7 — Media (4–6 days)

- **Objective:** Upload + presigned-URL download + per-entity galleries.
- **Deliverables:** `MediaUpload` (drag-drop, progress, size/MIME pre-check), `MediaGallery` embedded in case/evidence/task/involved detail pages, presigned-URL download flow, ADMIN soft-delete.
- **Backend integrations:** `POST /media`, `GET /media/entity/:type/:id`, `GET /media/:id`, `GET /media/:id/download-url`, `DELETE /media/:id`.
- **Success criteria:** Files > 50 MB rejected before upload; presigned URL opens directly (no proxy); soft-delete removes from gallery; subsequent re-fetch shows 404.
- **Dependencies:** Phases 3–6 (galleries embed in their detail pages).

### Phase 8 — Audit & activity feeds (4–5 days)

- **Objective:** Searchable audit and per-entity timelines.
- **Deliverables:** `/audit` with filters (`entityType`, `entityId`, `userId`, `action`, date range), `/cases/:id/audit` and per-entity audit tabs, `<AuditFeed>` dashboard widget polling every 30 s.
- **Backend integrations:** `GET /audit`, `GET /audit/entity/:type/:id`, `GET /audit/user/:id`, `GET /audit/:id`.
- **Success criteria:** Snake_case query mapping correct; `userId="system"` (overdue events) rendered as "System" not a UUID; filter by action name from the catalog enum.
- **Dependencies:** Phases 3–7.

### Phase 9 — Polling-driven real-time approximation & polish (3–4 days)

- **Objective:** Coordinate polling, optimistic updates, tab-visibility pause; toast on newly-overdue tasks; E2E suite.
- **Deliverables:** `useVisibility` hook gating polling; optimistic UI on task status changes; Playwright E2E covering the 3 critical flows (login, evidence view-dialog, task lifecycle); Sentry integration.
- **Backend integrations:** none new.
- **Success criteria:** Tab in background does not poll; rate-limit budget stays under 100/60s in normal usage; E2E green in CI.
- **Dependencies:** Phases 1–8.

### Phase 10 — Performance, accessibility, hardening (ongoing post-V1)

- **Objective:** Lighthouse ≥ 90, axe-core clean, bundle ≤ 350 KB gzipped initial route.
- **Deliverables:** Code-split route bundles; image lazy-loading; axe-core in CI; keyboard navigation audit; CSP report-only header tested.
- **Success criteria:** WCAG 2.1 AA verified by axe; LCP ≤ 2.5 s on a 4G profile.
- **Dependencies:** Phase 9.

---

## 10. Development Standards

### 10.1 TypeScript

- `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- No `any` outside `services/http/*` (where untyped axios responses are normalized).
- Backend entity types live in `services/<domain>/<domain>.types.ts` and are re-exported from `types/domain.ts`.

### 10.2 Naming

- Files: `PascalCase.tsx` for components, `camelCase.ts` for everything else.
- TanStack Query keys: tuple of `['domain', 'subkey', params]` — e.g. `['cases', 'list', { page, limit }]`, `['cases', 'detail', id]`, `['cases', 'team', id]`. Centralized in `services/<domain>/<domain>.queryKeys.ts`.
- Zod schemas: `<Action><Entity>Schema`, e.g. `CreateCaseSchema`.

### 10.3 Lint & format

- ESLint with `typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`, `tailwindcss`.
- Prettier; run on pre-commit via Husky + lint-staged.
- CI gates: `npm run lint`, `npm run typecheck`, `npm test`.

### 10.4 Responsive standard

- **Mobile-compatible from day one** — every feature merged must work on `375 × 812` (mobile), `768 × 1024` (tablet), and `1440 × 900` (desktop) viewports.
- Use Tailwind responsive prefixes (`sm: md: lg: xl:`) — never write `@media` queries inline in components.
- No fixed pixel widths in feature code; use Tailwind tokens or `max-w-*` constraints.
- Hover-only affordances are forbidden — every action must be reachable via tap.
- The PR template includes a "Tested on mobile / tablet / desktop" checkbox; UI PRs require screenshots from at least two viewport profiles.

### 10.5 Testing conventions

- **Unit** — per-component / per-hook (Vitest + RTL).
- **Integration** — feature-level flows with MSW mocking the gateway (covers DTO casing, error paths).
- **E2E** — Playwright for login, evidence-view-dialog, task lifecycle (the three workflows where regressions would be worst).
- Coverage target: 70% statements globally, 90% on `services/` and `auth/` modules.

### 10.6 Commits & PRs

- Conventional commits (`feat:`, `fix:`, `refactor:`).
- One feature per PR; one screenshot per UI change; checklist for a11y + role-gating considerations.

---

## 11. Success Metrics & Quality Gates

| Metric | Target |
|---|---|
| Lighthouse Performance (login + dashboard) | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Initial JS bundle (gzipped) per route | ≤ 350 KB |
| TanStack Query cache hit rate on warm navigation | ≥ 60% |
| Unit/integration coverage | ≥ 70% global, ≥ 90% in `services/`, `auth/` |
| Axe-core violations in CI | 0 (critical + serious) |
| Sentry error rate (post-launch) | < 0.5 % of sessions |
| Polling budget (steady-state, single tab) | ≤ 60 req/60s (well under gateway 100/60s) |

### 11.1 Hard checklist before V1 ship

- [ ] All three roles complete a smoke run: login → dashboard → case lifecycle → logout.
- [ ] `GET /evidence/:id` is never invoked without explicit user confirmation.
- [ ] Token refresh works transparently and does not loop on Keycloak 503.
- [ ] Closed-case modification attempts surface "A closed case cannot be modified" inline.
- [ ] Analyst cannot send `CANCELLED`; UI removes the option.
- [ ] Media upload rejects > 50 MB before hitting the network.
- [ ] Presigned download URL is fetched lazily and opens directly (no proxy).
- [ ] Audit queries use snake_case at the network boundary; UI shows camelCase only.
- [ ] All entity detail pages render the audit tab populated for that entity.
- [ ] Rate-limit (`429`) is handled with back-off; no crash.
- [ ] Every screen verified on mobile (`375 × 812`), tablet (`768 × 1024`), and desktop (`1440 × 900`).
- [ ] Kanban board: drag-and-drop on desktop, tap-to-change-status on mobile; analyst restrictions visible and enforced; keyboard navigation works.

---

---

## 12. Running the Application

V1 runs **locally with Vite** — no Docker on the frontend yet. The backend is expected to be running separately (its own `docker-compose` from the backend repo), exposing the gateway at `http://localhost:3000`.

### 12.1 Prerequisites

- **Node.js** ≥ 20.x (LTS). Use `nvm use` if an `.nvmrc` is present.
- **npm** ≥ 10.x (ships with Node 20).
- **Backend running** at `http://localhost:3000` — bring it up first with the backend's `docker compose up` before starting the frontend, or the app will sit on retry banners.

### 12.2 First-time setup

```bash
git clone <repo-url> AegisCase_FE
cd AegisCase_FE
nvm use                    # if .nvmrc present
npm install
cp .env.example .env.local # then edit if backend is on a non-default URL
```

### 12.3 Environment variables

Vite only exposes vars prefixed with `VITE_`. All env files (`.env.local`, `.env.development`, `.env.production`) are gitignored except `.env.example` (committed).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | API gateway base URL — axios `baseURL` |
| `VITE_SENTRY_DSN` | empty (disabled) | Sentry browser DSN; leave empty in dev |
| `VITE_ENV` | `development` | Tags Sentry events and toggles dev-only UI (`/styleguide`) |

Never put secrets in `VITE_*` — anything `VITE_`-prefixed is **inlined into the client bundle** and visible to users.

### 12.4 npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173` with HMR. Default during development. |
| `npm run build` | Type-check + Vite production build → `dist/`. |
| `npm run preview` | Serve the `dist/` build locally on `http://localhost:4173` to sanity-check the production bundle. |
| `npm run typecheck` | `tsc --noEmit` — no JS output, just type checking. Used by CI. |
| `npm run lint` | ESLint over `src/`. |
| `npm run lint:fix` | ESLint with `--fix`. |
| `npm run format` | Prettier write over `src/`. |
| `npm test` | Vitest in watch mode (CI uses `npm test -- --run`). |
| `npm run test:e2e` | Playwright E2E suite (Phase 9+). Requires backend running. |

### 12.5 Typical dev session

```bash
# Terminal 1 — backend (in the backend repo)
docker compose up

# Terminal 2 — frontend (this repo)
npm run dev
# → open http://localhost:5173, log in with a seeded Keycloak user
```

### 12.6 CORS / network sanity checks

- The backend gateway returns `Access-Control-Allow-Origin: ${CORS_ORIGIN || '*'}` (backend report §12.5). If the browser console shows CORS errors, set `CORS_ORIGIN=http://localhost:5173` on the backend before debugging the frontend.
- If `/auth/login` returns `503`, Keycloak is not up — check the backend's `docker compose ps`.
- If every authenticated request returns `401` immediately after login, verify the system clock is in sync (Keycloak rejects tokens with skewed `iat`/`exp`).

### 12.7 What is intentionally *not* here (V1)

- **No frontend `Dockerfile`** — added only when staging deployment is on the table.
- **No frontend `docker-compose.yml`** — see above.
- **No reverse proxy / nginx config** — Vite dev server is enough; production hosting is TBD (likely static hosting + CDN).

When deployment work begins, this section will grow with a Dockerfile (multi-stage Node → nginx) and CI build instructions; until then, keep it local.

---

**End of document.** Updates to architecture or stack must land in this file before any code change; phase deliverables are amended here when scope shifts.
