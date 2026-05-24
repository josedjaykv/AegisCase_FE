# Development Standards

> Originally §10 of CLAUDE.md. Load when authoring new code, writing tests, or reviewing a PR.

## 1. TypeScript

- `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- No `any` outside `services/http/*` (where untyped axios responses are normalized).
- Backend entity types live in `services/<domain>/<domain>.types.ts` and are re-exported from `types/domain.ts`.

## 2. Naming

- Files: `PascalCase.tsx` for components, `camelCase.ts` for everything else.
- TanStack Query keys: tuple of `['domain', 'subkey', params]` — e.g. `['cases', 'list', { page, limit }]`, `['cases', 'detail', id]`, `['cases', 'team', id]`. Centralized in `services/<domain>/<domain>.queryKeys.ts`.
- Zod schemas: `<Action><Entity>Schema`, e.g. `CreateCaseSchema`.

## 3. Lint & format

- ESLint with `typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`, `tailwindcss`.
- Prettier; run on pre-commit via Husky + lint-staged.
- CI gates: `npm run lint`, `npm run typecheck`, `npm test`.

## 4. Responsive standard

- **Mobile-compatible from day one** — every feature merged must work on `375 × 812` (mobile), `768 × 1024` (tablet), and `1440 × 900` (desktop) viewports.
- Use Tailwind responsive prefixes (`sm: md: lg: xl:`) — never write `@media` queries inline in components.
- No fixed pixel widths in feature code; use Tailwind tokens or `max-w-*` constraints.
- Hover-only affordances are forbidden — every action must be reachable via tap.
- The PR template includes a "Tested on mobile / tablet / desktop" checkbox; UI PRs require screenshots from at least two viewport profiles.

## 5. Testing conventions

- **Unit** — per-component / per-hook (Vitest + RTL).
- **Integration** — feature-level flows with MSW mocking the gateway (covers DTO casing, error paths).
- **E2E** — Playwright for login, evidence-view-dialog, task lifecycle (the three workflows where regressions would be worst).
- Coverage target: 70% statements globally, 90% on `services/` and `auth/` modules.

## 6. Commits & PRs

- Conventional commits (`feat:`, `fix:`, `refactor:`).
- One feature per PR; one screenshot per UI change; checklist for a11y + role-gating considerations.
