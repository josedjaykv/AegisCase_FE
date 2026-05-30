# Backend prompt — Feature 004: case ↔ involved-person link management

This feature lets the frontend: (1) show **who is involved in a case**, (2) **hide already-linked** cases/people from the link pickers, (3) **unlink** a person from a case, and (4) **edit** a person's involvement type on a case.

Not all of that is backend work. This doc splits it explicitly.

---

## Scope split — BE vs FE

| Capability | Needs backend? | Owner |
|---|---|---|
| List people linked to a case (case "Involved" roster) | **Yes** — no reverse-lookup route exists | BE endpoint **#1** |
| In "Link to a case" picker, hide cases the person is already linked to | No | **FE** — already has the person's links via `GET /involved-persons/:id/cases`; filters client-side |
| In "Link person" picker, hide people already linked to the case | Enabled by **#1** | **FE** — filters client-side using the new roster |
| Edit a person's involvement type / observations on a case | **Yes** — no update route on the join | BE endpoint **#2** |
| Unlink a person from a case | **Yes** — no delete route on the join | BE endpoint **#3** |

So the backend team needs to ship **three** endpoints (#1 read, #2 update, #3 delete). The two "hide already-linked" filters are **frontend-only** and are listed here just so the boundary is clear — **the backend team does not implement them**.

Everything the backend must build is in **Part A** (copy that into the backend AI). **Part B** is our FE follow-up, for reference only.

---

# Part A — Backend work (copy everything in this Part to the backend AI)

Three new routes on the **involved-service** join table `case_involved_persons` (composite PK `(case_id, involved_person_id)`), all proxied through the gateway. The existing link route `POST /involved-persons/:id/cases/:caseId` and `GET /involved-persons/:id/cases` are **unchanged**.

> ⚠️ This reverses an earlier design note. `BACKEND_INVESTIGATION_REPORT.md` §17.18 currently says case-involved links "can only be removed via direct DB intervention" and there is "no unlink endpoint." We now **want** unlink + edit. Update that note (see Docs).

## Endpoint #1 — `GET /cases/:id/involved` (roster, read)

```
GET /cases/:id/involved
Authorization: Bearer <token>
Roles: ADMIN, DETECTIVE, ANALYST   (same read access as the rest of involved-persons)

200 OK → array (empty, not 404, when the case has no links):
[
  {
    "caseId": "...",
    "involvedPersonId": "...",
    "involvementType": "VICTIM" | "SUSPECT" | "WITNESS" | "OTHER",
    "observations": "..." | null,
    "person": {
      "id": "...",
      "firstNames": "...",
      "lastNames": "..." | null,
      "document": "..." | null
    }
  }
]
```

- Embed `person` (only `id, firstNames, lastNames, document`) so the FE avoids an N+1 to resolve names. `involved_persons` and `case_involved_persons` are in the same DB (`involved_db`) → one join. If embedding is genuinely hard, returning the bare join rows is an acceptable v1 — **flag it** so the FE resolves names itself.
- No `caseId` existence check (consistent with the rest of involved-service — unknown id → `[]`).
- Read-only, no events.
- **Path:** prefer `GET /cases/:id/involved`. If `/cases/*` at the gateway is reserved for case-service, ship `GET /involved-persons/by-case/:caseId` instead. **Pick one and document the final path** — the FE matches whatever you ship.

## Endpoint #2 — `PATCH /involved-persons/:id/cases/:caseId` (edit the link)

```
PATCH /involved-persons/:id/cases/:caseId
Authorization: Bearer <token>
Roles: ADMIN, DETECTIVE   (same as the existing POST link route)

Body (UpdateCaseLinkDto — at least one field):
  | Field           | Type                 | Required | Validator                |
  |-----------------|----------------------|:--------:|--------------------------|
  | involvementType | enum InvolvementType |    No    | @IsEnum(InvolvementType) |
  | observations    | string               |    No    | @IsString                |

200 OK → the updated join row:
  { "caseId": "...", "involvedPersonId": "...", "involvementType": "SUSPECT", "observations": "..." | null }

Errors:
  - 400 "involvementType must be a valid type"   (bad enum)
  - 400 "At least one field is required"          (empty body)
  - 403                                            (non ADMIN/DETECTIVE)
  - 404 "Person not found"                         (person id missing)
  - 404 "Link not found"                           ((caseId, involvedPersonId) pair missing)
```

- Partial update of the join row; only `involvement_type` / `observations` are writable. The PK is never touched.
- Idempotent: sending the current value returns `200` unchanged (no `409`).
- No `caseId` existence check (consistent with the service).
- Event: none, unless you want a `involved.person.link.updated` for audit parity — BE's call; document it if added.

## Endpoint #3 — `DELETE /involved-persons/:id/cases/:caseId` (unlink)

```
DELETE /involved-persons/:id/cases/:caseId
Authorization: Bearer <token>
Roles: ADMIN, DETECTIVE

200 OK → { "success": true }    (or 204 No Content — pick one, document it)

Errors:
  - 403                          (non ADMIN/DETECTIVE)
  - 404 "Link not found"         ((caseId, involvedPersonId) pair missing)
```

- **Hard delete** of the `case_involved_persons` row. The `involved_persons` and `cases` rows are untouched — only the link is removed. There is no soft-delete column on this join, so a physical delete is correct; **flag in the PR** that this is the first physical delete exposed for this table.
- Deleting a non-existent link → `404` (don't silently 200, so the FE can tell the user).
- Event: optionally publish `involved.person.unlinked` (routing key parity with `involved.person.linked`) carrying `case_id`, `involved_person_id`. BE's call — document if added.

## Implementation guidance

1. **Location.** involved-service, alongside the existing link controller/service. Add `findByCase(caseId)`, `updateLink(personId, caseId, dto)`, `removeLink(personId, caseId)`.
2. **Guards.** Read (#1): `@Roles(ADMIN, DETECTIVE, ANALYST)`. Mutations (#2, #3): `@Roles(ADMIN, DETECTIVE)` — same as the existing POST link route.
3. **Gateway.** Proxy all three with auth passthrough; match role decorators at the edge if enforced there.
4. **DTO.** `UpdateCaseLinkDto` with both fields `@IsOptional`; reject an empty body in the service with `400 "At least one field is required"` so the message is exact.

## Tests

- **#1 GET roster:** rows for a case; `[]` for none; embedded person shape is exactly `{ id, firstNames, lastNames, document }`; 200 for all three roles; 401 without token.
- **#2 PATCH:** changes involvementType; changes observations; partial (one field) works; empty body → 400; bad enum → 400; missing person → 404 "Person not found"; missing link → 404 "Link not found"; 403 for ANALYST.
- **#3 DELETE:** removes the link (subsequent GET roster no longer shows it); missing link → 404; 403 for ANALYST; the person and case rows still exist afterward.
- **Regression:** `POST /involved-persons/:id/cases/:caseId` and `GET /involved-persons/:id/cases` unchanged.

## Manual smoke

```bash
DET=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"detective1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)

# #1 roster
curl -s -H "Authorization: Bearer $DET" "http://localhost:3000/cases/<caseId>/involved" | jq

# #2 edit involvement type
curl -i -X PATCH "http://localhost:3000/involved-persons/<personId>/cases/<caseId>" \
  -H "Authorization: Bearer $DET" -H 'Content-Type: application/json' \
  -d '{"involvementType":"SUSPECT"}'

# #3 unlink
curl -i -X DELETE "http://localhost:3000/involved-persons/<personId>/cases/<caseId>" \
  -H "Authorization: Bearer $DET"

# ANALYST forbidden on mutations
AN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"analyst1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)
curl -i -X DELETE "http://localhost:3000/involved-persons/<personId>/cases/<caseId>" \
  -H "Authorization: Bearer $AN"   # expect 403
```

## Documentation updates (REQUIRED — same PR)

1. `BACKEND_INVESTIGATION_REPORT.md` §5.5 — add the three routes (DTOs, roles, errors, events). Update §3.5 Case_Involved_Person: the reverse lookup is now exposed, and the link is now editable and deletable.
2. `BACKEND_INVESTIGATION_REPORT.md` §17.18 — remove/replace the "no unlink endpoint / DB intervention only" note for involved-person links (the team-member half of that note still stands).
3. `docs/API_REFERENCE.md` — add the three routes to the involved table.
4. Permissions / role matrix — read action (all three roles) + update/delete actions (ADMIN, DETECTIVE).
5. Gateway routing list (if any) — list the three routes and the final roster path.
6. **New feature documentation: Feature 004** (case ↔ involved-person link management).

If you find a doc you're unsure about, mention it in the PR description rather than skipping it.

## Out of scope (do NOT do)

- Do **not** change `POST /involved-persons/:id/cases/:caseId` or `GET /involved-persons/:id/cases`.
- Do **not** add the "hide already-linked" filtering to `GET /cases` or `GET /involved-persons` — that's frontend-side (Part B).
- Do **not** add pagination to the roster unless a case can realistically have >100 involved persons; a bare array is fine for v1.
- Do **not** soft-delete the link (no such column) — a hard delete of the join row is correct.

---

# Part B — Frontend follow-up (NOT backend work — for our reference)

We implement these after the three endpoints above ship. Listed here only so the BE/FE boundary is explicit.

1. **Case "Involved" roster** — render endpoint **#1** in the case-detail Involved tab (replace the current "no endpoint yet" placeholder). Each row: person name + document, involvement badge, observations, edit + unlink actions (ADMIN/DETECTIVE).
2. **Hide already-linked in pickers** (no backend needed):
   - *Link to a case* (person fixed): exclude `caseId`s already in `GET /involved-persons/:id/cases`.
   - *Link person* (case fixed): exclude `involvedPersonId`s already in the **#1** roster.
3. **Edit involvement type** — an inline control on a roster row (and on the person's "Linked cases" list) calling **#2**.
4. **Unlink** — a destructive action with a confirm dialog calling **#3**; invalidate the roster + the person's `cases` query on success.
5. Tracked as **Feature 004** in `docs/features/`, with manual-testing steps appended to `docs/phases/phase-4/manual-testing.md`.

Depends on the final paths the backend ships (especially #1 — `GET /cases/:id/involved` vs `GET /involved-persons/by-case/:caseId`); the FE service layer matches whatever is delivered.
