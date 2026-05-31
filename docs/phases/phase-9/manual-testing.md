# Phase 9 — Manual Testing Guide

Verification of the polling/visibility polish, Sentry + ErrorBoundary, and the Playwright E2E suite.
The E2E suite is **fully mocked**, so it needs **no backend**. The manual app checks (§3–§6) work
best with the backend up, but most can be observed against any logged-in session.

**Estimated time:** ~20 minutes.

---

## 1. Install & checks

```bash
cd /home/josed/AegisCase_FE
npm install                 # picks up @sentry/browser, @playwright/test
npx playwright install chromium   # one-time: downloads the E2E browser
npm run lint && npm run typecheck && npm run test:run && npm run build
```

All four gates must pass (unit tests exclude `e2e/`).

---

## 2. E2E suite (no backend needed)

```bash
npm run test:e2e
```

**Expect**: 5 tests green across 3 specs:
- `login.spec.ts` — ADMIN sees **Users** + **Audit** nav; DETECTIVE/ANALYST do not.
- `evidence-view-dialog.spec.ts` — the evidence detail loads read-only (summary + chain) **without**
  calling the mutating `GET /evidence/:id`; that call fires **only** after confirming the dialog.
- `task-lifecycle.spec.ts` — a task goes PENDING → In progress → Completed with optimistic updates.

`npm run test:e2e:ui` opens the interactive runner. Reports/artifacts land in `playwright-report/`
and `test-results/` (gitignored).

---

## 3. Polling pauses in background, refreshes on return

Run the app and log in (backend up):

```bash
npm run dev    # http://localhost:5173
```

1. Open the **Dashboard** (it polls: My tasks every 30 s, and — as ADMIN — the Audit feed every 30 s).
   Open DevTools → **Network**, filter `tasks` / `audit`.
2. Switch to **another tab** for >30 s. **Expect**: while this tab is hidden, **no** new `tasks` /
   `audit` requests fire (background polling is paused).
3. **Return** to the app tab. **Expect**: an **immediate** refetch of the active polling queries
   (a fresh `tasks`/`audit` request right away) — you don't wait up to a full interval.

---

## 4. Optimistic task status + new-overdue toast

- Open a task detail (`/tasks/:id`) or the board. Change the status via the picker (or drag a card).
  **Expect**: the status updates **instantly** (optimistic); if the server rejects it, it **reverts**
  and a toast explains why.
- New-overdue toast: have a task with a **past due date**; when a tasks poll sweeps it to `OVERDUE`,
  a warning toast appears ("Task overdue: …"). It does **not** toast for items already overdue on
  first load.

---

## 5. ErrorBoundary

Temporarily force a render error to see the boundary (then revert):

- e.g. add `throw new Error('boom')` at the top of a page component, reload that route.
- **Expect**: a centered **"Something went wrong"** card with a **Reload** button — not a blank/white
  screen or a raw stack trace. Remove the throw afterward.

---

## 6. Sentry (off by default)

- With **`VITE_SENTRY_DSN` empty** (the default in `.env.local`): DevTools → Network shows **no**
  requests to Sentry, and no Sentry chunk is loaded (it's a lazy `import()` only triggered when a DSN
  is set). The app behaves identically.
- (Optional) Set `VITE_SENTRY_DSN=<a test DSN>` and restart `npm run dev` → trigger the ErrorBoundary
  (§5); an event is sent to Sentry, **with the JWT, Authorization headers and emails scrubbed**.

---

## Success criteria (from the plan)

- [ ] Tab in background does **not** poll (Network tab, §3).
- [ ] Returning to the tab triggers an immediate refresh of active polling queries (§3).
- [ ] Optimistic task status update + rollback on failure (§4).
- [ ] `npm run test:e2e` green — incl. the evidence guardrail (mutating GET only on confirm) (§2).
- [ ] Polling stays under the 100 req/60s budget in normal use.
- [ ] Sentry is disabled with no DSN and scrubs PII/JWT when enabled (§6).
