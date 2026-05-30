# Phase 5 — Manual Testing Guide

Step-by-step verification of the Evidence module + chain-of-custody UX. The backend must be up.

**Estimated time:** ~20 minutes. **Pay special attention to §6** — the custody side-effect guard is the point of this phase.

---

## 0. Prerequisites

- **Node 20+**; **backend running** (`curl http://localhost:3000/health` → ok).
- Seeded users for the three roles; the Keycloak picker working (Phase 2 §0 — `view-users`/`query-users`).
- **At least one case** you can open (Phase 3), and a couple of provisioned users to act as custodians.
- `CORS_ORIGIN=http://localhost:5173`.

---

## 1. Install & checks

```bash
cd /home/josed/AegisCase_FE
npm install
npm run lint && npm run typecheck && npm run test:run && npm run build
npm run dev    # http://localhost:5173
```

Sign in as **DETECTIVE**.

---

## 2. Register evidence (from a case)

Open a case → **Evidence** tab → **Register** (or `/cases/:id/evidence` → **Register evidence**).

- Pick a **Type** (PHYSICAL/DIGITAL/…), write a **Description**.
- Optionally pick an **Initial custodian** (search a provisioned user). Leave empty to default to you.
- **Register evidence**.

**Expect**: toast "Evidence registered"; back on the case evidence list, the new item appears with its type + status (**Registered**) badges. `POST /evidence` body has `caseId`, `evidenceType`, `description` (+ `currentCustodianId` if picked). The caseCode is not asked for.

---

## 3. Evidence list (desktop + mobile)

On `/cases/:id/evidence`:
- Desktop: a table — **Type · Description · Status · Custodian · Registered**. Custodian shows the **name** (resolved), not a UUID.
- Resize to **375 px**: the table becomes **cards** (no horizontal scroll).
- The global **Evidence** sidebar item (`/evidence`) lists evidence across all cases.

---

## 4. Open the detail page — NO side effect yet

Click an evidence row → `/evidence/:id`.

**Expect (critical):**
- A **read-only summary** (type, status, description, current custodian, registered date) — assembled from the list, **no** `GET /evidence/:id` request fires (check DevTools → Network; you should see `…/chain-of-custody` but **not** a bare `GET /evidence/:id`).
- A warning panel: "Opening the full record records you as the current custodian…".
- A **Chain of custody** card showing the timeline (oldest first): the initial "Initial registration" entry.

Reload the page. **Still no** `GET /evidence/:id` — only the chain endpoint. This is the core guarantee.

---

## 5. Chain of custody (read-only)

Click **Chain of custody / Open full view** → `/evidence/:id/chain`.

**Expect**: a vertical timeline, oldest first, each entry showing custodian transition (or "Registered to <name>"), the reason, who did it, and a relative time ("just now", "2 minutes ago"). No request to the side-effecting endpoint — only `GET /evidence/:id/chain-of-custody`.

---

## 6. ⚠️ Take custody via the view dialog (the side effect)

Back on `/evidence/:id`, click **View & take custody**.

**Expect**:
- A dialog with a **ShieldAlert** icon: "Take custody of this evidence? Viewing this evidence will record you as the current custodian…". The confirm button is **amber** (`--warning`).
- **Cancel** → nothing happens, no request.
- **View & take custody** → now (and only now) `GET /evidence/:id` fires. Toast "You are now recorded as the current custodian". The **Current custodian** becomes **you**, and the chain gains a **"Viewed by user"** entry.

This proves the side effect happens **only** on explicit confirmation.

---

## 7. Transfer custody

On the detail page (DETECTIVE/ADMIN), click **Transfer custody**.

- Pick a **New custodian** (search a provisioned user) + optional **Reason** → **Transfer**.

**Expect**: toast "Custody transferred to <name>"; status becomes **Transferred**; the chain gains a transfer entry (old → new custodian, your reason, by you). DevTools shows the evidence detail, chain, and list queries all refetch (invalidation).

---

## 8. Edit evidence

Detail → **Edit** (`/evidence/:id/edit`, DETECTIVE/ADMIN). Change the description/type → **Save changes**.

**Expect**: toast "Evidence updated"; back on detail with new values.

> If you deep-link `/evidence/:id/edit` with a cold cache (e.g. hard refresh there), you get a note telling you to open it from the case list first — the FE won't load the full record (and take custody) just to edit.

---

## 9. Archive (ADMIN, double-confirm)

Sign in as **ADMIN**, open an evidence detail → **Archive**.

**Expect**:
- A confirm dialog requiring you to type **ARCHIVE** before the button enables.
- On confirm: toast "Evidence archived"; status **Archived**, an "Archived" pill; the row renders faded in lists.
- The detail page no longer shows Transfer/Edit/Archive actions.
- As **DETECTIVE**, the **Archive** button never appears.
- Archiving an already-archived item (via curl) → `409`; the FE simply doesn't offer it once archived.

---

## 10. ANALYST is read-only

Sign in as **ANALYST**:
- Can browse `/evidence`, `/cases/:id/evidence`, open detail, view the chain.
- **Can** use **View & take custody** (all roles may read `GET /evidence/:id` — taking custody is intentional per the backend).
- **No** Register / Edit / Transfer / Archive controls.
- `/cases/:id/evidence/new` and `/evidence/:id/edit` by URL → permission toast + redirect.

---

## 11. Done

If §2–§10 pass, Phase 5's success criteria are met:

- ✅ The detail page **never** auto-fetches `/evidence/:id` — only the explicit dialog does.
- ✅ The COC timeline renders chronologically.
- ✅ Transfer invalidates the evidence + COC + list queries.
- ✅ Archive is ADMIN-only with double-confirm; edit is greyed on archived evidence.

Ready to commit and request Phase 6.

### Reset (rare)
```bash
rm -rf node_modules dist .vite && npm install
```
Then DevTools → Application → Storage → "Clear site data".
