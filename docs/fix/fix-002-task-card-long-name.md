# Fix 002 — Task card breaks on long assignee names

**Status:** ✅ Fixed
**Date:** 2026-05-30
**Area:** Tasks Kanban card (`features/tasks/components/TaskCard.tsx`)
**Scope:** Frontend only

## Symptom

The Kanban task card showed the assignee's **full name** (e.g. "Jose David Jayk Vanegas"). On the compact card, the name shares a row with the avatar and the due date, so a long name pushed/overflowed the layout and broke the card design.

## Fix

Show only the **first name**, capped at **10 characters** (ellipsis when truncated):

- New pure helper `shortFirstName(name, max = 10)` in `src/lib/format.ts`:
  - First whitespace-delimited word only: `"Jose David Jayk Vanegas"` → `"Jose"`.
  - If that first word is longer than `max`, slice it and append `…`: `"Bartholomew"` → `"Bartholome…"`.
  - Falls back to `"Unknown"` for empty/nullish names.
- `TaskCard` renders `shortFirstName(assignee)` instead of the full name, with the **full name in a `title`** attribute (hover tooltip) so nothing is lost. The avatar still uses first+last initials.

The desktop **list/table** Assignee column and the mobile list card keep the full name (they have their own line/column and don't break on length).

## Tests

`src/lib/format.test.ts` — 7 cases: first-name extraction, 10-char cap + ellipsis, exact-10 untouched, single name, whitespace collapse, nullish → "Unknown", custom `max`.

`npm run lint`, `npm run typecheck`, `npm run test:run` (15 passed), `npm run build` — all green.

## Files

- `src/lib/format.ts` (new), `src/lib/format.test.ts` (new)
- `src/features/tasks/components/TaskCard.tsx`
