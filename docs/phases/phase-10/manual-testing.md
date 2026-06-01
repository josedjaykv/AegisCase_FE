# Phase 10 — Manual Testing Guide

Verification of code-splitting, lazy images, axe-core a11y, the keyboard audit, and the dev CSP.
The E2E/axe suite is **fully mocked** (no backend needed). The Lighthouse/LCP checks just need the
app running. Term definitions are in [`glossary.md`](glossary.md).

**Estimated time:** ~25 minutes.

---

## 1. Install & gates

```bash
cd /home/josed/AegisCase_FE
npm install                       # picks up @axe-core/playwright
npx playwright install chromium   # one-time, for E2E
npm run lint && npm run typecheck && npm run test:run && npm run build
```

All gates green. In the **build output**, note there are now **many per-route chunks**
(`dist/assets/*.js`) plus `react-vendor`, `query-vendor`, and a smaller `index` — and **no**
"chunks larger than 500 kB" warning.

---

## 2. Code-splitting in the browser (Network)

```bash
npm run dev      # http://localhost:5173
```

1. Open DevTools → **Network**, filter **JS**. Hard-reload `/login`.
   **Expect**: a small set of JS chunks (vendors + index + a small login chunk) — **not** the whole
   app.
2. Log in, then navigate to **Tasks**, **Evidence**, **Audit** (as ADMIN). Each time you first enter
   a module, **watch a new chunk load on demand** (e.g. a `TasksView`/Kanban chunk only when you open
   the board). That's route-level code-splitting working.
3. A brief spinner (the `<Suspense>` fallback) may flash while a chunk loads on a slow network.

---

## 3. Lazy image loading

- Open an entity with several image attachments (a `MediaGallery` with many images).
- DevTools → Network → **Img**. **Expect**: images load **as you scroll** them into view, not all at
  once (thumbnails use `loading="lazy"`).

---

## 4. axe-core accessibility (automated)

```bash
npm run test:e2e
```

**Expect**: 6 tests green. Three of them assert **no critical/serious WCAG violations** (axe) on the
**login** screen, the **dashboard**, and the **evidence detail**. If you introduce a contrast/aria
regression, these fail (this is what now runs in CI too).

---

## 5. CSP report-only (dev only)

1. With `npm run dev` running, open `/login` → DevTools → **Elements** → `<head>`.
   **Expect**: a `<meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'self'; …">`.
2. Browse the app (esp. open an image/PDF in the viewer). **Console** may show
   `[Report Only] Refused to …` messages — those are **observations**, not blocks; the app keeps
   working. Use them to tune the policy before enforcing in prod.
3. **Prod check**: `npm run build && npm run preview` → the built `index.html` has **no** CSP meta
   (prod CSP is enforced at the proxy/CDN — see implementation.md).

---

## 6. Keyboard navigation audit (manual)

With the app open, put the mouse away and use **Tab / Shift+Tab / Enter / Space / Esc / arrows**:

- **Login (Form):** Tab through email → password → Sign in; each shows a **visible focus ring**.
- **Shell:** Tab reaches every sidebar link and the topbar controls; Enter activates them.
- **List (e.g. /cases):** Tab to rows/filters; pagination reachable.
- **Detail (e.g. evidence):** Tab to the action buttons; open a dialog (e.g. View & take custody) →
  focus is **trapped** inside it; **Esc** closes it and focus returns.
- **Kanban (/tasks board, ≥ md):** focus a card's grip, **Space** to grab, **arrows** to move,
  **Space** to drop (dnd-kit keyboard DnD).
- Every interactive element must be **reachable** and show a **focus ring** (never invisible focus).

---

## 7. Lighthouse (Performance & Accessibility) + LCP on 4G

1. `npm run build && npm run preview` (audit the **production** build, not dev).
2. Open the preview URL in an **Incognito** Chrome window (no extensions).
3. DevTools → **Lighthouse** tab → Mode **Navigation**, Device **Mobile**, categories
   **Performance** + **Accessibility** → **Analyze page load**.
   **Targets**: Performance **≥ 90**, Accessibility **≥ 95**.
4. **LCP on 4G**: DevTools → **Performance** tab → set CPU/Network throttling to **"Slow 4G"** (or in
   Lighthouse, the mobile profile already throttles) → reload → check **LCP ≤ 2.5 s**.

> Run on `/login` and `/` (dashboard) — the two routes the quality-gate calls out.

---

## Success criteria (from the plan)

- [ ] Build produces per-route chunks; initial route ≤ 350 KB gzipped; no oversized-chunk warning.
- [ ] Chunks load on demand per route (Network tab).
- [ ] Thumbnails lazy-load on scroll.
- [ ] `npm run test:e2e` green incl. axe (0 critical/serious); axe runs in CI.
- [ ] CSP report-only meta present in **dev**, absent in the **prod** build.
- [ ] Keyboard reaches every interactive element with a visible focus ring.
- [ ] Lighthouse Perf ≥ 90 / A11y ≥ 95; LCP ≤ 2.5 s on 4G.
