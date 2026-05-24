# Phase 10 — Performance, accessibility, hardening

**Status:** ⬜ Not started
**Duration estimate:** ongoing post-V1
**Dependencies:** Phase 9

## Objective

Lighthouse ≥ 90, axe-core clean, bundle ≤ 350 KB gzipped initial route.

## Deliverables

- Code-split route bundles.
- Image lazy-loading.
- axe-core in CI.
- Keyboard navigation audit.
- CSP report-only header tested.

## Backend integrations

None.

## Success criteria

WCAG 2.1 AA verified by axe; LCP ≤ 2.5 s on a 4G profile.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/quality-gates.md`](../../architecture/quality-gates.md) — every numeric target listed here
- [`docs/architecture/dev-standards.md`](../../architecture/dev-standards.md) — coverage targets, jsx-a11y
- [`docs/design-system.md`](../../design-system.md) — §9 accessibility tokens (contrast, focus ring, hit targets)

## Implementation notes

- Route-level code splitting: `React.lazy(() => import('@/features/cases/pages/CaseListPage'))` for each top-level module. Verify bundle splits in `dist/assets/*` after `npm run build`.
- Image lazy loading: `loading="lazy"` on `<img>` in `<MediaGallery>` thumbnails.
- axe-core in CI: run `@axe-core/playwright` against each E2E flow; fail the build on `critical`/`serious` violations.
- Keyboard audit: tab through every page archetype; ensure every interactive element gets focus, visible focus ring, and is reachable.
- CSP report-only header: configure via meta tag for dev (`vite.config.ts`) and via deployment proxy for prod; collect violations for one week before enforcing.
