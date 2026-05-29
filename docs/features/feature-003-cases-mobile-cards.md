# Feature 003 — Cases list: card layout on mobile

**Status:** ✅ Shipped
**Date:** 2026-05-29
**Phase:** 3 (Cases module) — UI/UX improvement on top of the shipped phase
**Scope:** Frontend only

## Summary

On phones (`< md`, 768px) the cases list now renders **one card per case** instead of the cramped, horizontally-overflowing `DataTable`. Desktop and tablet (`≥ md`) keep the full `DataTable` unchanged.

## Motivation (why)

The `DataTable` packs five columns (Code · Title · Priority · Status · Created). On a ~375px screen those columns either overflow (forcing horizontal scroll) or get squeezed until nothing is readable. The design system already prescribes the fix in §11:

> **List | < md (mobile):** Cards (one per row) replace `DataTable`; non-essential columns hidden.

This feature implements that prescription for `/cases`. Cards give each case clear visual hierarchy (title first, status + priority badges, then `caseCode` + date as metadata) and remove horizontal scrolling entirely.

## Alternatives considered

| Option | Why not chosen |
|--------|----------------|
| **Cards, one per row** ✅ | Matches design-system §11; best legibility; zero horizontal scroll. |
| Inbox-style dense two-line rows | Denser but less readable; the operational context (status/priority) competes for the same line. |
| Horizontal-scroll table with sticky first column | Preserves tabular format but still forces lateral swiping — the original pain point, only slightly mitigated. |

## Frontend changes

| File | Change |
|------|--------|
| `src/features/cases/components/CaseCard.tsx` (new) | A single case as a tappable card: title (+ Archived pill), status & priority badges, `caseCode` · created-date metadata. The whole card links to `/cases/:id`. Archived cases get `opacity-60`, consistent with the table rows. |
| `src/features/cases/pages/CaseListPage.tsx` | Renders the `DataTable` inside `hidden md:block` and a card list inside `space-y-3 md:hidden`. Both share the same query; the card branch handles its own loading skeletons and empty state. `PaginationBar` is shared below both. |

## Design / behavior notes

- **One source of data, two presentations.** The `useCasesListQuery` result drives both the table and the cards — no duplicate fetching, pagination is shared.
- **Parity of states.** Loading (skeletons), empty ("No cases yet"), and archived styling (`opacity-60`) all match between table and cards.
- **Accessibility.** The card is an `<a>` (via `Link`) so it's keyboard-focusable with a visible focus ring and works with the 44px touch-target minimum.
- **Breakpoint.** The switch is at `md` (768px): phones get cards, tablets and up get the table — aligned with the design-system responsive matrix.

## How to test

1. Open `/cases` on desktop → unchanged `DataTable`.
2. DevTools responsive mode → **375 × 812**: the table is replaced by stacked cards; no horizontal scroll; each card shows title, status+priority badges, code · date.
3. Tap a card → navigates to the case detail.
4. An archived case renders faded with the "Archived" pill.
5. Loading shows card skeletons; an empty result shows the "No cases yet" state.
6. Resize across 768px → layout swaps between cards and table cleanly.

Local gates: `npm run lint`, `npm run typecheck`, `npm run build` — all green.

## Notes for future reuse

This `hidden md:block` + `md:hidden` card pattern is the template for the other list surfaces the design system flags (Tasks, Evidence, Involved, Audit). When those phases land, factor the shared structure (table-on-desktop / cards-on-mobile with shared query + pagination) rather than re-deriving it per feature.
