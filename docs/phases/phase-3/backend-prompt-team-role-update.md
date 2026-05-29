# Backend prompt — `PATCH /cases/:id/team/:userId` (update a team member's role)

Copy everything **below the line** into your backend AI's prompt. It is self-contained and assumes only the existing AegisCase backend layout.

---

## Task

Add a route to update the `teamRole` of an **existing** case team member: `PATCH /cases/:id/team/:userId`. Today `case-service` can add a member (`POST /cases/:id/team`) and list members (`GET /cases/:id/team`) but cannot change a member's role — the frontend needs to let an ADMIN/DETECTIVE promote a `MEMBER` to `LEAD` (or demote a `LEAD` to `MEMBER`) without removing and re-adding them (and re-adding is impossible anyway: `POST` 409s on the existing `(caseId, userId)` pair).

## Why a new route is required

- The `case_team` row is keyed by the composite PK `(case_id, user_id)`. There is no update path today.
- `POST /cases/:id/team` cannot serve this — it 409s when `(caseId, userId)` already exists.
- There is no "remove member" route either, so delete-then-re-add is not an option.

## Endpoint contract

```
PATCH /cases/:id/team/:userId
Authorization: Bearer <token>

Roles: ADMIN, DETECTIVE  (same as POST /cases/:id/team).

Path params:
  id      UUID — the case id
  userId  UUID — the team member's Keycloak sub (the case_team.user_id)

Body (UpdateTeamMemberDto):
  | Field      | Type          | Required | Validator                                   |
  |------------|---------------|:--------:|---------------------------------------------|
  | teamRole   | enum TeamRole |   Yes    | @IsEnum(TeamRole) — but see CREATOR rule    |

200 OK → the updated CaseTeam row:
  { "caseId": "...", "userId": "...", "teamRole": "LEAD", "linkedAt": "..." }

Errors:
  - 400 "teamRole is required" / "teamRole must be a valid role"   (validation)
  - 400 "The case creator's role cannot be changed"                (see CREATOR rule)
  - 400 "Cannot assign the CREATOR role"                           (see CREATOR rule)
  - 400 "A closed case cannot be modified"                         (consistency with PUT /cases/:id — see below)
  - 403                                                            (non ADMIN/DETECTIVE)
  - 404 "Case not found"                                           (case id missing)
  - 404 "Team member not found"                                    ((caseId, userId) pair missing)
```

## Business rules

1. **CREATOR is immutable provenance.** The member whose current `teamRole === CREATOR` cannot be changed — reject with `400 "The case creator's role cannot be changed"`. Likewise, no member may be *assigned* `CREATOR` via this route — reject with `400 "Cannot assign the CREATOR role"`. In practice this route only ever swaps a member between `LEAD` and `MEMBER`.

2. **Closed-case consistency.** `PUT /cases/:id` already refuses to modify a `CLOSED` case (`400 "A closed case cannot be modified"`). Apply the same guard here so team composition can't drift on a closed case. (If you decide team edits should be allowed on closed cases, flag it in the PR — but default to consistent with `update`.)

3. **No-op is fine.** If `teamRole` equals the current value, return `200` with the row unchanged (idempotent); do not 409.

4. **No new unique-constraint concerns.** The PK `(caseId, userId)` is unchanged; only the `team_role` column is written.

## Implementation guidance

1. **Location.** Add to `CasesController` / `CasesService` in `case-service`, next to `addTeamMember`. Method e.g. `updateTeamMemberRole(caseId, userId, dto)`.

2. **Service logic:**
   - Load the case; `404 "Case not found"` if missing.
   - Reuse the existing closed-case guard from `update` (`400` if `status === CLOSED`).
   - Load the `case_team` row by `(caseId, userId)`; `404 "Team member not found"` if missing.
   - If the loaded row's `teamRole === CREATOR` → `400 "The case creator's role cannot be changed"`.
   - If `dto.teamRole === CREATOR` → `400 "Cannot assign the CREATOR role"`.
   - Otherwise set `team_role = dto.teamRole`, save, return the row.

