# Phase 3 — Manual Testing Guide

Step-by-step verification of the Cases module from a clean checkout. Phase 3 makes real HTTP calls, so the backend **must** be up.

**Estimated time:** ~20 minutes.

---

## 0. Prerequisites

- **Node 20+** (`node -v`).
- **The AegisCase backend running** (`docker compose up`):
  ```bash
  curl http://localhost:3000/health      # → {"status":"ok",...}
  ```
- **Seeded Keycloak users** for the three roles:
  - `admin@aegiscase.com / Admin1234!`
  - `detective1@aegiscase.com / ...`
  - `analyst1@aegiscase.com / ...`
- **At least 2–3 user-service profiles already provisioned** (do Phase 2's create flow if needed). The case **leader** and **team member** pickers only let you select users who already have a local profile, so you need a few to pick from.
- **Keycloak picker working** — the case leader / team pickers reuse `GET /auth/keycloak-users`, so the service account needs `view-users` + `query-users` (see Phase 2 manual-testing §0). If search shows "endpoint not available" or 503, fix that first.
- **CORS** `CORS_ORIGIN=http://localhost:5173` on the backend.

---

## 1. From-zero install

```bash
cd /home/josed/AegisCase_FE
npm install                    # picks up @radix-ui/react-tabs
cp .env.example .env.local     # if you don't have one
```

Confirm `.env.local` has `VITE_API_BASE_URL=http://localhost:3000`.

---

## 2. Run the four local CI checks

```bash
npm run lint        # → 0 errors, 0 warnings
npm run typecheck   # → no output
npm run test:run    # → 8 passed
npm run build       # → success
```

Fix anything red before continuing.

---

## 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:5173`, sign in as **DETECTIVE**. Click **Cases** in the sidebar (all roles see it).

---

## 4. Cases list

**Expect**:
- Title "Cases" + a **New case** button (DETECTIVE and ADMIN see it; ANALYST does not — verify by signing in as ANALYST later).
- A `DataTable` with columns **Code** (mono), **Title**, **Priority** badge, **Status** badge, **Created**.
- A `PaginationBar` when there is more than one page; `?page=2` is reflected in the URL and survives refresh.
- If empty, an empty state ("No cases yet").

---

## 5. Create a case (DETECTIVE)

Click **New case** (`/cases/new`).

- Fill **Title** (e.g. `Robbery at Central Bank`).
- Optionally a **Description**.
- Pick a **Priority** (try `HIGH`).
- Under **Case leader**, type 2+ chars of a provisioned user's name/email and pick them.
  - Users **without** a local profile show "No profile yet" and are not selectable.
  - The selected user appears in a summary card; **×** clears it.
- Click **Create case**.

**Expect**:
- Toast "Case created".
- Redirect to `/cases/<id>` (the detail page).
- DevTools → Network: `POST /cases` body has `title`, `priority`, `leaderUserId` (the picked user's **sub**), and `description` if entered. **No** `caseCode` field is sent.

Notice there was **no caseCode input** in the form — it's generated server-side.

---

## 6. Case detail — header & tabs

On `/cases/<id>`:

- **Header** shows: `caseCode` (mono), a **status** badge, a **priority** badge, the title, and a metadata grid (Leader sub, Created-by sub, Created, Updated).
- **Tabs:** Overview · Evidence · Tasks · Involved · Audit · Media.
  - **Overview** shows the Description card and a **Team** card.
  - The other five render a placeholder ("Evidence lands in Phase 5", etc.) — that's expected; they fill in later phases.
- The **Team** card lists the creator (auto-added as `CREATOR`) and, if you picked a leader other than yourself, a `LEAD` row. Members are shown by their **user id (sub)** in mono — see "Known limitations" (no name resolution).

> **Polling:** the detail query refetches every 60 s while the tab is focused. Switch to another browser tab and back — no error, just a background refresh.

---

## 7. Status transitions (DETECTIVE drives the lifecycle)

In the header, use the **status dropdown**:

1. `OPEN` → `UNDER_INVESTIGATION`. **Expect** toast "Status changed to Under investigation"; the status badge updates (it turns into the primary/solid tone).
2. `UNDER_INVESTIGATION` → `PAUSED` → back to `UNDER_INVESTIGATION` — all allowed.
3. `UNDER_INVESTIGATION` → `CLOSED`. **Expect** toast; badge turns green (success).

**Now the closed-case guard (still DETECTIVE):**
- The status dropdown is **disabled** and a hint reads "Only an admin can reopen a closed case."
- The **Edit** button is **gone** (a closed case can't be modified).

---

## 8. Reopen a closed case (ADMIN only)

Sign out, sign in as **ADMIN**, open the same closed case.

- The status dropdown is **enabled**. Move it `CLOSED` → `UNDER_INVESTIGATION`. **Expect** toast and the case reopens.

**Bypass check (proves the backend 403 is the safety net):**
- Reopen logic is client-gated, but to confirm the server enforces it, you can (as DETECTIVE) fire the request directly:
  ```bash
  TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
    -d '{"email":"detective1@aegiscase.com","password":"<pw>"}' | jq -r .access_token)
  # First set the case to CLOSED via an admin, then as detective:
  curl -i -X PATCH http://localhost:3000/cases/<id>/status \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"status":"UNDER_INVESTIGATION"}'
  ```
  **Expect** `403 Forbidden` ("Only admins can reopen a closed case"). In the UI this path is blocked before it's ever sent; if it somehow fired, the interceptor shows the permission toast.

---

## 9. Edit a case

As DETECTIVE or ADMIN, open a **non-closed** case → **Edit** (`/cases/:id/edit`).

- Change the **Title** and **Priority**, click **Save changes**. **Expect** toast "Case updated" and redirect back to the detail page with new values.
- Optionally reassign the **leader**: the current leader shows as a UUID; search & pick a new user to replace it, or leave it untouched.

**Closed-case edit:** open a CLOSED case and manually visit `/cases/<id>/edit`. **Expect** a warning banner "A closed case cannot be modified" instead of the form.

---

## 10. Archive a case (ADMIN, double-confirm)

As **ADMIN**, open any non-archived case. Click **Archive**.

**Expect**:
- A confirm dialog: "Archive this case? … cannot be un-archived."
- A **type-to-confirm** field — the **Archive case** button stays disabled until you type the exact `caseCode`.
- On confirm: toast "Case archived"; the header shows an **Archived** pill; Edit/status affordances disappear.
- Back on `/cases`, the archived row renders at reduced opacity with the Archived pill.

**Non-ADMIN:** as DETECTIVE, the **Archive** button is not rendered at all.

**Already-archived:** archiving the same case again (e.g. via curl) returns `409 Conflict` — the FE simply doesn't offer the button once archived.

---

## 11. Team management

From a case detail → Overview → Team card → **Manage** (or visit `/cases/:id/team`).

- The page lists current team members with `CREATOR` / `LEAD` / `MEMBER` badges.
- As DETECTIVE/ADMIN, click **Add member**:
  - Search & pick a provisioned user.
  - Choose a **Team role** (`LEAD` or `MEMBER` — `CREATOR` is auto-assigned and not offered).
  - **Add member** → toast, the dialog closes, and the new member appears in the list.
- **Duplicate guard:** add the same user again. **Expect** an inline error in the dialog ("User is already a team member") — no toast, the dialog stays open.
- As **ANALYST**, the **Add member** button is not shown (read-only team view).

---

## 12. ANALYST is read-only

Sign in as **ANALYST**:
- Sidebar shows **Cases**; list and detail are viewable.
- **No** "New case" button, **no** Edit, **no** status dropdown, **no** Archive, **no** Add member.
- Visiting `/cases/new` or `/cases/<id>/edit` by URL → permission toast + redirect to `/` (route-level gate).

---

## 13. Responsive checks

In DevTools responsive mode:

- **375 × 812 (mobile):** list header stacks; `DataTable` scrolls horizontally; detail header metadata stacks; the tab bar scrolls horizontally; dialogs are usable full-width.
- **768 × 1024 (tablet):** two-column overview; sidebar per Phase 1 behavior.
- **1440 × 900 (desktop):** full layout, three-column overview grid.

Every action is reachable by tap — no hover-only affordances.

---

## 14. Team / leader display names (requires backend `/users/directory`)

The team list and the case-detail header used to show Keycloak `sub` UUIDs; they now resolve to human names via `GET /users/directory` (all roles).

### 14.1 Names appear for every role

For each of ADMIN / DETECTIVE / ANALYST in turn, open a case detail (`/cases/<id>`).

**Expect**:
- The **Leader** and **Created by** cells in the header show "First Last" (not a mono UUID).
- The **Team** card (Overview tab) shows each member's name in the primary line.
- DevTools → Network: one `GET /users/directory?ids=<sub>,<sub>,...` request per page load. Same shape for all three roles — open it on three browsers / incognito windows to compare. The response contains **only** `keycloakUserId / firstNames / lastNames / role` (no `document`, no `birthDate`).

### 14.2 Unresolved subs fall back to the UUID

Create a Keycloak user (Keycloak admin console) but **don't** provision a profile in `/users/new`. Then have an ADMIN add a case team member that uses that sub directly via curl (since the picker only allows provisioned users):

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@aegiscase.com","password":"Admin1234!"}' | jq -r .access_token)
curl -X POST http://localhost:3000/cases/<caseId>/team \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"userId":"<unprovisioned-sub>","teamRole":"MEMBER"}'
```

Open the case detail.

**Expect**: that row shows the **mono UUID** (the sub) instead of a name — the directory endpoint silently omits unknown subs, and the FE falls back gracefully. The other team rows that do have profiles still show their names.

### 14.3 Cache is shared between header and team

With DevTools → Network filter on `users/directory`, navigate from `/cases/<id>` to `/cases/<id>/team`. **Expect** at most one new `directory` request (or zero, if the team page's subs are a subset of the detail page's). The hook dedupes + sorts the sub list so consumers share the cache entry.

---

## 15. Done

If steps 4–14 pass, Phase 3's success criteria from `plan.md` are met (plus the names-via-directory addendum):

- ✅ Detective drives a case OPEN → UNDER_INVESTIGATION → CLOSED.
- ✅ Admin can reopen; non-admin is blocked client-side and the backend 403s if bypassed.
- ✅ ADMIN-only archive with double-confirm; team management with duplicate guard.

You're ready to commit and request Phase 4.

### Reset (rare)

```bash
rm -rf node_modules dist .vite && npm install
```
Then DevTools → Application → Storage → "Clear site data".
