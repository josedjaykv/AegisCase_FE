# Fix 003 — Assignee filter breaks on long selected names

**Status:** ✅ Fixed
**Date:** 2026-05-30
**Area:** Tasks board assignee filter (`features/tasks/components/TasksView.tsx`)
**Scope:** Frontend only

## Symptom

In the Tasks board's **Assigned to** filter, selecting a user with a long name (e.g. "Jose David Jayk Vanegas") overflowed the `Select` **trigger** and broke the toolbar layout. The dropdown's default `SelectValue` echoes the full chosen name into the (narrow) trigger.

## Fix

Show a compact **"first name + last initial"** label in the trigger, while keeping **full names in the dropdown list**:

- New pure helper `abbreviateName(name)` in `src/lib/format.ts`:
  - `"Jose David Jayk Vanegas"` → `"Jose V."`; `"Ana Lopez"` → `"Ana L."`.
  - Single-word names returned unchanged (`"Ana"` → `"Ana"`).
  - Last initial upper-cased; falls back to `"Unknown"` for empty/nullish.
- The assignee `SelectTrigger` no longer uses the auto-mirroring `<SelectValue>`. It renders a custom `<span className="truncate">` showing `All assignees` (for the ALL sentinel) or `abbreviateName(displayName(selectedSub))`. The full name is in a `title` tooltip.
- The `SelectItem`s (dropdown list) still render the **full** resolved name — and the "Me (Full Name)" option is unchanged.

The case filter trigger was not touched (not part of this request).

## Tests

`src/lib/format.test.ts` — added 6 cases for `abbreviateName` (first+last-initial, two words, single word, last-initial casing, whitespace collapse, nullish → "Unknown"). Suite: **21 passed**.

`npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Files

- `src/lib/format.ts`, `src/lib/format.test.ts`
- `src/features/tasks/components/TasksView.tsx`