3. **DTO.** `apps/case-service/src/cases/dto/update-team-member.dto.ts` with `teamRole: TeamRole` (`@IsEnum`). The two CREATOR rejections are enforced in the service (not the DTO) so the messages are exact.

4. **Guards.** Same `@Roles(ADMIN, DETECTIVE)` decorator used on `POST /cases/:id/team`.

5. **Gateway.** Proxy `PATCH /cases/:id/team/:userId` to `case-service` with auth passthrough, mirroring how the other `/cases/*` routes are proxied. Match the role decorator at the edge if the gateway enforces roles there too.

6. **Events.** None. Adding/removing/role-changing team members publishes nothing today (only `case.created` / `case.closed` / `case.archived` exist); keep this route event-free unless you intentionally introduce a `case.team.updated` event — if so, document it.

## Tests

- **Unit (service):**
  - happy path MEMBER → LEAD and LEAD → MEMBER returns the updated row;
  - no-op (same role) returns 200 unchanged;
  - CREATOR row rejected with the exact message;
  - assigning CREATOR rejected with the exact message;
  - closed case rejected with "A closed case cannot be modified";
  - missing case → 404 "Case not found"; missing member → 404 "Team member not found".
- **E2E (via gateway):**
  - 200 for ADMIN and DETECTIVE; 403 for ANALYST;
  - 401 without a token;
  - 400 for invalid/missing `teamRole`;
  - the CREATOR and closed-case 400s;
  - regression: `POST /cases/:id/team` and `GET /cases/:id/team` behavior unchanged.

## Manual smoke

```bash
DET_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"detective1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)

# Promote a MEMBER to LEAD
curl -i -X PATCH http://localhost:3000/cases/<caseId>/team/<userSub> \
  -H "Authorization: Bearer $DET_TOKEN" -H 'Content-Type: application/json' \
  -d '{"teamRole":"LEAD"}'
# Expect 200 with teamRole: "LEAD"

# Try to change the creator → 400
curl -i -X PATCH http://localhost:3000/cases/<caseId>/team/<creatorSub> \
  -H "Authorization: Bearer $DET_TOKEN" -H 'Content-Type: application/json' \
  -d '{"teamRole":"MEMBER"}'
# Expect 400 "The case creator's role cannot be changed"

# ANALYST forbidden
ANALYST_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"analyst1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)
curl -i -X PATCH http://localhost:3000/cases/<caseId>/team/<userSub> \
  -H "Authorization: Bearer $ANALYST_TOKEN" -H 'Content-Type: application/json' \
  -d '{"teamRole":"MEMBER"}'
# Expect 403
```

## Documentation updates (REQUIRED — same PR)

Update **every** doc this route touches, in the same PR:

1. **`BACKEND_INVESTIGATION_REPORT.md` §5.4 (case-service)** — add a `PATCH /cases/:id/team/:userId` sub-section (DTO, errors, roles, CREATOR + closed-case rules, no events). Also update §3.3 Case_Team, which currently says only add/read exist, to mention the new update path (and note there is still no delete).
2. **`docs/API_REFERENCE.md`** — add the route to the cases table.
3. **Permissions / role matrix** (`libs/auth/src/permissions.reference.ts` or wherever the canonical matrix lives) — add the action (e.g. `case.team.updateRole`) as ADMIN + DETECTIVE.
4. **Gateway routing list** (if one exists) — list the new proxied route.
5. **Any doc that states "team members can only be added, not modified"** — update it.
6. **New feature documentation** Feature 002.

If you find a doc you're unsure about, mention it in the PR description rather than skipping it.

## Out of scope (do NOT do)

- Do **not** add a "remove team member" / `DELETE` route. Separate ticket.
- Do **not** allow assigning or changing `CREATOR`.
- Do **not** change `POST /cases/:id/team` or `GET /cases/:id/team` contracts.
- Do **not** add team endpoints to other services.
