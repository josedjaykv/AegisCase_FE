# User directory — resolving Keycloak `sub` → display name

Why this feature exists, what we changed in the backend, what we changed in the frontend, and the reasoning behind each decision.

> Reference doc for Phase 3. The original backend brief is in [`backend-prompt-user-directory.md`](./backend-prompt-user-directory.md). The endpoint registration touches the broader Keycloak/identity policy in [`docs/architecture/architecture.md` §4.7](../../architecture/architecture.md).

---

## 1. Why we did this

AegisCase stores cross-service user references as **Keycloak `sub`** UUIDs:

- `cases.leaderUserId` is a sub (the create logic compares it directly to `actor.sub`).
- `cases.createdByUserId` is a sub (set from the JWT).
- `case_team.userId` is a sub (so creator + lead rows are inserted using the JWT sub).
- Later: task assignees, evidence custodians — same pattern.

When the case detail page or the team list loads, all we have are those subs. Rendering "Leader: `7a9d75cb-20d6-…`" is technically correct but useless: investigators don't remember teammates by UUID. We needed names.

### Why the existing routes didn't work

Two routes already existed but neither was fit for this job:

| Route | Why it didn't fit |
|---|---|
| `GET /users/by-keycloak-ids` | ADMIN-only. Returns full `User[]` including `document`, `birthDate`, `jobTitle` (PII). A DETECTIVE viewing their own case team would 403, and even if we widened the route, leaking PII just so a teammate's name renders is the wrong trade. |
| `GET /auth/keycloak-users?search=` | Searches by name/email/username, **not** by `sub`. Wrong shape for "resolve these N subs to N names." |

### Why we did NOT just show names for ADMIN and UUIDs for everyone else

That option exists if we only wired up the existing ADMIN-only route on the FE. We considered and rejected it: a UI that varies fundamentally by role for a non-permission reason ("you see names, your colleague sees codes") is jarring and quietly tells DETECTIVE/ANALYST users that they're second-class. Consistent UX across roles is worth the small backend addition.

---

## 2. What changed in the backend (and why)

Implemented by the backend AI from [`backend-prompt-user-directory.md`](./backend-prompt-user-directory.md). Summary as delivered:

### A new route, not a widened one

```
GET /users/directory?ids=<sub1>,<sub2>,...
Authorization: Bearer <any authenticated role>

200 →
[
  { "keycloakUserId": "...", "firstNames": "...", "lastNames": "...", "role": "ADMIN" | "DETECTIVE" | "ANALYST" },
  ...
]
```

| Decision | Why |
|---|---|
| **Separate route** (`/users/directory`), not a widened `by-keycloak-ids` | Mixing response shapes per caller-role is a footgun: breaks caching, makes the contract role-dependent, one wrong `if` from leaking PII. Two contracts beats one mutable one. |
| **All authenticated roles** (no `RolesGuard`) | Every authed user has a legitimate need to identify other system members when viewing shared entities (cases, teams). |
| **Minimal projection** (4 fields, no `id`, `document`, `birthDate`, `jobTitle`, timestamps) | Defense in depth against PII leaks. If a new field is added to `User` tomorrow, this route still returns only the 4. |
| **`@Exclude()` + `@Expose()` on the response DTO, plus TypeORM `select:` projection** | Two layers of "the wrong field cannot leave": the DB query never loads it, and the serializer would drop it even if it did. |
| **Unknown subs are silently omitted, not 404'd** | A sub may correspond to a Keycloak user that hasn't been provisioned yet — perfectly valid. The FE handles a missing entry as "fall back to the sub." |
| **Cap of 100 ids per call (400 above)** | Prevents pathological queries; matches the size we'd ever expect for a single page (a team has a handful of members, not hundreds). |
| **Errors verbatim from the contract** (`ids is required`, `ids must be comma-separated UUIDs`, `Cannot resolve more than 100 ids per call`) | The FE relies on these exact strings only as the normalized message surfaces; tests on both sides match the public contract. |
| **No `RolesGuard` removal from `by-keycloak-ids`** | The PII-bearing route stays ADMIN-only. Two separate contracts coexisting is the correct design. |

### Test coverage they added

- Service unit tests with an explicit **leak guard**: `Object.keys(entry).sort()` must equal `['firstNames','keycloakUserId','lastNames','role']`. Any future field addition to `User` that accidentally bleeds into this response makes that test fail.
- E2E covering 200 for all three roles, 401 without a token, 400 for missing/empty/non-UUID/>100, and a regression block keeping `by-keycloak-ids` ADMIN-only with its full payload.

### Docs they updated

