# Feature 008 — Image viewer inspection tools (zoom / rotate / pan / adjust)

**Status:** ✅ Shipped
**Date:** 2026-05-30
**Phase:** 7 (Media)
**Scope:** Frontend only (no backend changes; no new dependencies)

## Summary

The in-app media viewer's **image** branch is now a full inspection surface so detectives can examine
evidence photos without leaving the app or downloading them:

- **Zoom** — toolbar +/−, mouse **wheel**, and **double-click** to toggle. Live `%` indicator
  (0.25×–8×).
- **Pan** — drag the image when zoomed in (`grab`/`grabbing` cursor).
- **Rotate** — 90° left/right.
- **Flip horizontal** (mirror).
- **Brightness / contrast** — sliders (0–200%) for dark or washed-out photos, with a reset; applied
  via CSS `filter` so the original file is untouched.
- **Reset view** — back to fit/0°/100%.
- **Keyboard** — `+`/`−` zoom, `r`/`R` rotate right/left, `f` flip, `0` reset, arrows pan.

All adjustments are view-only (CSS transforms + filters); nothing is uploaded or altered.

## Motivation (why)

Phase 7 rendered evidence images at fit-size only. Investigators frequently need to zoom into a
detail (a license plate, a face), straighten a rotated photo, or brighten an underexposed scene
shot. Forcing a download to use an external image tool breaks the in-app workflow and (for evidence)
the custody/traceability story. Keeping inspection in-app is both faster and cleaner.

## Changes

| File | Change |
|------|--------|
| `features/media/components/ImageViewer.tsx` (new) | Self-contained inspector: state for scale/rotation/flip/offset/brightness/contrast; wheel + double-click + drag handlers; floating toolbar + brightness/contrast panel; keyboard shortcuts. Resets when the `src` changes. No external lib. |
| `features/media/components/MediaViewerDialog.tsx` | The `image` case now renders `<ImageViewer key={media.id} src={url} … />` instead of a plain `<img>`. Video/audio/pdf/text branches unchanged. |

## Design notes

- **No dependency added** — zoom/pan/rotate are hand-rolled with CSS `transform`
  (`translate · rotate · scale · scaleX`) and brightness/contrast with CSS `filter`. tech-stack.md
  lists no image-viewer library, so none was assumed.
- **Accessibility** — every action is reachable via labelled toolbar buttons (the primary, AT-friendly
  path). The viewport itself is `role="application"` with an `aria-label` describing the shortcuts;
  the div-level listeners + `tabIndex` are a progressive enhancement, so the two `jsx-a11y`
  noninteractive rules are disabled **scoped to that component** with a justification comment.
- **State resets per image** via `key={media.id}` on `<ImageViewer>` so opening a different file
  starts clean.
- Toolbar uses `bg-card/95 backdrop-blur` + design tokens; icons are `lucide-react` (`ZoomIn/Out`,
  `RotateCw/Ccw`, `FlipHorizontal2`, `SlidersHorizontal`, `RefreshCw`).

## How to test

1. Open any **image** in a gallery (case/evidence/task/involved) → the viewer shows a bottom toolbar.
2. Zoom with the buttons, the mouse wheel, and double-click; the `%` updates. When zoomed, **drag**
   to pan.
3. Rotate left/right; flip horizontal.
4. Open **Adjust** (sliders icon) → change brightness/contrast → "Reset adjustments".
5. **Reset view** returns to the initial state. Try the keyboard shortcuts (`+ - r f 0`, arrows).
6. Open a **different** image → the view starts reset.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- Wheel zoom and double-click zoom are centred on the image (not the cursor); pan repositions as
  needed. Cursor-anchored zoom could be added later.
- Brightness/contrast are display-only and not persisted or exported.
- Touch **pinch**-zoom isn't implemented (pointer drag pans; toolbar/double-tap zoom). Can be added
  if field/mobile use needs it.
