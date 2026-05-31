# Phase 9 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phases 1–8.

Phase 9 is the **cross-cutting reliability/polish** layer over everything shipped so far: keep
polling cheap, make returning to the tab feel live, add production error visibility, and lock the
critical flows behind a deterministic E2E suite. **No backend changes.**

> 📘 **Para entender el por qué/cómo/beneficios** de cada pieza en lenguaje sencillo (y por qué
> conviene hacerlo en todo proyecto y en AegisCase en particular), ver
> [`phase-9-explained.md`](phase-9-explained.md).

---

## What was already in place (verified, not rebuilt)

Three of the four plan deliverables shipped in earlier phases — confirmed working this phase:

- **Optimistic task status** — `useChangeTaskStatusMutation` (`services/tasks/tasks.queries.ts`)
  already does `onMutate` (snapshot + cache patch) / `onError` (rollback) / `onSettled` (invalidate).
  The E2E `task-lifecycle` spec asserts the optimistic transition.
- **New-overdue toast** — `useOverdueNotifier` (`features/tasks/useOverdueNotifier.ts`), used by
  `MyTasksWidget`; toasts only on a later poll's flip to `OVERDUE`, not on first load.
- **Background polling pause** — all five polling queries set `refetchIntervalInBackground: false`
  (tasks, case detail, evidence chain, audit feed, per-entity audit), so a hidden tab already costs
  ~0 requests — the "tab in background does not poll" success criterion.

## Net-new this phase

### 1. Visibility-gated refresh on return
- `src/hooks/useVisibility.ts` — boolean hook on `document.visibilitychange` (SSR-safe), mirrors
  `useMediaQuery`.
- `src/app/providers/VisibilityRefetcher.tsx` — mounted under `QueryProvider`; on a hidden→visible
  transition, runs `queryClient.refetchQueries({ type: 'active', stale: true })` so polling surfaces
  refresh **immediately** on return (instead of waiting up to a full interval). `refetchOnWindowFocus`
  stays **off** globally — we control refresh explicitly here, scoped to *active + stale* queries to
  respect the 100 req/60s budget. Complements (does not replace) the per-query background-pause flags.

### 2. Sentry + ErrorBoundary
- `src/lib/sentry.ts` — `initSentry()` runs **only when `VITE_SENTRY_DSN` is set**, via
  `await import('@sentry/browser')` (dynamic → **zero bundle cost** when unset; `import type` for the
  SDK types is erased). `tracesSampleRate: 0`, `sendDefaultPii: false`. **PII/JWT scrubbing**:
  `beforeSend` strips Authorization/Cookie headers and the `user` object; `beforeBreadcrumb` drops
  console noise; a recursive `scrub()` redacts token/email/secret-ish keys and regex-redacts JWTs and
  emails from strings. `captureError()` is used by the boundary.
- `src/components/feedback/ErrorBoundary.tsx` — top-level class boundary (none existed before);
  shows a safe "Something went wrong" + Reload fallback and reports to Sentry with scrubbed context.
  Wraps the whole app in `src/app/App.tsx`.
- `initSentry()` called fire-and-forget from `src/main.tsx`.

### 3. Playwright E2E (mocked, deterministic)
- `@playwright/test` + `playwright.config.ts` (chromium; `webServer` runs `npm run dev`;
  retries in CI). Scripts: `test:e2e`, `test:e2e:ui`. **Not** wired into `test:run` (unit stays fast);
  Vitest `exclude`s `e2e/**`.
- `e2e/support/mocks.ts` — `mockAuth(page, role)` + `login(page, role)`. **All mocks are anchored to
  the API origin (`http://localhost:3000`) via regex** so they intercept API calls only — never the
  SPA's own navigations (`localhost:5173`), which share paths like `/tasks/:id`. The user comes from
  mocked `/auth/me`, so fake tokens suffice (the app doesn't decode the JWT).
- Three specs (the plan's minimum):
  - `e2e/login.spec.ts` — login for the 3 roles; role-based nav (Users + Audit only for ADMIN).
  - `e2e/evidence-view-dialog.spec.ts` — **the guardrail**: loads read-only via `/summary` +
    `/chain-of-custody` with the mutating bare `GET /evidence/:id` **not** called; only after the
    dialog confirm does that call fire (asserted by counting interceptions).
  - `e2e/task-lifecycle.spec.ts` — PENDING → IN_PROGRESS → COMPLETED via the status picker,
    asserting the optimistic update and that COMPLETED collapses the picker to a read-only badge.

## Files

| Path | Change |
|---|---|
| `src/hooks/useVisibility.ts` | new |
| `src/app/providers/VisibilityRefetcher.tsx` | new |
| `src/app/providers/QueryProvider.tsx` | mounts `<VisibilityRefetcher/>` |
| `src/lib/sentry.ts` | new (lazy init + scrubbing) |
| `src/components/feedback/ErrorBoundary.tsx` | new |
| `src/app/App.tsx` | wrapped in `<ErrorBoundary>` |
| `src/main.tsx` | `initSentry()` |
| `playwright.config.ts`, `e2e/**` | new E2E suite |
| `package.json` | `@sentry/browser`, `@playwright/test`, `test:e2e[:ui]` scripts |
| `vite.config.ts` | Vitest `exclude: e2e/**` |
| `eslint.config.js` | node-globals override for `e2e/**` + `playwright.config.ts` |
| `.gitignore` | Playwright artifacts (`blob-report/`, `.playwright/`, cache) |

`.env.example` / `docs/running.md` already documented `VITE_SENTRY_DSN` — unchanged.

## Quality gates honored

- Polling stays well under 60 req/60s single-tab (per-query intervals + background pause + on-return
  refresh scoped to stale).
- Sentry off by default (no DSN) → no network calls, no bundle cost.
- `GET /evidence/:id` is never auto-invoked — asserted by E2E.

## Deps added (both sanctioned in tech-stack.md)

`@sentry/browser` (runtime, lazy), `@playwright/test` (dev). No others.

## Deviations

The plan listed a `useVisibility` hook "gating polling"; background-pause was already satisfied by
per-query flags, so the hook instead delivers the higher-value **refresh-on-return** (with user
agreement), keeping the flags. The E2E runs against a **mocked** backend (with user agreement) to be
deterministic/CI-green without the 8 microservices.
