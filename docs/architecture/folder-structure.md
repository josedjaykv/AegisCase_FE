# Folder Structure (Detailed)

> Originally §8 of CLAUDE.md. The slim version (just the tree) lives inline in `CLAUDE.md`. Load this doc when adding new modules or unsure where a file belongs.

```
src/
├── app/
│   ├── App.tsx                 # Router + providers
│   ├── routes.tsx              # Route tree (lazy-loaded per module)
│   └── providers/
│       ├── QueryProvider.tsx   # TanStack Query client
│       ├── AuthProvider.tsx    # Hydrates auth from session
│       └── ToastProvider.tsx   # sonner mount
│
├── auth/
│   ├── permissions.ts          # Canonical role/action matrix
│   ├── RoleGate.tsx
│   ├── ProtectedRoute.tsx
│   └── usePermissions.ts
│
├── services/                   # One folder per backend microservice
│   ├── http/
│   │   ├── client.ts           # axios instance + interceptors
│   │   └── errors.ts           # ApiError normalization
│   ├── auth/
│   │   ├── auth.api.ts
│   │   ├── auth.types.ts
│   │   └── auth.queries.ts
│   ├── users/         …
│   ├── cases/         …
│   ├── involved/      …
│   ├── evidence/      …
│   ├── tasks/         …
│   ├── media/         …
│   └── audit/         …
│
├── features/                   # Domain UI grouped by microservice
│   ├── cases/
│   │   ├── pages/              # CaseListPage, CaseDetailPage, …
│   │   ├── components/         # CaseForm, CaseStatusPicker, …
│   │   └── schemas/            # Zod schemas for case forms
│   ├── evidence/    …
│   ├── tasks/       …
│   ├── involved/    …
│   ├── media/       …
│   ├── audit/       …
│   ├── users/       …
│   └── auth/        …
│
├── components/                 # Shared UI building blocks
│   ├── ui/                     # shadcn/ui generated primitives
│   ├── data/
│   │   ├── DataTable.tsx       # TanStack Table wrapper
│   │   ├── PaginationBar.tsx
│   │   └── EmptyState.tsx
│   ├── layout/
│   │   ├── AppShell.tsx        # sidebar + header
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── feedback/
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
│
├── stores/
│   ├── auth.store.ts           # Zustand
│   └── ui.store.ts
│
├── hooks/
│   ├── usePaginatedQuery.ts
│   ├── useDebouncedValue.ts
│   └── useVisibility.ts        # tab-visibility for polling pause
│
├── lib/
│   ├── date.ts                 # date-fns wrappers (ISO date helpers)
│   ├── format.ts
│   └── env.ts
│
├── types/
│   ├── api.ts                  # Paginated<T>, ApiError, JwtPayload
│   └── domain.ts               # Re-exports of entity types from services
│
├── styles/
│   ├── globals.css             # Tailwind base + tokens
│   └── tailwind.css
│
└── main.tsx
tests/
├── unit/                       # Vitest + RTL
├── integration/                # MSW-driven flows
└── e2e/                        # Playwright (Phase 9+)
```

## Folder rules

- **`services/`** is the only place that knows about HTTP, snake_case mapping, or TanStack Query keys.
- **`features/`** consumes `services/` hooks; it does **not** make raw HTTP calls.
- **`components/ui/`** holds shadcn-generated primitives — never edit them outside `components/ui`.
