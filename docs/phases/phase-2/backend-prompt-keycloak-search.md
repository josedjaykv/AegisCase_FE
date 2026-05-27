# Backend prompt — `GET /auth/keycloak-users` (Keycloak user search)

Copy everything **below the line** into your backend AI's prompt. It is self-contained and assumes only the existing AegisCase backend layout.

---

## Task

Add a new endpoint `GET /auth/keycloak-users` to `auth-service`, exposed through the gateway, that lets an ADMIN frontend search Keycloak users by free text and learn which of those users already have an operational profile in `user-service`. This powers a "pick a Keycloak user" combobox the FE uses to create new user profiles without manual UUID/name copy-paste.

The FE already consumes this endpoint with the contract below; do not change the response shape unless you flag it explicitly.

## Endpoint contract

```
GET /auth/keycloak-users?search=<q>&page=<n>&limit=<m>
Authorization: Bearer <admin_token>

Allowed roles: ADMIN only.

Query params:
  - search  string,  required, min length 2 server-side
  - page    integer, default 1, ≥ 1
  - limit   integer, default 20, 1..50

200 OK →
{
  "data": [
    {
      "sub":            "<keycloak sub UUID>",
      "firstName":      "<keycloak firstName>",
      "lastName":       "<keycloak lastName>",
      "email":          "<keycloak email>",
      "role":           "ADMIN" | "DETECTIVE" | "ANALYST" | null,
      "provisioned":    true | false,
      "userServiceId":  "<user-service users.id UUID>" | null
    },
    ...
  ],
  "total": <int>,
  "page":  <int>,
  "limit": <int>
}

Errors:
  - 400 if `search` missing/too short ("search must be at least 2 characters")
  - 401 if no/invalid token (handled by existing guard)
  - 403 if caller is not ADMIN
  - 503 if Keycloak admin API is unreachable ("Authentication service unavailable")
```

Field semantics:

- `sub` — the Keycloak `sub` UUID. The FE uses it as `keycloakUserId` when creating the user-service profile.
- `role` — the single AegisCase realm role (`ADMIN` / `DETECTIVE` / `ANALYST`) the Keycloak user has assigned. If they have none, return `null` (the FE shows a "no app role" hint and refuses to submit until one is assigned in Keycloak). If they somehow have more than one of the three, prefer the most privileged (`ADMIN` > `DETECTIVE` > `ANALYST`) and log a warning server-side.
- `provisioned` — `true` iff a row exists in `user_db.users` with `keycloak_user_id = sub`. `userServiceId` carries that row's `id`; otherwise both `provisioned: false` and `userServiceId: null`.

## Implementation guidance

1. **Where it lives.** Add a new controller route in `auth-service` (e.g. `apps/auth-service/src/keycloak/keycloak-users.controller.ts`) and a `KeycloakUsersService`. Expose it through the gateway under `/auth/keycloak-users` (same prefix as the rest of the auth routes).

2. **Calling Keycloak.** Use the existing Keycloak admin client (the one already configured for login/refresh in `auth-service`). The admin REST API supports:
   - `GET /admin/realms/{realm}/users?search=<q>&first=<offset>&max=<limit>&briefRepresentation=false`
   - `GET /admin/realms/{realm}/users/count?search=<q>` for `total` (Keycloak's `search` matches first name, last name, username, email).
   - Per-user roles: `GET /admin/realms/{realm}/users/{id}/role-mappings/realm` (or include `realmRoles` via `briefRepresentation=false` if the version returns them inline — verify, the field is sometimes missing).
   - Authenticate with the same service-account client used elsewhere (do NOT use the caller's bearer token against the admin API).

3. **Joining against user-service.** Two options, prefer (a):
   - **(a) Cross-service DB read.** If `auth-service` already has a read-only connection to `user_db.users`, just do `SELECT id, keycloak_user_id FROM users WHERE keycloak_user_id IN (...subs)` after fetching the Keycloak page. O(1) extra query per page.
   - **(b) HTTP call to `user-service`.** Add an internal `GET /users/by-keycloak-ids?ids=...` route on `user-service` (ADMIN-only or internal-only) and call it from `auth-service`. Slightly more boilerplate.

   Either way, the cross-service link must NOT add a second round-trip per item — batch by the page of subs you already fetched.

4. **Role mapping.** Map Keycloak realm roles to the AegisCase enum:
   ```
   const APP_ROLES = ['ADMIN', 'DETECTIVE', 'ANALYST'] as const;
   const picked = user.realmRoles.find(r => APP_ROLES.includes(r));  // or precedence pick
   ```
   Anything else is ignored. Return `null` if none matches.

5. **Pagination math.** Keycloak's admin API uses `first`/`max` (offset/limit), not `page`. Compute `first = (page - 1) * limit`. Use `/users/count` for `total` so the FE can render "Showing X–Y of T".

6. **Error mapping.** Wrap any Keycloak error in the existing uniform error envelope (`statusCode`, `timestamp`, `path`, `message`). A network/connection failure → `503` with `message: "Authentication service unavailable"` (the FE already special-cases this).

7. **Guards / authorization.** Mirror the existing ADMIN-only guard used for `POST /users`. Do not let DETECTIVE/ANALYST hit this route — Keycloak data is sensitive.

8. **No events.** This endpoint is read-only; do not publish anything to the message bus.

## Tests to add

- **Unit**: role-mapping helper (`null`, single matching role, multiple matching → highest precedence, no matching → `null`).
- **Integration** (per existing auth-service e2e style):
  - 403 for DETECTIVE/ANALYST tokens.
  - 400 when `search` is shorter than 2 chars.
  - Happy path: known Keycloak user appears with correct `sub` / `email` / `role`.
  - `provisioned: true` and `userServiceId` populated for a Keycloak user that has a row in `user_db.users`; `provisioned: false` / `userServiceId: null` for one that doesn't.
  - 503 when Keycloak admin API is unreachable (mock the client to throw).
- **Backwards-compat:** confirm none of the existing `/auth/*` routes regress.

## Manual smoke

```bash
TOKEN=$(./scripts/login.sh admin@aegiscase.com Admin1234!)

curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3000/auth/keycloak-users?search=oli&page=1&limit=10' | jq

# Expect: paginated list, each item has sub, firstName, lastName, email, role, provisioned, userServiceId.

curl -H "Authorization: Bearer $DETECTIVE_TOKEN" \
  'http://localhost:3000/auth/keycloak-users?search=oli' -i

# Expect: 403.
```

## Documentation updates (in the backend repo)

- Add a new subsection `5.2.x` under `BACKEND_INVESTIGATION_REPORT.md` §5.2 (auth-service) describing this route, its DTOs, errors, and side-effects (none).
- Mention in the auth-service README that the route depends on the admin service-account credentials being configured (same env vars used by login).
- Keep `cors` settings unchanged — the FE already calls `/auth/*`.

## Out of scope (do **not** do as part of this task)

- `POST /users/:id/sync` — pulling Keycloak values down for an *already-provisioned* user. That's a separate ticket; the FE has a placeholder banner for self-sync that uses `/auth/me`.
- Modifying or mirroring `firstNames`/`lastNames` into user-service when Keycloak changes them. Same — separate ticket.
- A `GET /auth/keycloak-users/:sub` single-lookup route. The search endpoint above also matches by UUID, so it covers that case.