`BACKEND_INVESTIGATION_REPORT.md` §5.3, `apps/user-service/README.md`, `docs/API_REFERENCE.md`, and `libs/auth/src/permissions.reference.ts` (with both `user.readDirectory` for all roles and `user.readByKeycloakIds` ADMIN-only, with comments forbidding the widen-the-old-one shortcut).

---

## 3. What changed in the frontend (and why)

### 3.1 New service plumbing — `src/services/users/`

| File | Change | Why |
|---|---|---|
| `users.types.ts` | + `UserDirectoryEntry` interface (the 4-field projection). | Type the FE side of the new contract. |
| `users.api.ts` | + `getDirectory(subs: string[])` calling `GET /users/directory?ids=<csv>`. Early-returns `[]` for empty input. | Single canonical caller for the new route. Early return avoids a useless network request when the input is empty (e.g. before a case loads). |
| `users.queryKeys.ts` | + `directory(subs)` query-key factory. | Hierarchical key under `['users','directory', ...]` consistent with the rest of `services/users`. |
| `users.queries.ts` | + `useDisplayNames(subs)` hook. | Convenience layer: dedupes + sorts the sub list (so two consumers requesting the same subs in different orders share one cache entry), runs `useQuery`, and exposes `displayName(sub) => string \| null` for ergonomic consumption. |

### 3.2 Why a hook (`useDisplayNames`) and not just the raw query

Consumers needed three things on top of the raw query:

- Stable cache keys regardless of input order (the team page and the detail header pass overlapping-but-not-identical sub lists).
- Deduplication (leader sub is often also in the team list).
- A `displayName(sub)` lookup function so JSX stays clean.

Centralizing that in one hook avoids each consumer reinventing it (incorrectly).

### 3.3 Consumer updates

**`TeamMemberList.tsx`** — the original ask.

| Before | After |
|---|---|
| Mono UUID as primary line. | Resolved `"First Last"` as primary line. |
| — | Mono UUID **fallback** when the sub doesn't resolve (e.g. a sub that has no local profile yet). |
| Role badge + linked-on date unchanged. | Unchanged. |

The fallback is important: `/users/directory` silently omits unknown subs, so without a fallback the cell would render empty for an unprovisioned member. Showing the raw sub keeps the row honest and links to debuggable identity.

**`CaseDetailPage.tsx`** — header **Leader** and **Created by** cells.

We extended the change beyond the literal ask because the backend prompt explicitly covered "case leaders" and the same hook resolves them in one call. Leaving the header with UUIDs while the team list shows names would have looked broken.

Both cells now render the resolved name; if a sub doesn't resolve, they degrade to the mono UUID just like `TeamMemberList`.

### 3.4 What we deliberately did NOT change

- **`KeycloakUserPicker`** (`features/users/components/`) — unchanged. That component already shows names because it consumes `/auth/keycloak-users`, which has names in its payload. It serves a different concern (find a user by name to assign them) and has no reason to call `/users/directory`.
- **`api-integration.md` / `architecture.md` / CLAUDE.md** — not updated. The new route adds no new semantics (no 503 special-casing, no side effects, no policy shift); it sits inside the same field-ownership model already described in §4.7 ("Keycloak is identity; user-service holds the operational profile and is consulted for display data"). The per-phase implementation report is the right home for the FE-side wiring.
- **Embedding names into case/task payloads server-side.** That's a different architectural decision (denormalize for read perf) and was explicitly out of scope for this iteration.

---

## 4. End state

- Names render consistently for ADMIN, DETECTIVE and ANALYST anywhere a Keycloak sub used to be shown raw — today on case team rows and the case header.
- The same hook is ready to drop into Phase 6 (task assignees) and Phase 5 (evidence custodians) without further service-layer work.
- PII (`document`, `birthDate`, `jobTitle`) stays behind the ADMIN-only `/users/by-keycloak-ids` route; the directory route is the only one shared across roles.
- The previous Phase 3 limitation ("team / leader shown as UUIDs") is closed.

## 5. Files touched

| Concern | File |
|---|---|
| Type for directory entry | `src/services/users/users.types.ts` |
| HTTP call | `src/services/users/users.api.ts` |
| Query key | `src/services/users/users.queryKeys.ts` |
| Hook + dedupe/sort + map | `src/services/users/users.queries.ts` |
| Team row name | `src/features/cases/components/TeamMemberList.tsx` |
| Header leader / created-by | `src/features/cases/pages/CaseDetailPage.tsx` |
| Phase implementation report | [`implementation.md`](./implementation.md) (Addendum) |
| Phase manual testing | [`manual-testing.md`](./manual-testing.md) (§14) |
| Backend brief (history) | [`backend-prompt-user-directory.md`](./backend-prompt-user-directory.md) |
