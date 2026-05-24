# Phase 0 — Tooling & Component Baseline

**Status:** Completed
**Scope contract:** CLAUDE.md §9 Phase 0
**Backend integrations:** none

---

## 1. What this phase delivered

A fully wired React + TypeScript + Vite project that compiles, lints, type-checks, tests, and builds — with the §4.6 design system tokens applied and a role-aware AppShell ready to receive real auth in Phase 1.

### 1.1 Tooling

| Concern | Implementation |
|---|---|
| Build tool | Vite 5 (`vite.config.ts`) with `@` → `src/` alias |
| Language | TypeScript 5.6, `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` (split into `tsconfig.app.json` / `tsconfig.node.json`) |
| Styling | Tailwind 3.4 + PostCSS + `tailwindcss-animate`; design tokens as HSL CSS variables in `src/styles/globals.css`, semantic theme in `tailwind.config.ts` |
| Lint | ESLint 9 flat config (`eslint.config.js`) — typescript-eslint, react-hooks, react-refresh, jsx-a11y, prettier |
| Format | Prettier + `prettier-plugin-tailwindcss` |
| Tests | Vitest 2 + jsdom + Testing Library + jest-dom |
| Pre-commit | Husky + lint-staged (`.husky/pre-commit`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) running install → lint → typecheck → tests → build on push / PR to `main` |
| Env | `.env.example` exposing `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_ENV`; typed in `src/vite-env.d.ts` and accessed via `src/lib/env.ts` |
| Node version | `.nvmrc` pinned to Node 20 |

### 1.2 Source structure (per CLAUDE.md §8)

```
src/
├── app/                          Router + providers
│   ├── App.tsx                   Mounts QueryProvider → ThemeProvider → BrowserRouter
│   ├── routes.tsx                Single route tree (AppShell layout)
│   └── providers/
│       ├── QueryProvider.tsx     TanStack Query client + sensible defaults
│       ├── ThemeProvider.tsx     Reads useUiStore.theme, toggles `dark` class on <html>
│       └── ToastProvider.tsx     sonner mount, theme-aware
├── auth/                         Permission primitives
│   ├── permissions.ts            Canonical role/action matrix (mirrors backend §2.1)
│   ├── usePermissions.ts         Hook: { role, can(action) }
│   └── RoleGate.tsx              UX-only conditional render
├── components/
│   ├── ui/                       shadcn primitives (Button, Badge) consuming tokens
│   └── layout/                   AppShell · Sidebar · Topbar · ThemeToggle
├── features/
│   ├── dashboard/DashboardPage.tsx     Phase-0 placeholder, root route
│   └── styleguide/StyleguidePage.tsx   Dev-only token/badge reference
├── lib/                          env.ts (typed env access), utils.ts (`cn` helper)
├── stores/                       Zustand (auth.store, ui.store)
├── styles/globals.css            Tailwind layers + §4.6 HSL tokens (light + dark)
├── test/setup.ts                 Vitest setup (jest-dom matchers + RTL cleanup)
├── types/api.ts                  Paginated<T>, ApiErrorPayload, NormalizedApiError
├── vite-env.d.ts                 Typed import.meta.env
└── main.tsx                      Root render
```

### 1.3 Design system

`src/styles/globals.css` defines every HSL token from §4.6.1 for both light and dark themes. `tailwind.config.ts` wires them into the Tailwind palette (`bg-primary`, `text-warning`, `border-info`, etc.) so components consume only semantic names.

Verified via `/styleguide` (dev-only route):

- Color tokens (`--background`, `--foreground`, `--muted`, `--card`, `--primary`, `--accent`, `--destructive`, `--warning`, `--success`, `--info`).
- Typography scale (`text-xs` → `text-2xl` + `font-mono`).
- Button variants (default, secondary, outline, ghost, destructive, link) and sizes (sm, default, lg).
- Enum → badge mapping for `CaseStatus`, `TaskStatus`, `CasePriority`/`TaskPriority`, `EvidenceStatus` (per §4.6.2).
- Responsive breakpoint indicator (auto-updates as you resize).

### 1.4 Role-aware AppShell

- **Sidebar** (`md:` and up) shows navigation items filtered by current role using `NAV_ITEMS[i].roles.includes(role)`. The `/users` entry is `ADMIN`-only; `/styleguide` is dev-only.
- **Topbar** is sticky, shows the signed-in email, has a `ThemeToggle` (light / system / dark), and — for Phase 0 only — a **Preview role** select that lets you switch role without auth so the sidebar can be verified visually. This selector is wrapped in `env.isDev` and disappears in production builds.
- **Mobile (`< md`)**: the sidebar is hidden (will receive a `Sheet` drawer in Phase 1 alongside the real auth flow).

### 1.5 Auth stubs (Phase 1 replaces)

`useAuthStore` ships pre-hydrated with a fake `DETECTIVE` user so the shell renders. It has no tokens, no Keycloak calls, no `/auth/me` integration. Phase 1 will:

- Remove the preview-role selector.
- Replace `setPreviewRole` with real `login` / `logout` / `refresh` actions.
- Add `ProtectedRoute`, axios interceptors, and `/login`.

### 1.6 Verified success criteria

Per CLAUDE.md §9 Phase 0 ("npm run build, npm test, npm run lint all green in CI"):

| Check | Result |
|---|---|
| `npm run lint` | clean (0 errors, 0 warnings) |
| `npm run typecheck` | clean |
| `npm run test:run` | 2/2 pass (`Button` smoke test) |
| `npm run build` | 269 KB raw / **85 KB gzipped** initial bundle — well under the §11 target of 350 KB |

---

## 2. Notable deviations from CLAUDE.md

None. Phase 1 dependencies that did not belong in Phase 0 (axios client, real `AuthProvider`, `ProtectedRoute`, `/login` page) are explicitly deferred.

## 3. What is *not* here (intentionally)

- No `/login` route — Phase 1.
- No HTTP client / axios interceptors — Phase 1.
- No `<ProtectedRoute>` — Phase 1 (current shell trusts the stubbed user).
- No mobile sidebar drawer — Phase 1 (added when real role hydration exists).
- No additional shadcn primitives beyond `Button` and `Badge` — added per phase as features need them.
- No Sentry SDK wiring — Phase 9.

## 4. Files touched

See `git status`. Notable additions:

- Root configs: `package.json`, `tsconfig*.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.nvmrc`, `.env.example`, `.gitignore`, `components.json`, `index.html`
- CI / hooks: `.github/workflows/ci.yml`, `.husky/pre-commit`
- `src/**` per §1.2 above

## 5. Manual verification

See `docs/phase-0-manual-testing.md` — full walkthrough from clean checkout to running the dev server and exercising the styleguide.
