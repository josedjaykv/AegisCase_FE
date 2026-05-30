# Fix 001 — Kanban: dragged card rendered behind other columns

**Status:** ✅ Fixed
**Date:** 2026-05-30
**Area:** Tasks Kanban board (`features/tasks/components/KanbanBoard.tsx`)
**Scope:** Frontend only

## Symptom

When dragging a task card from one column (e.g. **Pending**) toward another, the card appeared **behind/under** the other columns (In progress, Overdue, Completed, Cancelled) instead of floating above them — it looked clipped at the column edge and slid beneath the neighbours.

## Root cause

Two things combined:

1. The dragged card was moved **in place** with a CSS `transform` (`useDraggable` + `CSS.Translate`), staying inside its own column in the DOM.
2. Feature 005 made each column `overflow-y-auto` (for internal vertical scrolling in the full-height board). An `overflow-*: auto` element **clips** its transformed descendants — so the card being dragged was cut off at its column's bounds and could not visually escape the column to float over the others.

No `z-index` value fixes this on its own, because the clipping is caused by the ancestor's `overflow`, not by stacking order.

## Fix

Switched to dnd-kit's **`DragOverlay`**:

- The source card now **stays put and dims** (`opacity-40`) during the drag — it no longer carries the `transform`.
- A **floating copy** of the card is rendered inside `<DragOverlay>`, which dnd-kit **portals to the top layer** (outside every column). It follows the cursor and is therefore never clipped by a column's `overflow` and always stacks above all columns.
- Added `onDragStart` to capture the active task and `onDragCancel`/`onDragEnd` to clear it.

```tsx
<DndContext onDragStart={…} onDragEnd={…} onDragCancel={…}>
  {board}
  <DragOverlay dropAnimation={null}>
    {activeTask ? <div className="w-72 rotate-1"><TaskCard task={activeTask} /></div> : null}
  </DragOverlay>
</DndContext>
```

The `CSS.Translate` transform on the source card was removed (no longer needed).

## Why this is the right fix (not just a z-index bump)

`DragOverlay` is dnd-kit's intended solution for boards with scrolling/overflowing columns: it decouples the floating visual from the source's stacking/overflow context entirely. A `z-index` + `position` hack would not survive the column's `overflow-y-auto` clipping, and would break again as soon as a column scrolls.

## Verification

- Drag a card across all columns — the card now floats **above** every column for the whole drag, with a slight tilt, and drops correctly.
- Internal column scrolling (Feature 005) still works.
- Keyboard drag (Space + arrows) still works.
- `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Files

- `src/features/tasks/components/KanbanBoard.tsx`
