# Backend Analysis Summary

> Originally §2 of CLAUDE.md. Reference doc — load when reasoning about which backend services / endpoints you are touching, or when sizing a phase against backend constraints.

## System Requirements

| Dimension | Finding |
|---|---|
| Core workflows | Investigation lifecycle, evidence custody chain, task lifecycle, media upload/download, audit traversal |
| Users / roles | `ADMIN`, `DETECTIVE`, `ANALYST` (encoded in Keycloak JWT, enforced by `RolesGuard`) |
| Data sensitivity | High (criminal/operational investigations) |
| Performance | Gateway throttles 100 req/60s/IP; auth 20/60s — frontend must batch and back off |

## Technology Constraints from Backend

| Constraint | Implication for FE |
|---|---|
| **Stack** NestJS + PostgreSQL + RabbitMQ + Keycloak (OIDC RS256) + S3 | Standard REST over HTTPS; no SDK needed |
| **API Gateway** at `http://localhost:3000` (single base URL) | One axios baseURL; route prefixing matches services |
| **Auth** Bearer JWT issued by Keycloak via `/auth/login`; refresh via `/auth/refresh` | Token refresh interceptor on 401 |
| **Authorization** Role baked into JWT (`realm_access.roles` → first of `ADMIN/DETECTIVE/ANALYST`) | Decode JWT or call `GET /auth/me` for role |
| **Microservices to integrate** 8 (auth, users, cases, involved, evidence, tasks, media, audit) | One typed client module per domain |
| **Real-time** None — server-internal RabbitMQ only | Polling strategy (see `api-integration.md` §Polling) |
| **File storage** S3 with presigned download URLs (1h TTL) | `<a href>` to presigned URL, never proxy through backend |
| **Pagination** `{ data, total, page, limit }`; defaults page=1, limit=20, max 100 (audit 1000) | One generic `Paginated<T>` type |
| **Field casing** camelCase everywhere **except** media upload form (`entity_type`, `entity_id`) and audit query (`entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`) | Per-service DTO mapping where needed |

## Functional Requirements

All endpoints catalogued in `BACKEND_INVESTIGATION_REPORT.md` §5. Frontend integrates against:

- **auth-service** (`/auth/*`): login, refresh, logout, me, validate.
- **user-service** (`/users/*`): create/list/get/update users (ADMIN-mostly).
- **case-service** (`/cases/*`): create, list, get, update, change-status, archive, team CRUD.
- **involved-service** (`/involved-persons/*`): register persons, link to cases.
- **evidence-service** (`/evidence/*`): register, list, get (mutates COC!), update, transfer-custody, archive, chain-of-custody.
- **task-service** (`/tasks/*`): create, list (sweeps overdue!), get, update, change-status.
- **media-service** (`/media/*`): multipart upload, per-entity list, get, presigned download URL, soft-delete.
- **audit-service** (`/audit/*`): query, by-entity timeline, by-user, by-id.

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | JWT in memory + refresh token; no PII in URL; HTTPS only in production; role-gated UI; CSP-friendly stack |
| Performance | Initial load < 2s on typical office network; route-level code splitting; TanStack Query cache for read endpoints |
| Scalability | Folder structure mirrors microservices so new domains slot in independently |
| Accessibility | WCAG 2.1 AA; keyboard navigation across forms/tables/dialogs; screen-reader labels on icon buttons |
