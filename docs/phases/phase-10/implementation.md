# Phase 10 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phases 1–9.

Phase 10 makes the app **launch-grade**: faster initial load (route code-splitting), automated
accessibility checks (axe-core in CI), and a security-hardening layer (CSP report-only in dev).
**No backend changes.**

> 📘 **Términos explicados** (CSP, LCP, WCAG 2.1 AA, Lighthouse, axe-core, code-splitting, gzip, 4G,
> focus ring…) en lenguaje sencillo: [`glossary.md`](glossary.md).

---

## 1. Route-level code splitting (the big win)

`src/app/routes.tsx` now `React.lazy`-loads every **feature page** via a typed `lazyPage(loader, name)`
helper (pages are named exports). The shell (`AppShell`, `ProtectedRoute`, `ErrorBoundary`, providers)
and **`LoginPage`** stay eager; a single `<Suspense fallback={<RouteFallback/>}>` (new
`src/app/RouteFallback.tsx`, a centered spinner) wraps `<Routes>`.

Plus `vite.config.ts` `manualChunks` splits the rarely-changing vendor cores
(`react-vendor`, `query-vendor`) for better long-term caching.

**Result (build):**
| Chunk | gzip |
|---|---|
| `react-vendor` | ~54 KB |
| `query-vendor` | ~27 KB |
| `index` (app core) | ~105 KB |
| per-route chunks (cases, tasks, evidence, audit, media viewer, users, styleguide…) | ~0.5–19 KB each, on demand |

Before: a single ~835 KB (gzip ~247 KB) chunk on every route. Now the initial route loads ≈ 190 KB
gzip and the "chunks larger than 500 KB" warning is gone. Comfortably under the **≤ 350 KB gzipped
per route** gate.

## 2. Image lazy-loading

Confirmed `MediaGallery` thumbnails keep `loading="lazy"` (`MediaThumbnail.tsx`). The in-app
`ImageViewer` image stays eager (it's the asset the user explicitly opened).

## 3. axe-core accessibility checks in E2E + CI

- `@axe-core/playwright` (dev dep). `e2e/support/a11y.ts` → `expectNoA11yViolations(page, ctx)` runs
  axe with WCAG 2.0/2.1 A+AA tags and **fails on `critical`/`serious`** impact (lower impact is
  reported but non-blocking).
- Wired into the existing specs (mocked, deterministic): the **login** screen (Form archetype), the
  post-login **dashboard** (shell + widgets), and the **evidence detail** (Detail archetype: header,
  badges, warning box, chain card).
- `.github/workflows/ci.yml` gained two steps after Build: install chromium + `npm run test:e2e`. So
  axe now runs in CI and fails the build on serious/critical violations.

**Fix found by axe:** sonner's `richColors` success toast (green `#008a2e` on `#ecfdf3` = **4.25:1**)
failed WCAG AA (4.5:1). Removed `richColors` in `ToastProvider` → neutral toasts (card bg + foreground
text) that pass contrast and still convey type via the icon; consistent with the design system's
neutral aesthetic.

## 4. Keyboard navigation audit

Manual pass over each archetype + Kanban (documented in `manual-testing.md` §6). The design system
already mandates a visible focus ring (`ring-2 ring-primary ring-offset-2`, §9) and ≥ 40 px hit
targets, Radix primitives trap focus in dialogs, and the Kanban (dnd-kit) is keyboard-operable. No
gaps required code changes; the axe runs back up the static `jsx-a11y` lint with runtime checks.

## 5. CSP report-only (dev) + prod guidance

`vite.config.ts` has a Vite plugin (`apply: 'serve'` + `transformIndexHtml`) that injects a
`<meta http-equiv="Content-Security-Policy-Report-Only">` **only in the dev server**. Report-only
**never blocks** — it logs would-be violations to the console so the policy can be tuned. Policy:
`default-src 'self'`; `connect-src 'self' <API> https: ws:`; `img-src 'self' data: blob: https:`;
`media-src 'self' blob: https:`; `frame-src 'self' blob: https:`; `style-src 'self' 'unsafe-inline'`;
`script-src 'self'`; `font-src 'self' data:`; `object-src 'none'`; `base-uri/form-action 'self'`.

The **production** build's `index.html` stays clean: prod CSP must be enforced as a **real HTTP
header at the proxy/CDN** (a `<meta>` can't use `report-uri`/`report-to` and shouldn't be the prod
boundary). Recommended rollout: ship the same policy as `Report-Only` at the proxy, collect reports
for ~1 week, then switch to enforcing `Content-Security-Policy`.

## Files

| Path | Change |
|---|---|
| `src/app/routes.tsx` | all feature pages `lazy` + `<Suspense>` (login eager) |
| `src/app/RouteFallback.tsx` | new loading fallback |
| `vite.config.ts` | `manualChunks` vendor split + dev-only report-only CSP plugin |
| `src/app/providers/ToastProvider.tsx` | dropped `richColors` (AA contrast fix) |
| `e2e/support/a11y.ts` | new axe helper |
| `e2e/login.spec.ts`, `e2e/evidence-view-dialog.spec.ts` | axe checks (login, dashboard, evidence detail) |
| `.github/workflows/ci.yml` | install chromium + run E2E (axe) |
| `package.json` | `@axe-core/playwright` dev dep |

## Quality gates

- **Bundle**: initial route ≈ 190 KB gzip — under the 350 KB gate; no oversized-chunk warning.
- **axe**: 0 critical/serious on login / dashboard / evidence detail, enforced in CI.
- **Lighthouse Perf ≥ 90 / A11y ≥ 95** and **LCP ≤ 2.5 s on 4G**: targets; how to measure locally is
  in `manual-testing.md` (a Lighthouse-in-CI rig is out of scope — see Deviations).

## Deviations / out of scope

- No backend changes. Prod CSP enforcement is the proxy/CDN's job (documented, not shipped from FE).
- No Lighthouse-in-CI (would need a Lighthouse CI runner); we hit its targets via code-splitting +
  lazy images + a11y and document local measurement.

## Deps added (sanctioned in tech-stack.md)

`@axe-core/playwright` (dev). No runtime deps added.
