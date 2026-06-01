# Feature 005 — Collapsible sidebar, themed scrollbars & full-height Kanban

**Status:** ✅ Shipped
**Date:** 2026-05-30
**Phase:** 6 (Tasks) — UI/UX polish, mostly app-wide
**Scope:** Frontend only

## Summary

Three related UI refinements:

1. **Collapsible sidebar** — the left nav collapses to an **icon-only** rail (`w-16`) and expands back to `w-64`, toggleable from **any** page. State persists.
2. **Themed scrollbars** — the default browser scrollbar is replaced by a thin, token-styled bar (`.scrollbar-thin`) on the app's scroll regions (Kanban, tables, tab scroller).
3. **Full-height Kanban** — the board fills the viewport height with each column scrolling internally, and columns flex to share width so the board only scrolls horizontally when it genuinely must.

## Motivation (why)

The Kanban looked cramped: short columns plus the raw OS horizontal scrollbar, which clashed with the app's visual language. And there was no way to reclaim horizontal space for the board. These changes make the board feel intentional and give the user control over the workspace width.

## Changes

### Collapsible sidebar

| File | Change |
|------|--------|
| `stores/ui.store.ts` | `sidebarOpen` is now **persisted** (added to `partialize`). |
| `components/layout/Sidebar.tsx` | Width animates between `w-64` (labels) and `w-16` (icon-only). Collapsed: icons centered, labels hidden, `title`/`aria-label` provide tooltips/screen-reader text; brand shows just the shield; footer shows a compact toggle. A footer **Collapse/Expand** button toggles it. |
| `components/layout/Topbar.tsx` | A `PanelLeft` ghost button (desktop only) toggles the sidebar — reachable from **every** page. |

The mobile drawer (`< md`) is unchanged — collapse is a desktop concept; on mobile the sidebar is already a `Sheet`.

### Themed scrollbars

| File | Change |
|------|--------|
| `styles/globals.css` | New `.scrollbar-thin` utility: 8px bar, transparent track, thumb = `--border` token → `--muted-foreground/0.6` on hover. Cross-browser (`scrollbar-width`/`scrollbar-color` + `::-webkit-scrollbar*`). |
| `components/ui/table.tsx` | `DataTable` overflow wrapper uses `.scrollbar-thin`. |
| `components/ui/tabs.tsx` | The tab scroller uses `.scrollbar-thin`. |
| `features/tasks/components/KanbanBoard.tsx` | Board (horizontal) and each column (vertical) use `.scrollbar-thin`. |

### Full-height Kanban

`features/tasks/components/KanbanBoard.tsx`:
- The board container is `md:h-[calc(100vh-14rem)] md:min-h-[28rem]` — it fills the viewport below the chrome instead of sizing to content.
- Columns changed from fixed `w-72 shrink-0` to `flex-1 min-w-[15rem] md:h-full`. On wide screens the five columns share the row width (**no horizontal scroll**); the `min-w` only triggers the (now themed) horizontal scroll when they truly don't fit — and **collapsing the sidebar gives them the room to fit**.
- Each column's card area is `flex-1 min-h-0 overflow-y-auto scrollbar-thin`, so long columns scroll internally while the header stays put.

Mobile (`< md`) is unchanged: columns keep their natural height and the inline `TaskStatusPicker` under each card drives status changes (no drag).

## How to test

See `docs/phases/phase-6/manual-testing.md` §16–§17:
- Collapse/expand the sidebar from the top bar and the sidebar footer; confirm icon-only mode with tooltips and that the choice survives a reload.
- On the Kanban, confirm columns are tall (fill the height), scroll internally, use the themed scrollbar, and that collapsing the sidebar removes the horizontal scroll on a normal desktop.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Notes

- No backend changes.
- The `calc(100vh-14rem)` offset is an approximation of the top bar + page header + toolbar; a few px of page scroll on shorter pages is acceptable and bounded by `min-h-[28rem]`.
