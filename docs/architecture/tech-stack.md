# Technology Stack & Justifications

> Originally §3 of CLAUDE.md. Reference doc — load when proposing a new dependency, or when justifying a tooling choice in a PR.

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18 + TypeScript** | Largest ecosystem for enterprise admin apps, deep tooling, great library support for tables/forms/auth. Vue/Svelte have smaller enterprise component libraries; Angular is heavier than needed for an 8-domain SPA |
| Build tool | **Vite** | Fast dev server with HMR for a multi-domain app; first-class TS; modern ESM output; far better DX than CRA/Webpack |
| Routing | **React Router v6** | Mature, supports nested routes for `/cases/:id/{evidence,tasks,team,involved,audit}` pattern naturally |
| Server state | **TanStack Query (React Query) v5** | The backend is REST-paginated, no real-time, polling-driven — exactly the use case TanStack Query nails. Cache invalidation, background refetch, `refetchInterval` for polling, retry/backoff for 429 |
| Client state | **Zustand** | Minimal client-side state needed (auth, UI prefs, dialogs). Redux Toolkit is overkill here; Context API would re-render too widely; Zustand is ~1KB with selectors |
| HTTP client | **Axios** | Interceptors for `Authorization` and 401-refresh are first-class; better cancellation ergonomics than fetch for this app size |
| UI components | **shadcn/ui** (Radix primitives + Tailwind) | Owned-in-repo (no version lock-in), accessible by default (Radix), highly customizable for the law-enforcement neutral/professional aesthetic. MUI is heavier and harder to theme; Chakra requires a runtime emotion overhead |
| Styling | **Tailwind CSS** | Pairs natively with shadcn/ui; fastest iteration; zero runtime cost; small final CSS via purging |
| Forms | **React Hook Form + Zod** | Most DTOs have strict validators (`@IsUUID`, `@IsEnum`, `@IsDateString`, `@MinLength`) → Zod schemas can mirror backend validators 1:1. RHF gives us un-controlled performance for large case/evidence forms |
| Tables | **TanStack Table v8** | Headless table for paginated case/task/audit lists; integrates naturally with TanStack Query pagination state |
| Date/time | **date-fns** + **date-fns-tz** | Tree-shakeable; precise control for ISO-8601 (`YYYY-MM-DD`) inputs the backend expects; lighter than moment/luxon |
| File upload | **Native FormData** + axios `onUploadProgress` | Backend re-verifies MIME via magic bytes; FE only needs progress + size pre-check |
| Toasts/notifications | **sonner** | Lightweight, accessible, plays well with shadcn/ui |
| Icons | **lucide-react** | Default for shadcn/ui; tree-shakeable |
| Drag-and-drop | **@dnd-kit/core** + **@dnd-kit/sortable** | Powers the Kanban board; accessible (keyboard + screen reader), tree-shakeable, lighter than `react-beautiful-dnd` (which is unmaintained) |
| Error tracking | **Sentry** (browser SDK) | Capture client exceptions and failed API calls; respect privacy (no PII in breadcrumbs) |
| Testing | **Vitest** + **React Testing Library** + **MSW** (mock-service-worker) | Vitest matches Vite; MSW lets us mock the 8 services without coupling to fetch internals; Playwright for E2E in Phase 9 |
| Lint/format | **ESLint** (typescript-eslint, react, react-hooks, jsx-a11y) + **Prettier** | jsx-a11y enforces our a11y goals; Prettier removes style debates |
| i18n | **Deferred** (not in V1) | Backend is single-locale; messages currently English/Spanish-mixed. Add `react-intl` only if a second locale lands |
| Analytics | **Deferred** | Law-enforcement context; do not ship third-party analytics in V1 |

## Rejected alternatives (with reasoning)

- **Redux Toolkit + RTK Query** — RTK Query overlaps with TanStack Query but is more verbose; Redux adds boilerplate we don't need for an app whose client state is essentially `{ auth, ui }`.
- **MUI** — Beautiful but theming the professional/neutral law-enforcement aesthetic away from "Material" is significant work, and bundle weight is higher.
- **Next.js / Remix** — No SEO needs; this is an authenticated app behind a login wall. SSR adds operational complexity without clear gain.
- **GraphQL/Apollo** — Backend is REST and event-driven; introducing a BFF is out of scope for V1.
