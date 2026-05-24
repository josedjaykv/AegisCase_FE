# Phase 0 — Tooling & component baseline

**Status:** ✅ Completed
**Duration estimate:** 1–2 days
**Dependencies:** none
**Implementation report:** [implementation.md](./implementation.md)
**Manual testing guide:** [manual-testing.md](./manual-testing.md)

## Objective

Vite + React + TS scaffold; ESLint/Prettier/Vitest; Tailwind; shadcn/ui init; CI lint+typecheck job; baseline `<AppShell>` with role-aware sidebar; environment config (`VITE_API_BASE_URL`).

## Deliverables

Project compiles, Storybook (optional) or showcase route renders shadcn primitives. Husky pre-commit running ESLint+Prettier.

## Backend integrations

None.

## Success criteria

`npm run build`, `npm test`, `npm run lint` all green in CI.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/tech-stack.md`](../../architecture/tech-stack.md) — to know exactly which deps to install
- [`docs/architecture/folder-structure.md`](../../architecture/folder-structure.md) — to scaffold the right tree
- [`docs/design-system.md`](../../design-system.md) — the tokens go straight into `tailwind.config.ts` and `globals.css`
- [`docs/running.md`](../../running.md) — for `.env.example` and script definitions
