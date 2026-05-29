# Backend prompt — `GET /users/directory` (all-roles sub → name resolver)

Copy everything **below the line** into your backend AI's prompt. It is self-contained and assumes only the existing AegisCase backend layout.

---

## Task

Add a new minimal-projection route `GET /users/directory?ids=<sub1>,<sub2>,...` on `user-service` (proxied through the api-gateway under the same path) that **any authenticated role** can call to resolve a list of Keycloak `sub`s into human-readable names. The frontend uses this to render case team members, case leaders (and later task assignees / evidence custodians) by name instead of raw UUIDs, regardless of who is viewing the case.

**Do NOT widen the existing `GET /users/by-keycloak-ids` route.** That route returns the full `User` entity, including PII (`document`, `birthDate`, `jobTitle`), and is correctly ADMIN-only. A non-admin must not receive that payload just to render a teammate's name. The right fix is a new route with a **narrow** projection — the two routes coexist.

## Endpoint contract

```
GET /users/directory?ids=<sub1>,<sub2>,...
Authorization: Bearer <token>

Roles: any authenticated user (ADMIN, DETECTIVE, ANALYST).

Query params:
  ids   string, required. Comma-separated list of Keycloak `sub` UUIDs.
        Each id is validated as a UUID. Hard cap 100 ids per call.

200 OK →
[
  {
    "keycloakUserId": "<sub>",
    "firstNames":     "<string>",
    "lastNames":      "<string>",
    "role":           "ADMIN" | "DETECTIVE" | "ANALYST"
  },
  ...
]

- The response includes ONLY entries that match a row in user_db.users.
  Unknown subs are silently omitted (no 404). The FE handles missing
  entries as "show the sub as fallback".
- The response includes ONLY the four fields above. No `id`, no
  `document`, no `birthDate`, no `jobTitle`, no timestamps.

Errors:
  - 400 "ids is required"                          (param missing/empty)
  - 400 "ids must be comma-separated UUIDs"        (any id not a UUID)
  - 400 "Cannot resolve more than 100 ids per call" (> 100 ids)
  - 401 invalid token (existing guard)
```

## Why a separate route, not a widened one

| Route | Roles | Returns | Rationale |
|---|---|---|---|
| `GET /users/by-keycloak-ids` (existing, **unchanged**) | ADMIN | Full `User[]` (incl. document, birthDate, jobTitle) | ADMIN tooling needs the operational record |
| `GET /users/directory` (new) | any authed | Minimal `{ keycloakUserId, firstNames, lastNames, role }[]` | Everyone in the system needs to identify teammates without seeing PII |

Reusing the existing route by varying its shape per caller-role is a footgun: response shape that depends on the caller breaks contracts, breaks caching, and is one wrong `if` away from leaking PII. Keep the contracts separate.

## Implementation guidance

1. **Location.** Add to `UsersController` / `UsersService` in `user-service`. The route must be declared **before** `:id` so it isn't captured as a path param (same constraint that already exists for `by-keycloak-ids`).

2. **Service method.** Either reuse the existing `findByKeycloakIds` and project to the minimal DTO in the service before returning, or add a new repository call with TypeORM `select: ['keycloakUserId', 'firstNames', 'lastNames', 'role']` so the full row is never loaded. The latter is preferred — defense in depth against accidental field leaks.

3. **Request DTO.** `apps/user-service/src/users/dto/directory-query.dto.ts`:
   - `ids: string` with `@Transform` splitting on comma, then `@IsArray @ArrayMaxSize(100) @IsUUID('all', { each: true })`.
   - Reject empty / missing with the 400 messages above.

4. **Response DTO.** `apps/user-service/src/users/dto/user-directory-entry.dto.ts`. List the four allowed fields explicitly. Add `@Exclude()` on the controller response (class-transformer) so any additional `User` field that gets added later is **excluded by default** — defense in depth. A test (see §Tests) guards against drift.

5. **Auth.** Use the existing `JwtAuthGuard` only. Do **not** add a `RolesGuard` — the route is open to every authenticated caller.

