# Phase 1 — Implementation Report

**Status:** Completed
**Scope contract:** [`docs/phases/phase-1/plan.md`](./plan.md)
**Backend integrations:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

---

## 1. What this phase delivered

A complete authentication flow against the Keycloak-backed `auth-service`: login, transparent 401 token refresh, logout, session restore on tab refresh, role-aware route protection, mobile-drawer sidebar, and a top-bar user menu. The Phase 0 dev scaffolding (`setPreviewRole`) is gone.

### 1.1 New dependencies (all justified in `docs/architecture/tech-stack.md`)

| Package | Why |
|---|---|
| `axios` | HTTP client with first-class interceptors (auth header + 401-refresh) |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form library + Zod resolver for the login form (and the canonical pattern for future phases) |
| `@radix-ui/react-label`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu` | Headless primitives behind the new shadcn `Label`, `Sheet`, `DropdownMenu` components |

### 1.2 New shadcn primitives in `src/components/ui/`

- `input.tsx` — text input with `aria-invalid` styling.
- `label.tsx` — Radix Label wrapper.
- `form.tsx` — RHF `<Form>` + `FormField/FormItem/FormLabel/FormControl/FormMessage` set. Mirrors shadcn defaults so future Zod-driven forms follow the same shape.
- `sheet.tsx` — Side-panel built on Radix Dialog; powers the mobile sidebar drawer (§4.6.11 archetype).
- `dropdown-menu.tsx` — User menu and any future row-actions.

### 1.3 HTTP layer

`src/services/http/client.ts`

- Singleton `httpClient` (`axios.create`) reading `baseURL` from `env.apiBaseUrl`.
- **Request interceptor**: injects `Authorization: Bearer <accessToken>` on every non-public route. The public list mirrors the backend's `@Public()` decorators: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/health`, `/`.
- **Response interceptor** (the heart of §5 in `auth.md`):
  - `429` → toast `"Too many requests. Retrying shortly…"` and reject (TanStack Query owns retries).
  - `401` on a protected route, not yet retried → set `_retried=true`, call `refreshAccessToken` (deduped via a single shared in-flight Promise so parallel 401s only trigger one refresh), retry the original request with the new token. If refresh fails, call `onUnauthorized()` (clears the store).
  - `403` → toast `"You don't have permission for this action"`.
  - `503` → toast `"A required service is unavailable. Try again shortly."`.
- `bindAuth({ getAccessToken, refreshAccessToken, onUnauthorized })` — wiring set by `AuthProvider` to avoid circular imports between store and client.

`src/services/http/errors.ts`

- `normalizeError(unknown)` → `{ status, message, fieldErrors? }`.
- Translates the NestJS `{ message: string[] }` envelope into per-field grouping for RHF `setError` (used in later phases).

### 1.4 Auth service

`src/services/auth/`

- `auth.types.ts` — wire types (snake_case `TokenResponseWire`, `MeResponseWire`) + camelCase domain types (`TokenResponse`, `AuthUser`).
- `auth.api.ts` — `login` / `refresh` / `logout` / `me`. Each function does the snake_case ↔ camelCase translation at the boundary, so the rest of the app sees camelCase only.
- `auth.queries.ts` — `useLoginMutation`, `useLogoutMutation` (clears the TanStack Query cache on settle).
- `auth.schemas.ts` — `LoginSchema` (Zod), `LoginFormValues`.

### 1.5 Auth state

`src/stores/auth.store.ts` (rewritten)

- Stores `{ accessToken, refreshToken, accessExpiresAt, user, bootstrapping }`.
- `accessToken`, `refreshToken`, `user` live **in memory only** (Zustand).
- `refreshToken` is **mirrored to `sessionStorage`** under `aegiscase:rt` so a tab refresh can recover the session (per `auth.md` §2). On `clear()`, the storage key is removed.
- `accessToken` is **never** persisted — XSS exfiltration risk.
- Actions: `setSession(tokens, user)`, `updateTokens(tokens)`, `setUser(user)`, `clear()`, `setBootstrapping(value)`.

### 1.6 Auth provider

`src/app/providers/AuthProvider.tsx`

