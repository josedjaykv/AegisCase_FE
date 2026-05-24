# Phase 0 — Manual Testing Guide

Step-by-step verification of Phase 0 deliverables from a clean checkout. Run through this any time you want to confirm Phase 0 still works end-to-end (e.g., after a dependency bump or a refactor).

**Estimated time:** ~5 minutes (first install) / ~1 minute (re-runs).

---

## 0. Prerequisites

- **Node 20+** (`node -v` → `v20.x.x`). If you use `nvm`, run `nvm use` in the project root and it will pick the version from `.nvmrc`.
- **npm 10+** (`npm -v`). Ships with Node 20.
- A browser (Chrome / Firefox / Safari).
- The backend is **not** required for Phase 0 — there are no HTTP calls yet.

---

## 1. From-zero install

```bash
cd /home/josed/AegisCase_FE
nvm use                    # if you use nvm
npm install                # installs ~1.4k packages; takes 1–2 minutes
cp .env.example .env.local # creates your local env file
```

**Expected:** `npm install` finishes with `added N packages` and no `ERESOLVE`/peer-dep errors. A few `npm warn deprecated` lines are fine.

**`.env.local` defaults (already in `.env.example`):**

```
VITE_API_BASE_URL=http://localhost:3000
VITE_SENTRY_DSN=
VITE_ENV=development
```

No editing needed unless your backend lives elsewhere.

---

## 2. Run the four CI checks locally

Mirrors the GitHub Actions workflow (`.github/workflows/ci.yml`).

```bash
npm run lint        # ESLint over src/ → "0 errors, 0 warnings"
npm run typecheck   # tsc --noEmit → no output = success
npm run test:run    # Vitest run-once → "2 passed (2)"
npm run build       # tsc + vite build → emits dist/
```

**Expected on `build`:**

```
dist/index.html                   0.48 kB │ gzip:  0.30 kB
dist/assets/index-*.css          13.83 kB │ gzip:  3.53 kB
dist/assets/index-*.js          269.33 kB │ gzip: 84.84 kB
✓ built in ~5s
```

The gzipped JS bundle should be **well under 350 KB** (CLAUDE.md §11 target).

---

## 3. Start the dev server

```bash
npm run dev
```

**Expected:** Vite reports `Local: http://localhost:5173/`. Open that URL.

You should see:

- **Top bar** with `Signed in as detective@aegiscase.local`, a **Preview role** selector (dev-only), and a three-button theme toggle (light / system / dark).
- **Sidebar** (visible at viewports ≥ 768 px) with: Dashboard, Cases, Tasks, Evidence, Involved, Media, Audit, **Users** (only when ADMIN), **Styleguide** (dev-only). Footer shows `DETECTIVE · v0.1.0 · Phase 0`.
- **Main area** with the Phase 0 Dashboard placeholder: three cards (Current session, Backend gateway, Design system).

---

## 4. Verify role-aware sidebar (preview role switch)

Phase 0 does not yet do real auth, but the AppShell **is** role-aware. The top-bar `Preview role` selector lets you confirm this.

1. In the top bar, change **Preview role** from `DETECTIVE` to `ANALYST`.
   - **Expect:** Sidebar still shows Cases/Tasks/etc., **Users disappears**. The footer label updates to `ANALYST`. The Dashboard's "Current session" card updates to the analyst email and the role badge to `ANALYST`.
2. Switch to `ADMIN`.
   - **Expect:** `Users` reappears in the sidebar. Footer says `ADMIN`. The role badge in the dashboard card reads `ADMIN`.
3. Switch back to `DETECTIVE`.
   - **Expect:** `Users` disappears again.

This validates the `Sidebar.tsx` role filter (`NAV_ITEMS[i].roles.includes(role)`) and `useAuthStore.setPreviewRole`.

---

## 5. Verify theme toggle

In the top-bar theme toggle:

1. Click **light (sun)**. Whole UI switches to light theme. The previously selected button gets the accent background.
2. Click **dark (moon)**. UI switches to dark.
3. Click **system (monitor)**. UI follows your OS preference. Change your OS theme and verify the UI updates without reload.
4. **Reload the page.** Your last choice is restored (persisted in `localStorage` under `aegiscase:ui`).

---

## 6. Walk the `/styleguide` page

Navigate to `http://localhost:5173/styleguide` (or click **Styleguide** in the sidebar).

You should see, in this order:

1. **Color tokens** — 10 swatches (`--background`, `--foreground`, `--muted`, `--card`, `--primary`, `--accent`, `--destructive`, `--warning`, `--success`, `--info`). Toggle the theme — every swatch should re-render with its dark-mode value.
2. **Typography scale** — `text-2xl` down to `text-xs` plus a `font-mono` sample (a UUID). Inter for sans, JetBrains Mono fallback for mono.
3. **Buttons** — six variants (default, secondary, outline, ghost, destructive, link) and three sizes plus a disabled state. Hover each: focus ring on `Tab`, no `outline: none` without replacement.
4. **CaseStatus / TaskStatus / Priority / EvidenceStatus** — every enum value rendered as a Badge with the colors mapped in CLAUDE.md §4.6.2.
5. **Responsive breakpoints** — a single badge auto-updates as you resize the window to show the active Tailwind breakpoint (`< sm`, `sm`, `md`, `lg`, `xl`, `2xl`). Resize from full-width down to ~360 px and confirm the badge changes through `xl → lg → md → sm → < sm`.

---

## 7. Verify responsive behavior (§4.6.11)

Open browser devtools, switch to responsive mode, and test these viewports:

| Viewport | Expectation |
|---|---|
| **1440 × 900** (desktop) | Sidebar visible, dashboard grid `lg:grid-cols-3`, top-bar shows email + preview role + theme toggle. |
| **768 × 1024** (tablet) | Sidebar still visible (md breakpoint). Dashboard grid drops to `sm:grid-cols-2`. |
| **375 × 812** (mobile) | Sidebar hidden (real drawer arrives in Phase 1). Dashboard stacks vertically. Top-bar hides the "Preview role" label text (the select is still reachable). All touch targets ≥ 40 × 40 px. |

No horizontal scroll at 375 px. No content cut off.

---

## 8. Production preview (optional sanity check)

```bash
npm run build
npm run preview        # serves dist/ on http://localhost:4173
```

Open the URL. Should render identically to `npm run dev`, **except**: the `Preview role` selector and the `Styleguide` sidebar link are gone (they are guarded by `env.isDev`). Visiting `/styleguide` directly redirects to `/` (route not registered in prod).

This proves `env.isDev` gating works in a real production bundle.

---

## 9. Verify the pre-commit hook (only if you actually want to commit)

The `prepare` script runs `husky` on `npm install`, which installs the `.husky/pre-commit` hook. Test it without making a real commit by staging a file with a lint error:

```bash
echo "const x: any = 1;" > src/junk.ts
git add src/junk.ts
git commit -m "should be blocked"     # → husky runs lint-staged → ESLint fails → commit aborted
rm src/junk.ts                        # clean up
```

If the commit went through, the hook is not active — re-run `npm install` so `husky` re-installs.

---

## 10. Done

If steps 1 → 8 all pass, Phase 0 success criteria are met (CLAUDE.md §9 Phase 0). You are ready to ask for Phase 1.

### Reset back to clean (rarely needed)

```bash
rm -rf node_modules dist .vite
npm install
```
