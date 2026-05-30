# Backend prompt — `GET /tasks?caseId=` filter

Copy everything **below the line** into your backend AI's prompt. Self-contained.

---

## Task

Add an optional `caseId` query-param filter to `GET /tasks`, so the frontend can fetch the tasks for a single case without pulling the global list and filtering client-side.

## Why

`GET /tasks` today accepts only `page`, `limit`, `assignedToUserId`. The case-scoped Kanban board (`/cases/:id/tasks`) needs all tasks **for one case across every status**. Without a `caseId` filter, the FE fetches a large page of global tasks and filters client-side — which silently misses a case's tasks that fall outside the fetched page once the global volume grows. A server-side `caseId` filter makes the case board correct and cheap.

## Contract

```
GET /tasks?caseId=<uuid>&page=&limit=&assignedToUserId=
Roles: ADMIN, DETECTIVE, ANALYST  (unchanged)

- caseId: optional, @IsUUID() when present.
- Combine with the existing assignedToUserId filter (AND).
- Still runs the OVERDUE sweep (markOverdueTasks) before returning — unchanged.
- Response shape unchanged: { data, total, page, limit }.
```

- Unknown/blank `caseId` → treat as "no filter" (or return empty `data` for a syntactically-valid-but-nonexistent case; the FE handles `[]`). Do **not** 404 on an unknown caseId (consistent with the rest of the system).

## Implementation

- Add `caseId?: string` to the tasks list query DTO with `@IsOptional() @IsUUID()`.
- In `TasksService.findAll`, add `where: { ...(caseId ? { caseId } : {}) }` alongside the existing `assignedToUserId` filter.
- No new index strictly required (the entity already indexes `caseId`).

## Tests

- `GET /tasks?caseId=X` returns only tasks with `caseId = X`.
- Combined `?caseId=X&assignedToUserId=Y` returns the intersection.
- Omitting `caseId` is unchanged (regression).
- OVERDUE sweep still runs.

## Manual smoke

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"detective1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/tasks?caseId=<caseId>&limit=100" | jq '.data | length'
```

## Docs (same PR)

- `BACKEND_INVESTIGATION_REPORT.md` §5.7 — add `caseId?` to the `GET /tasks` query params.
- `docs/API_REFERENCE.md` — note the new filter.
- **New feature documentation: Feature 005** 

## Out of scope

- Do not change the OVERDUE sweep behavior, the response shape, or any other task route.
- Do not add status/priority/date filters — the FE does those client-side for now.