- Mounted inside `BrowserRouter` (so navigation hooks work) and outside `AppRoutes`.
- **On mount**: calls `bindAuth(...)` to wire the http client to the store. Then checks `sessionStorage` for a refresh token; if found, runs `refresh` → `me` and seeds the session. If anything fails, clears state. Sets `bootstrapping=false` at the end.
- **Proactive refresh**: subscribes to `visibilitychange`. When the tab becomes visible and the access token expires in <30 s, refreshes ahead of time (so the next user click doesn't wait).
- `bootstrapping` is consumed by `ProtectedRoute` and `LoginPage` to render a "Restoring session…" placeholder instead of flashing the login form before the cookie restore completes.

### 1.7 Route protection

`src/auth/ProtectedRoute.tsx`

- Uses `<Outlet/>`; intended to wrap a tree of nested routes in `routes.tsx`.
- Shows "Restoring session…" while `bootstrapping`.
- If no `user`, redirects to `/login` and preserves the original location in `state.from` so the login form can return the user where they were.
- Optional `roles` prop: if set and the user's role is not in the list, toasts an error and redirects to `/`.

`src/app/routes.tsx`

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>
      <Route path="/" element={<DashboardPage />} />
      {env.isDev && <Route path="/styleguide" element={<StyleguidePage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Route>
</Routes>
```

### 1.8 Login page

`src/features/auth/pages/LoginPage.tsx` + `components/LoginForm.tsx`

- Form archetype per `docs/design-system.md` §10 (card-centered, label-above-input).
- Centered card on a `bg-muted` page; ShieldCheck mark; "Access is logged" footer line to reinforce the operational context.
- If the user is already authenticated, the page redirects to `/`.
- Form: RHF + Zod (`LoginSchema`). Submit handler:
  1. `POST /auth/login`.
  2. Temporarily sets tokens in the store (so the next call carries `Authorization`).
  3. `GET /auth/me` to fetch the operational identity.
  4. `setSession(tokens, user)`; success toast; `navigate(from ?? '/')`.
- Specific error mapping:
  - `401` → `"Invalid email or password."`
  - `503` → `"Authentication service is unavailable. Try again shortly."`
  - `status === 0` (no response, e.g. backend off) → `"Cannot reach the API at <VITE_API_BASE_URL>."`
  - Otherwise → the normalized message.

### 1.9 Shell updates

- `src/components/layout/Topbar.tsx` — rebuilt. The Phase-0 "Preview role" selector is gone. Now: mobile hamburger (`<MobileSidebar>`), `<ThemeToggle>`, `<UserMenu>`.
- `src/components/layout/Sidebar.tsx` — same role-filtered list, but `NAV_ITEMS` extracted into `nav-items.ts` for reuse.
- `src/components/layout/MobileSidebar.tsx` (new) — hamburger button visible only `< md`; opens a `Sheet` from the left with the same nav. Auto-closes on link click.
- `src/components/layout/UserMenu.tsx` (new) — avatar (initials) + email + dropdown with `Sign out`. Logout calls `POST /auth/logout` with the refresh token (best-effort; failure is swallowed because the user is leaving), then clears the store and navigates to `/login`.

### 1.10 Dashboard update

`src/features/dashboard/DashboardPage.tsx` — copy refresh: now mentions "signed in" + the user-menu sign-out path instead of the Phase-0 preview-role selector.

### 1.11 Tests added

- `src/stores/auth.store.test.ts` — 3 tests: initial state, `setSession` persistence, `clear` removes everything.
- `src/services/auth/auth.schemas.test.ts` — 3 tests: happy path, invalid email, short password.

Total: 8/8 passing.

### 1.12 Verified success criteria

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npm run test:run` | 8/8 pass |
| `npm run build` | 512 KB raw / **163 KB gzipped** initial bundle (under §11 350 KB target) |

Build emits a single chunk warning >500 KB raw — informational only. Per `docs/phases/phase-10/plan.md`, route-level code splitting (`React.lazy`) is explicitly Phase 10 scope; not addressing prematurely.

---

## 2. Notable decisions

- **Tokens binding via `bindAuth`** instead of importing the store directly in `client.ts`. Reason: keeps the http layer independent of any specific state library so it can be reused / tested in isolation, and avoids a cycle where the store imports the client and vice-versa.
- **Single in-flight refresh promise** (`refreshInFlight`). When 5 parallel requests 401 simultaneously, only one `/auth/refresh` fires; the other 4 await the same Promise. Without this the auth-service's 20/60s throttle could kick in.
- **Proactive refresh on `visibilitychange`** rather than on a `setInterval`. The latter wastes battery and counts against the rate limit when the tab is hidden.
- **Login form sets tokens BEFORE calling `/auth/me`** (then commits with `setSession` after). This is needed because the http client interceptor needs an accessToken to be present in the store at the moment `/auth/me` is dispatched. Once `setSession` runs we commit the full session atomically.
- **403 toast in the interceptor** intentionally. The `RoleGate` should hide forbidden actions, but the toast is a safety net for backend-only enforcement cases that slip past the UI.

## 3. Notable deviations from CLAUDE.md / docs

None. All decisions traceable to `docs/architecture/auth.md`, `docs/architecture/architecture.md`, `docs/architecture/api-integration.md`, and `docs/design-system.md`.

## 4. What is *not* here (intentionally)

- **No `useMe()` query** because `auth/me` is hydrated once on bootstrap or login; subsequent reads come from the Zustand store. We will add a TanStack Query wrapper if/when revalidation becomes necessary (e.g. role changes).
- **No login throttle UI**. The auth-service has its own 20/60s limit; we surface the generic 429 toast from the interceptor. No special UI required for V1.
- **No `/profile` page** behind the dropdown's disabled "Profile" item. Reserved for a future phase when the operational user-service exposes the read endpoint usefully under non-ADMIN roles.
- **No persistent banner for 503 (Keycloak down)**. We surface it as a transient toast for now; the `auth.md` §4 banner is nice-to-have and can land alongside global notifications in Phase 9.

## 5. Files touched

**Added:**
```
src/services/http/{client,errors}.ts
src/services/auth/{auth.api,auth.types,auth.queries,auth.schemas,auth.schemas.test}.ts
src/auth/ProtectedRoute.tsx
src/app/providers/AuthProvider.tsx
src/features/auth/pages/LoginPage.tsx
src/features/auth/components/LoginForm.tsx
src/components/layout/{MobileSidebar,UserMenu,nav-items}.{tsx,ts}
src/components/ui/{input,label,form,sheet,dropdown-menu}.tsx
src/stores/auth.store.test.ts
docs/phases/phase-1/{implementation,manual-testing}.md
```

**Modified:**
```
src/stores/auth.store.ts         # full rewrite
src/app/{App,routes}.tsx
src/components/layout/{Sidebar,Topbar}.tsx
src/features/dashboard/DashboardPage.tsx
package.json + package-lock.json
CLAUDE.md                        # phase log
```

## 6. Manual verification

See [`manual-testing.md`](./manual-testing.md) — covers everything from a clean checkout through logging in with all three roles, refresh, logout, and the mobile drawer.
