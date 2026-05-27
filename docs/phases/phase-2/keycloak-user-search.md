# Keycloak user search (`/users/new` picker)

How AegisCase looks up Keycloak users when creating a local profile: the flow we shipped, the alternatives we weighed, and the Keycloak configuration the feature depends on (with the reasoning behind it).

> This is a reference doc for the Phase 2 Users module. The endpoint contract lives in [`docs/architecture/api-integration.md` §7](../../architecture/api-integration.md); the field-ownership policy it enforces lives in [`docs/architecture/architecture.md` §4.7](../../architecture/architecture.md).

---

## 1. Why this exists

A user has **two** representations in AegisCase:

- **Keycloak** owns identity — credentials, realm role, `sub`, name, email.
- **user-service** owns the operational profile — `document`, `birthDate`, `jobTitle`, plus a *mirror* of the Keycloak-owned identity keyed by `keycloakUserId` so other services (cases, tasks, evidence) have a stable local FK.

To create a local profile we need the Keycloak `sub` and the canonical name/role. Typing a UUID and names by hand is error-prone and invites drift. So `/users/new` lets an ADMIN **search Keycloak** and pick a user; the FE then fills the identity portion of the create payload verbatim from that selection and only asks the admin for the operational fields.

---

## 2. What we shipped

### Request flow

```
Browser (ADMIN)                api-gateway            auth-service                 Keycloak Admin API
  │                                │                       │                              │
  │  GET /auth/keycloak-users      │                       │                              │
  │  ?search=ad&page=1&limit=10    │                       │                              │
  │  Authorization: Bearer <admin> │                       │                              │
  ├───────────────────────────────►  @Roles(ADMIN) edge    │                              │
  │                                ├──────────────────────►│  JwtAuthGuard + RolesGuard   │
  │                                │                       │                              │
  │                                │                       │  1. client_credentials grant │
  │                                │                       │     (service account token)  │
  │                                │                       ├─────────────────────────────►│
  │                                │                       │  2. GET /admin/.../users      │
  │                                │                       │     ?search=&first=&max=      │
  │                                │                       ├─────────────────────────────►│
  │                                │                       │  3. per-user realm roles      │
  │                                │                       │◄─────────────────────────────┤
  │                                │                       │                              │
  │                                │   4. batch join vs user-service                      │
  │                                │      GET /users/by-keycloak-ids?ids=...               │
  │                                │      (forwards caller's ADMIN token)                  │
  │◄──────────────────────────────┤◄──────────────────────┤                              │
  │  200 Paginated<KeycloakUser>   │                       │                              │
```

### What the FE sends and receives

- **Request:** `GET /auth/keycloak-users?search=<q>&page=<n>&limit=<m>`. The FE debounces input 300 ms and only fires once `q` is ≥ 2 characters.
- **Response:** `Paginated<KeycloakUser>` (camelCase end to end):

  ```ts
  {
    sub: string;                                    // Keycloak sub → used as keycloakUserId
    firstName: string;
    lastName: string;
    email: string;
    role: 'ADMIN' | 'DETECTIVE' | 'ANALYST' | null; // mapped realm role, null if none
    provisioned: boolean;                           // already has a user-service profile?
    userServiceId: string | null;                   // FK to users.id if provisioned
  }
  ```

### How the picker behaves (`KeycloakUserPicker.tsx`)

