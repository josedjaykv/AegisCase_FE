# Fix 004 — Sidebar (and top bar) scroll away on long pages

**Status:** ✅ Fixed
**Date:** 2026-05-31

## Symptom

On a long page (e.g. an evidence detail with media + activity), scrolling down made the **sidebar
navigation** (Dashboard, Cases, Tasks, Evidence, …) scroll out of view — you'd lose the nav once you
were far enough down the page.

## Root cause

The app shell used **document-level scroll**: everything lived inside a `min-h-screen` flex row, so
the page itself grew with the content and the whole document scrolled. The `<Topbar>` was
`sticky top-0` (so it stayed), but the `<aside>` sidebar was **not** sticky and had no fixed height,
so it grew with the content and scrolled away with it.

## The change

`src/components/layout/AppShell.tsx` — switched to the standard fixed app-shell: the outer container
is exactly viewport height and does not scroll; only the content area scrolls.

- Outer: `min-h-screen` → **`h-screen overflow-hidden`**.
- Right column: added **`overflow-hidden`**.
- `<main>`: added **`overflow-y-auto`** (+ `scrollbar-thin` per design-system §4 for themed scroll).

The sidebar needed no change: it's a child of the now-non-scrolling `h-screen` row, so it stays
fixed and full-height; its inner `<nav>` already has `overflow-y-auto` for cases where the nav list
itself is taller than the viewport.

Net effect: **sidebar and top bar stay fixed; only the page content scrolls.**

## Verification

- Manually: open a long detail page, scroll — sidebar + top bar stay put, content scrolls under a
  themed scrollbar. Verified at 375 / 768 / 1440 (mobile uses the drawer, unaffected).
- `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.
