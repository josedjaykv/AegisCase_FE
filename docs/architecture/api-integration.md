# API Integration

> Originally §6 of CLAUDE.md. Load this doc whenever you are wiring a new endpoint, configuring TanStack Query caching, or translating field casing at the network boundary.

## 1. Base configuration

```ts
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});
```

Interceptors: auth header injection, 401-refresh, 429 exponential back-off, error normalization.

## 2. Service inventory (mapped to FE modules)

| Backend service | FE module | Key endpoints | Notes |
|---|---|---|---|
| auth-service | `services/auth` | login, refresh, logout, me, validate | Tokens in memory |
| user-service | `services/users` | POST/GET/PUT users | ADMIN-only for writes |
| case-service | `services/cases` | CRUD + status + archive + team | Team is loaded only on `GET /cases/:id` |
| involved-service | `services/involved` | CRUD + link-to-case | `caseId` not validated by backend → FE must verify |
| evidence-service | `services/evidence` | CRUD + transfer + archive + COC | **`GET /:id` mutates** — wrap in dialog |
| task-service | `services/tasks` | CRUD + status | List triggers `OVERDUE` sweep |
| media-service | `services/media` | upload + by-entity + download-url + delete | Snake_case form fields; presigned URL for download |
| audit-service | `services/audit` | query + by-entity + by-user + by-id | Snake_case query params |

## 3. Caching strategy (TanStack Query)

| Resource | `staleTime` | `cacheTime` / `gcTime` | `refetchInterval` |
|---|---|---|---|
| `/auth/me` | Infinity (until logout) | Infinity | — |
| `/users` list | 5 min | 10 min | — |
| `/cases` list | 1 min | 5 min | — |
| `/cases/:id` | 30 s | 5 min | 60 s (on detail page focus) |
| `/tasks` for me | 0 | 5 min | 30–60 s (drives overdue sweep) |
| `/evidence` list | 30 s | 5 min | — |
| `/evidence/:id` | Manual fetch only (via dialog) | 1 min | — |
| `/evidence/:id/chain-of-custody` | 30 s | 5 min | 60 s on detail focus |
| `/audit` feed | 0 | 5 min | 30 s (when feed widget visible) |
| `/media/entity/:type/:id` | 1 min | 5 min | — |

Mutations invalidate the relevant list queries (`cases`, `cases.detail(id)`, `cases.team(id)`, etc.) using strict query keys like `['cases', { page, limit }]`.

## 4. Pagination integration

- One generic `usePaginatedQuery<T>(key, fetcher, { page, limit })` returning `{ data, total, page, limit }`.
- URL search params drive `page` and filter state so deep links and back/forward work.
- For endpoints that **lack** pagination (`/media/entity/...`, `/cases/:id/team`, `/audit/entity/...`, `/evidence/:id/chain-of-custody`, `/involved-persons/:id/cases`), we accept the raw array and paginate client-side if needed.

## 5. Polling strategy (replacement for real-time)

| Surface | Endpoint | Interval | Trigger |
|---|---|---|---|
| My active tasks widget | `GET /tasks?assignedToUserId=<me>` | 30–60 s | While dashboard mounted |
| Case detail | `GET /cases/:id` + tasks/evidence subqueries | 60 s | While route active and tab visible |
| Audit feed | `GET /audit?from_date=<lastSeenIso>&limit=100` | 30 s | While feed widget visible |
| Task detail | `GET /tasks/:id` | 60 s | Active route only |

All polling is `refetchIntervalInBackground: false` so hidden tabs do not eat the 100 req/60s budget.

## 6. Field-casing translation

The data layer handles all DTO mapping at the network boundary. The app code only ever sees camelCase.

```ts
// services/audit/audit.api.ts
function toAuditQuery(input: AuditQuery): URLSearchParams {
  return new URLSearchParams({
    ...(input.entityType && { entity_type: input.entityType }),
    ...(input.entityId && { entity_id: input.entityId }),
    ...(input.userId && { user_id: input.userId }),
    ...(input.fromDate && { from_date: input.fromDate }),
    ...(input.toDate && { to_date: input.toDate }),
    ...(input.action && { action: input.action }),
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });
}
```

Same pattern for `POST /media` multipart fields.