- **Search field** matches by **name, email or username** (whatever Keycloak's `search` param covers — see §5). Results render name + email + role badge.
- **Provisioned matches** (`provisioned: true`) are shown but **disabled**, with an "Open profile" link to `/users/<userServiceId>` instead of being selectable — so you can't create a duplicate, and you can jump to the existing profile.
- **Selecting an unprovisioned match** locks the identity portion of the form to that user's Keycloak values; only Document / Birth date / Job title remain editable.
- **No app role** (`role: null`) → the user is shown with a "No app role in Keycloak" pill and **cannot** be submitted until a role is assigned in Keycloak. (A profile with no role would be useless to the permission system.)
- **Empty results** → "No Keycloak user matches that search. Create the user in Keycloak first."
- **Errors** are surfaced inline: `404` → endpoint not deployed yet; `403` → caller lacks permission; `503` → Keycloak/service-account problem (see §4); anything else → the backend's own message.

### Why ADMIN-only, twice

The route is gated at the gateway edge (`@Roles(ADMIN)`) **and** in `auth-service` (`JwtAuthGuard + RolesGuard`). Keycloak's full user directory is sensitive; only ADMINs provisioning profiles should ever see it. The FE also hides the whole Users module from non-ADMINs, but that's UX hygiene — the server is the real boundary.

---

## 3. Alternatives we considered

### 3.1 Lookup shape

| Option | What it is | Why we rejected / chose it |
|---|---|---|
| **Manual UUID + names entry** (original Phase 2) | Admin pastes `sub` and types name/role | Error-prone, invites drift, terrible UX. Replaced. |
| **Lookup by exact ID** | Input a `sub`, hit an endpoint, prefill or 404 | Still requires copying a UUID out of Keycloak every time. Rejected as primary. |
| **Search / picker** ✅ *(chosen)* | Type a name/email, pick from results | Nobody remembers UUIDs; reusable later for case-leader / task-assignee / custody pickers. |

### 3.2 How the backend computes `provisioned`

| Option | What it is | Trade-off |
|---|---|---|
| **(a) Direct DB read** | `auth-service` reads `user_db.users` directly with a `WHERE keycloak_user_id IN (...)` | Fewer hops, but `auth-service` had **no DB connection** (only `HttpModule`) and a direct cross-DB read breaks data ownership. Precondition not met. |
| **(b) HTTP join** ✅ *(chosen)* | `auth-service` calls a new internal `GET /users/by-keycloak-ids` on `user-service`, batched by the page of subs | One extra HTTP call per page (not per row). Keeps each service owning its own DB. Degrades to `provisioned:false` if user-service is down rather than failing the whole request. |

### 3.3 How `provisioned` users are presented (FE)

| Option | Behavior | Why |
|---|---|---|
| Backend filters them out | Only unprovisioned users ever appear | Hides useful info ("this person already exists") |
| **Show but mark** ✅ *(chosen)* | All matches returned with a `provisioned` flag; FE disables them + links to the profile | Admin sees the whole picture and can jump to the existing profile |
| Don't filter, let 409 talk | Selecting a provisioned user fails at create with 409 | Worst UX — error after the fact |

### 3.4 Token used against the Keycloak Admin API

We do **not** forward the caller's user token to Keycloak's admin API — a logged-in ADMIN user is not necessarily a Keycloak realm-management admin. Instead `auth-service` authenticates with its **own service account** (client-credentials grant on the confidential `aegiscase-backend` client) and caches that admin token. This is what makes §4's configuration necessary.

---

## 4. Required Keycloak configuration (and why)

### The symptom

Until configured, the endpoint returns:

```json
{
  "statusCode": 503,
  "message": { "message": "Authentication service unavailable", "error": "Service Unavailable", "statusCode": 503 }
}
```

This is **not** Keycloak being down and **not** a FE or backend code bug — the FE surfaces this message faithfully. It means the backend's service account is not allowed to read the realm's user list.

### The fix

The `aegiscase-backend` Keycloak client's **service account** needs the `realm-management` client roles **`view-users`** and **`query-users`**:

1. Keycloak admin console → **Clients** → `aegiscase-backend`.
2. **Settings** → confirm **Service accounts enabled** is `On` (otherwise the *Service account roles* tab won't show).
3. **Service account roles** tab → **Assign role** → switch the filter to **"Filter by clients"** → search `realm-management`.
4. Assign **`view-users`** and **`query-users`**.
5. Restart `auth-service` (clears its cached admin token) or wait for the cached token to expire.

### Why these specific roles

- The endpoint authenticates as the **service account**, not as the human ADMIN (see §3.4). A bare confidential client can mint a token for itself but, by default, that token has **no realm-management permissions** — Keycloak does not let arbitrary clients read the user directory.
- **`view-users`** grants read access to users and their role mappings — required for `GET /admin/realms/{realm}/users` and the per-user realm-role lookup.
- **`query-users`** grants the ability to *search/filter* the user list (the `search=` parameter), as opposed to only fetching a known user by id. The picker relies on search, so both are needed.
- These are scoped to **read** only. We deliberately do **not** grant `manage-users` — the FE never creates or edits Keycloak users; identity is authored in Keycloak directly by whoever administers it.

### Why it's infra config, not code

Granting realm-management roles is a Keycloak realm decision (who is allowed to read your user directory), and it lives in the Keycloak datastore / realm export — outside both repos. It must be applied per environment (local, staging, prod). The backend README flags it; this doc records the reasoning so nobody "fixes" it in code by accident (e.g. by forwarding the user token, which would be a privilege-escalation footgun).

---

## 5. Known limitation: search does not match by `sub` UUID

Keycloak's `search=` parameter matches **username, email, first name and last name** — **not** the `sub` UUID. Pasting a `sub` into the picker will usually return **no results** even when everything is configured correctly.

- For day-to-day use, search by name or email — that's the intended path.
- If exact-UUID lookup is ever needed (e.g. deep-linking from another system), it requires a backend change: detect a UUID-shaped query and route it to `GET /admin/realms/{realm}/users/{id}` instead of the `search` list endpoint. This is **not** implemented today and is out of scope for the FE-only iteration.

---

## 6. Related limitations (require backend, deferred)

These are unchanged by the picker and tracked in `architecture.md` §4.7:

- **No cross-user sync.** An admin viewing another user's profile can't pull that user's current Keycloak values down — `/auth/me` is scoped to the caller. A future `POST /users/:id/sync` (server-side Keycloak admin read) would cover it.
- **No name-drift detection.** Once a profile exists, the FE has no signal that Keycloak names changed; only the self-role-drift banner (`KeycloakSyncBanner`, via `/auth/me`) exists today.

---

## 7. Files

| Concern | File |
|---|---|
| Picker UI | `src/features/users/components/KeycloakUserPicker.tsx` |
| Query hook + keys | `src/services/auth/keycloakUsers.queries.ts` |
| API call | `src/services/auth/keycloakUsers.api.ts` |
| Types | `src/services/auth/keycloakUsers.types.ts` |
| Debounce hook | `src/hooks/useDebouncedValue.ts` |
| Consumed by | `src/features/users/components/UserForm.tsx` (`CreateUserForm`) |
| Backend prompt (history) | [`backend-prompt-keycloak-search.md`](./backend-prompt-keycloak-search.md) |
