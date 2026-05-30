# Backend prompt — `GET /evidence/:id` returns 500 after committing its side effect

Copy everything **below the line** into your backend AI's prompt. It is self-contained.

---

## Bug

`GET /evidence/:id` (the "view = take custody" endpoint) returns **`500 Internal server error`**, but its side effect **partially persists**: the `"Viewed by user"` chain-of-custody row IS inserted (it shows up on `GET /evidence/:id/chain-of-custody` after a reload), yet the HTTP response is a 500 and the caller never receives the evidence entity.

```
GET /evidence/2b0592d8-129c-4045-a541-0db5ac87577d
Authorization: Bearer <admin token>
→ 500 { "statusCode": 500, "message": "Internal server error" }
```

## Evidence of partial / non-atomic write (important clue)

After viewing the same evidence three times, its chain-of-custody contains three `"Viewed by user"` rows, **all with the same `previousCustodianId`**:

```json
{ "previousCustodianId": "1ab23399-…", "newCustodianId": "a000…-0001", "transferReason": "Viewed by user" }
{ "previousCustodianId": "1ab23399-…", "newCustodianId": "a000…-0001", "transferReason": "Viewed by user" }
{ "previousCustodianId": "1ab23399-…", "newCustodianId": "a000…-0001", "transferReason": "Viewed by user" }
```

If the side effect were correct, after the **first** view the evidence's `currentCustodianId` would become `a000…-0001` (the viewer), so the **second** view's `previousCustodianId` should be `a000…-0001` — not `1ab23399`. The fact that every "Viewed by user" row still reads `previousCustodianId = 1ab23399` proves the **`UPDATE evidence.current_custodian_id` is NOT being persisted**, while the **`INSERT` into `chain_of_custody` IS** committing. The operation is non-atomic, and an exception is thrown somewhere between (or after) those two writes — producing the 500 while leaving a partial write behind.

## What to do

### 1. Find the actual exception

The 500 is swallowed into a generic message. Look at the **evidence-service logs** for the stack trace of `GET /evidence/:id` (the `findOne(id, actor, trackView = true)` path). Likely culprits, in order of probability:

- An exception **after** the COC insert — e.g. while re-loading the entity with its `custodyChain` relation, while mapping/serializing the response, or while **publishing an event** (`evidence.viewed`/similar) whose broker call throws.
- A serialization issue (circular reference between `Evidence` ↔ `ChainOfCustody`) when returning the entity with the relation populated.
- A null/constraint issue when computing `previousCustodianId` / writing `current_custodian_id`.

Fix the root exception so the endpoint returns `200` with the evidence entity (including `custodyChain`).

### 2. Make the side effect ATOMIC (the real fix)

Whatever the immediate exception is, the deeper bug is that the **COC insert and the `currentCustodianId` update are not in one transaction**. Wrap the entire "view" side effect in a single DB transaction:

```
BEGIN
  read evidence (current custodian = X)
  insert chain_of_custody { previousCustodianId: X, newCustodianId: actor.sub, transferReason: "Viewed by user", transferredByUserId: actor.sub }
  update evidence set current_custodian_id = actor.sub
COMMIT
```

If anything in that block throws (including event publishing — see below), the **whole thing must roll back** so we never leave a "Viewed by user" row without the matching custodian update. For chain-of-custody on legal evidence, a partial write is worse than a clean failure.

### 3. Don't let event publishing corrupt the transaction

If a domain event is published as part of the view, publish it **after** the DB commit (outbox pattern or post-commit hook), not inside the transaction — a broker hiccup must not 500 the request nor leave a partial write. If you can't do outbox now, at minimum wrap the publish in a try/catch that logs and does not fail the request.

### 4. (Recommended) Make repeated views idempotent-ish

Right now every view appends another `"Viewed by user"` row, even when the viewer is **already** the current custodian. Consider: if `currentCustodianId === actor.sub` already, skip inserting a new "Viewed by user" row (or skip the custodian update) so the chain isn't spammed by refreshes. This is a product decision — flag it in the PR — but it prevents the chain from filling with duplicate self-views.

## Tests to add

- `GET /evidence/:id` returns `200` with the entity **and** `custodyChain` populated (regression for the 500).
- After one view by user A, `evidence.current_custodian_id === A`; a second view by user A produces a row whose `previousCustodianId === A` (proves the update persisted) — or no new row if you adopt the idempotent behavior in #4.
- Atomicity: simulate a failure in the post-insert step (e.g. mock the event publish or entity reload to throw) and assert **no** `chain_of_custody` row was committed and `current_custodian_id` is unchanged.
- `GET /evidence/:id/chain-of-custody` remains side-effect-free and unchanged.

## Manual smoke

```bash
ADMIN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@aegiscase.com","password":"Admin1234!"}' | jq -r .access_token)

# Should now be 200 with the entity + custodyChain, not 500
curl -i -H "Authorization: Bearer $ADMIN" http://localhost:3000/evidence/<id>

# View twice; second row's previousCustodianId must equal the admin sub (a000…-0001)
curl -s -H "Authorization: Bearer $ADMIN" http://localhost:3000/evidence/<id> >/dev/null
curl -s -H "Authorization: Bearer $ADMIN" "http://localhost:3000/evidence/<id>/chain-of-custody" | jq '.[-1]'
```

## Documentation updates (same PR)

- Note the fix in `BACKEND_INVESTIGATION_REPORT.md` §3.6 / §5.6 if the view semantics change (e.g. idempotent self-view).
- If you adopt #4 (skip duplicate self-views), document the new behavior so the frontend can rely on it.
- Document this fix as fix 001 in /docs/fixes, do it as we do it with the feature explaining the erro and the solution

## Out of scope

- Do **not** change `GET /evidence/:id/chain-of-custody` (it works and is side-effect-free).
- Do **not** change the frontend contract — it expects `200` + the `Evidence` entity (with `custodyChain`) from `GET /evidence/:id`. Just make the endpoint actually return it.