6. **Gateway.** Proxy `GET /users/directory` from `api-gateway` to `user-service` with the standard auth passthrough. No edge `@Roles` decorator. List it among the other proxied user-service routes.

7. **No events, no audit, no caching headers.** Read-only, no side effects.

## Tests

All new tests in the same PR; existing suite must still pass.

- **Unit (service):**
  - empty result for unknown subs;
  - mixed known/unknown subs returns **only** the known entries (no 404);
  - returned objects contain **exactly** the four allowed fields — assert with `Object.keys(entry).sort()` equals `['firstNames','keycloakUserId','lastNames','role']`. This is the leak guard.
- **E2E (controller via gateway):**
  - 200 for ADMIN, DETECTIVE, ANALYST tokens (mirror the Phase 2 `keycloak-users.e2e-spec.ts` style);
  - 401 without a token;
  - 400 when `ids` is missing, empty, malformed (non-UUID), or > 100 ids — each with the documented message;
  - response is deep-equal (`toEqual`, not `toMatchObject`) to the expected minimal shape so an accidental `id` / `document` leak fails the test.
- **Regression:** `GET /users/by-keycloak-ids` continues to 200 only for ADMIN with the full `User[]` payload (unchanged contract).

## Manual smoke

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@aegiscase.com","password":"Admin1234!"}' | jq -r .access_token)
DETECTIVE_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"detective1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)
ANALYST_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"analyst1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)

# Pick a couple of real subs from your seed
SUBS='<sub1>,<sub2>'

# All three roles get the same shape and data
for TOKEN in "$ADMIN_TOKEN" "$DETECTIVE_TOKEN" "$ANALYST_TOKEN"; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/users/directory?ids=$SUBS" | jq
done

# PII leak guard — keys must be exactly the 4 allowed
curl -s -H "Authorization: Bearer $DETECTIVE_TOKEN" \
  "http://localhost:3000/users/directory?ids=$SUBS" \
  | jq '.[0] | keys | sort'
# Expect: ["firstNames","keycloakUserId","lastNames","role"]

# 400 path
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  'http://localhost:3000/users/directory?ids=not-a-uuid' -i
# Expect: HTTP/1.1 400, message "ids must be comma-separated UUIDs"
```

## Documentation updates (REQUIRED — update **every** doc this touches in the same PR)

This is non-negotiable. When you finish the route, update **every** doc the new endpoint affects, in the same PR:

1. **`BACKEND_INVESTIGATION_REPORT.md` §5.3 (user-service)** — add a new sub-section `GET /users/directory` documenting the route, its request/response DTOs, error messages, roles, no side-effects. Also update the existing `GET /users/by-keycloak-ids` sub-section to cross-reference the new route ("for a PII-free, all-roles version see `/users/directory`").
2. **`apps/user-service/README.md`** — list the new route alongside `by-keycloak-ids` with the one-line privacy rationale.
3. **Permissions / role reference** — wherever the canonical role × action matrix lives (e.g. `libs/auth/src/permissions.reference.ts` or its companion doc), explicitly list the new route as readable by all authenticated roles. Add a short note that `by-keycloak-ids` remains ADMIN-only.
4. **Gateway README / routing list** (if one exists) — list `GET /users/directory` next to the other proxied user-service routes.
5. **Changelog / migration notes** (if maintained) — call out the new route and that `by-keycloak-ids` is unchanged.
6. **Any existing doc that says "the only way to resolve a sub to a name is ADMIN-only"** — update it to mention `/users/directory` as the all-roles option.

If you discover a doc you're not sure about, mention it in the PR description so it can be reviewed rather than skipping it.

## Out of scope (do NOT do)

- Do **not** widen `GET /users/by-keycloak-ids`. Contract unchanged: ADMIN-only, full `User[]`.
- Do **not** add similar `directory` routes to other services (cases, tasks, evidence). Separate ticket.
- Do **not** embed names into case / task / evidence response payloads — that's a different architectural decision, not this ticket.
- Do **not** change the request param style (`?ids=a,b,c` comma-separated). The FE will start consuming this exact shape.
- Do **not** add a single-id helper (`GET /users/directory/:sub`). The batch endpoint is sufficient.
