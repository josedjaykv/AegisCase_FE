# Phase 2 — Manual Testing Guide

Step-by-step verification of Phase 2 from a clean checkout. Phase 2 makes real HTTP calls against the backend, so the backend **must** be up.

**Estimated time:** ~15 minutes.

---

## 0. Prerequisites

- **Node 20+** (`node -v`). Use `nvm use` if you have nvm.
- **The AegisCase backend running** (`docker compose up` from the backend repo):
  ```bash
  curl http://localhost:3000/health      # → {"status":"ok",...}
  curl http://localhost:3000/            # → {"name":"AegisCase Backend",...}
  ```
- **Seeded Keycloak users** with realm roles `ADMIN`, `DETECTIVE`, `ANALYST`. Adapt to your seed; typical:
  - `admin@aegiscase.com / Admin1234!`
  - `detective1@aegiscase.com / ...`
  - `analyst1@aegiscase.com / ...`
- **At least one extra Keycloak user already provisioned** that does **not** yet have a `user-service` profile (otherwise the "create user" step will conflict). You can copy the Keycloak `sub` UUID from the Keycloak admin UI.
- **CORS allow-origin** on the backend: `CORS_ORIGIN=http://localhost:5173`.
- **Keycloak service-account permissions for the picker** (`GET /auth/keycloak-users`). The backend client `aegiscase-backend` (or whatever your seed uses) needs the realm-management roles **`view-users`** and **`query-users`** so its service-account can list Keycloak users. Without this the picker endpoint returns `503 Authentication service unavailable`. To set it:
  1. Keycloak admin console → **Clients** → `aegiscase-backend` → **Service account roles**.
  2. **Assign role** → filter "Filter by clients" → `realm-management` → assign `view-users` and `query-users`.
  3. Restart `auth-service` (so its admin token cache clears) or just wait for the cached token to expire.

  Full reasoning for this config (and why it's infra, not code) is in [`keycloak-user-search.md`](./keycloak-user-search.md) §4.

---

## 1. From-zero install

```bash
cd /home/josed/AegisCase_FE
nvm use                        # if applicable
npm install                    # picks up @tanstack/react-table and @radix-ui/react-select
cp .env.example .env.local     # only if you don't already have one
```

Confirm `.env.local` contains:

```
VITE_API_BASE_URL=http://localhost:3000
```

---

## 2. Run the four local CI checks

All four must pass before exercising the UI.

```bash
npm run lint        # → 0 errors, 0 warnings
npm run typecheck   # → no output (success)
npm run test:run    # → 8 passed (same suite as Phase 1)
npm run build       # → ~192 KB gzipped initial bundle
```

If any step fails, stop and fix before continuing.

---

## 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:5173` and sign in as `ADMIN`. **Expect** the dashboard to load with the `ADMIN` badge.

---

## 4. Sidebar shows "Users" for ADMIN only

- Sidebar (desktop ≥ `lg`) — the **Users** item is visible.
- Sign out, sign in as **DETECTIVE**: the **Users** item is **gone**.
- Sign out, sign in as **ANALYST**: same — no **Users** item.

This already passed Phase 1; we're re-verifying the gate held when we wired the new routes.

---

## 5. Non-ADMIN cannot reach `/users` even by URL

While signed in as **DETECTIVE** (or **ANALYST**), paste these into the address bar one at a time:

- `http://localhost:5173/users`
- `http://localhost:5173/users/new`
- `http://localhost:5173/users/some-random-id`

**Expect**: a red toast "You don't have permission to view this page" and a redirect back to `/`.

Sign back in as **ADMIN** before continuing.

---

## 6. Users list page

Navigate to **Users** in the sidebar (or `http://localhost:5173/users`).

**Expect**:
- Page title "Users" with a "New user" primary button on the right.
- A `DataTable` with columns: **Name**, **Document**, **Role**, **Created**.
- Each row shows the user's full name (and jobTitle below in muted text if present), the document in mono font, a colored role badge (`ADMIN` blue, `DETECTIVE` info, `ANALYST` neutral), and the formatted creation date.
- A pagination bar at the bottom: "Showing 1–N of T · Page 1 of M" with **Previous**/**Next** buttons.
- If the database currently has 0 users (very unusual — at minimum the seed admin should exist), an empty state with a "New user" call-to-action appears.

If pagination is showing more than one page, click **Next**:
- The URL updates to `?page=2`.
- The rows update without flashing (TanStack Query `keepPreviousData`).
- Browser back/forward correctly walks pages.

Refresh the page on `?page=2` — you land back on page 2, not 1.

---

## 7. Row click navigates to detail

Click any row. **Expect** to land on `/users/<that-id>` with a pre-populated edit form.

---

## 8. Create a user — happy path

Click **New user** (from `/users`). **Expect** to land on `/users/new` with an empty `Card`-centered form.

Fill in:
- **Keycloak user ID** — the `sub` UUID of a Keycloak user that does NOT already have a profile.
- **First names** — e.g. `Olivia`
- **Last names** — e.g. `Test`
- **Document** — a new, unused document number, e.g. `9988776655`
- **Birth date** — any past date (or leave blank).
- **Role** — pick from the dropdown (try `DETECTIVE`).
- **Job title** — optional, e.g. `Field Detective`.

Click **Create user**.

**Expect**:
- Toast "User created".
- Navigation to `/users/<new-id>` showing the same data in edit mode (Keycloak ID input is **disabled**).

Navigate back to `/users` — the new row appears in the list (the list is invalidated and re-fetched on success).

---

## 9. Create a user — Zod validation (no backend hit)

Go back to `/users/new`. Click **Create user** with the form empty.

**Expect inline errors** under each required field, e.g.:
- "Keycloak user ID is required"
- "First names are required"
- "Last names are required"
- "Document is required"

Fill **Birth date** with `not-a-date` (force it via DevTools if the date picker prevents you) — expect "Use YYYY-MM-DD".

---

## 10. Create a user — 409 conflict on `document`

On `/users/new`, fill the form with valid values **but reuse the document of the user you created in step 8** (`9988776655`). Use a **different** Keycloak ID.

Click **Create user**.

**Expect**:
- **No toast.**
- An inline error message appears **directly under the Document field** saying "Document already registered" (or whatever the backend message is).
- The form stays put so you can correct the value.

---

## 11. Create a user — 409 conflict on `keycloakUserId`

On `/users/new`, reuse the Keycloak ID of an existing user but a fresh document.

**Expect**:
- **No toast.**
- An inline error appears under the **Keycloak user ID** field saying "Keycloak user ID already registered".

---

## 12. Edit a user

Go to `/users`, click the user you created in step 8.

- The Keycloak ID input is **disabled** (visually muted, cannot be focused).
- Change the **job title** to `Senior Detective`.
- Change the **role** to `ANALYST`.
- Click **Save changes**.

**Expect**:
- Toast "User updated".
- The form stays on the same page with the new values reflected.
- Navigate to `/users` — the row shows the new role badge (now neutral) and the new job title.

---

## 13. Edit — 400 validation maps to fields

In the edit page, clear **First names** and **Last names**, then click **Save changes**.

**Expect** inline errors under each cleared field. (Zod catches it before hitting the network; that's intentional. To test the *server-side* 400 mapping, temporarily disable HTML5 / Zod validation in DevTools — not normally required.)

---

## 14. Edit — 404 path

Manually navigate to `http://localhost:5173/users/00000000-0000-0000-0000-000000000000`.

**Expect** a red alert "User not found." in place of the form.

---

## 15. Responsive checks

In DevTools responsive mode, switch to **375 × 812** (mobile):

- The list page header stacks ("Users" on top, "New user" button below).
- The `DataTable` becomes horizontally scrollable while keeping all columns readable.
- The `PaginationBar` stacks the count text above the page controls.
- The form page uses the full width with the sticky footer actions reachable.

Switch to **768 × 1024** (tablet):
- Sidebar collapses to icon-only or is reachable via the menu drawer (same as Phase 1).
- Form input pairs sit side-by-side.

Switch to **1440 × 900** (desktop):
- Full desktop layout, centered `max-w-2xl` form card.

In every viewport, every action remains reachable by tap — no hover-only affordances.

---

## 16. Keycloak field-ownership policy (addendum)

This block verifies the policy added on top of the original Phase 2 scope (see `docs/architecture/architecture.md` §4.7).

### 16.1 Create form — info note

Navigate to `/users/new`. **Expect** a blue-tinted info note at the top of the card with a lock icon, saying that Keycloak user ID / first names / last names / role must match what is in Keycloak and **won't be editable after creation**.

### 16.2 Edit form — Keycloak fields are locked

Open any existing user (`/users/<id>`). **Expect**:

- The same info note, this time saying the four identity fields are managed in Keycloak.
- **Disabled** (greyed out, not focusable, no caret) inputs for: **Keycloak user ID**, **First names**, **Last names**.
- **Disabled** dropdown for **Role** — clicking it doesn't open the menu.
- **Editable** inputs only for **Document**, **Birth date**, **Job title**.

Try to focus a disabled field with Tab — focus skips over it.

### 16.3 Edit submits only the operational fields

With DevTools → Network open, change the **Job title** of the user and click **Save changes**.

**Expect**:
- `PUT /users/<id>` request.
- The request body contains **only** `document`, `jobTitle` (and `birthDate` if set). **No** `firstNames`, `lastNames`, `role`, `keycloakUserId`.

This is the FE-side enforcement of the field-ownership policy.

### 16.4 Self-sync banner — happy path

Pre-condition: you are logged in as the **ADMIN** seed user, and there is a `user-service` profile whose `keycloakUserId` is the same as your token's `sub`. If you don't have one yet, create it with your real Keycloak admin sub (you can read your `sub` from DevTools → Application → memory of the Zustand auth store, or from the JWT at jwt.io).

1. Navigate to `/users` and click on your own profile (it'll be the row whose name matches what Keycloak has for you).
2. **Expect no banner** — your local role and Keycloak role match.

Now simulate drift:

1. Open DevTools → Network and intercept, OR temporarily change your role in the DB (if you have shell access), OR — easiest — edit a *different* user's profile, change its role in Keycloak admin console (not from this UI), and re-log in as that user.
2. Open your own `/users/:id` again.
3. **Expect** a warning-tinted banner above the form: "Out of sync with Keycloak — Your role here is `<X>` but Keycloak reports `<Y>`."
4. Click **Sync from Keycloak**. **Expect**:
   - A green toast "Role synced from Keycloak (`<Y>`)".
   - The banner disappears (the list query is invalidated and re-fetches).
   - The form now shows the Keycloak role.
   - In DevTools → Network, the `PUT /users/:id` request body contains **only** `{ role: '<Y>' }` — nothing else.

### 16.5 Self-sync banner does NOT show for other users

While logged in as ADMIN, open another user's detail page (one whose `keycloakUserId !== your sub`).

**Expect**: no banner ever, even if their local role differs from anything. The banner is scoped to *self* only (because `/auth/me` is the only Keycloak truth the FE has, and it is scoped to the caller).

This is the documented limitation in `docs/architecture/architecture.md` §4.7.

### 16.6 Non-ADMIN cannot see this at all

Sign in as **DETECTIVE** or **ANALYST** and confirm you still cannot reach `/users/...` (Phase 2 step 5). The field-ownership policy lives entirely inside the ADMIN-gated routes.

---

## 17. Keycloak picker on create (live backend)

This block tests the `<KeycloakUserPicker>` flow on `/users/new`. The endpoint is `GET /auth/keycloak-users?search=&page=&limit=` (contract in [`docs/architecture/api-integration.md` §7](../../architecture/api-integration.md); backend response shape matches verbatim).

### 17.1 Endpoint is reachable (sanity)

While logged in as **ADMIN**, run from a terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@aegiscase.com","password":"Admin1234!"}' | jq -r .access_token)

curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3000/auth/keycloak-users?search=ad&page=1&limit=5' | jq
```

**Expect** a JSON body with `data` (array), `total`, `page`, `limit`. If you get `503 Authentication service unavailable`, go back to Prerequisite "Keycloak service-account permissions for the picker" and grant `view-users` + `query-users` to the service account.

In the FE, open `/users/new` and confirm the picker is empty/idle until you type.

### 17.2 Search finds matches

With the endpoint live, type a few characters of an existing Keycloak user's first name, last name or email.

**Expect**:
- A `GET /auth/keycloak-users?search=<q>&page=1&limit=10` request (DevTools → Network).
- Up to 10 results below the input. Each row shows: full name, email, role badge (or "no role" if Keycloak has none).
- Typing more characters narrows results without flicker (TanStack Query `keepPreviousData`).

### 17.3 Empty results explain the next step

Type something that matches nothing (e.g. `zzzzz`).

**Expect** a neutral message:
> No Keycloak user matches that search. Create the user in Keycloak first, then come back.

### 17.4 Provisioned users are non-selectable and link to their profile

Find a Keycloak user that you already provisioned in earlier steps.

**Expect** the row to be **disabled** (faded, not clickable as "Select") and to show an **Open profile** link on the right that navigates to `/users/<id>`. Clicking the row itself does nothing.

### 17.5 Unprovisioned selection locks identity

Pick an unprovisioned match.

**Expect**:
- The search input disappears.
- A summary card replaces it with the user's full name, email, sub (mono font), and role badge, plus an **×** button to clear.
- The form's **Document** / **Birth date** / **Job title** inputs become enabled (they were disabled before a selection).

Click **×** — the picker comes back, the operational inputs disable again.

### 17.6 Create with picker — happy path

Pick an unprovisioned user, fill **Document** (unique), optionally birth date and job title, and click **Create user**.

**Expect**:
- DevTools → Network: `POST /users` with body that contains `keycloakUserId`, `firstNames`, `lastNames`, `role` taken **exactly** from the picker's selected user, plus `document`/`birthDate`/`jobTitle` from the form.
- Toast "User created".
- Navigation to `/users/<new-id>`.
- The new user appears in the list with the right name and role.

### 17.7 Keycloak user with no app role

If you have a Keycloak user without a realm role (`null` role in the picker), select them.

**Expect**:
- The summary card shows a "No app role in Keycloak" pill instead of a role badge.
- A warning text below the picker tells you to assign a role in Keycloak first.
- The **Create user** button stays disabled until you go to Keycloak, assign one of `ADMIN`/`DETECTIVE`/`ANALYST` to that user, and re-pick them.

### 17.8 Document conflict still surfaces inline

Pick an unprovisioned user, reuse the document of an existing profile, click **Create user**.

**Expect** the inline error under **Document** ("Document already registered") with no toast — same behavior as section 10.

### 17.9 503 surfaces a clean message (optional)

To verify the error path, temporarily remove the `view-users`/`query-users` roles from the `aegiscase-backend` service account in Keycloak and restart `auth-service` (or wait for the admin-token cache to expire). Then type 2+ chars in the picker.

**Expect** a red alert under the search input with the backend's own message — e.g. *"Authentication service unavailable"* — surfaced from `body.message.message` via the FE's normalized error handler. A global red toast ("A required service is unavailable. Try again shortly.") also appears (axios 503 handler).

Re-grant the roles and continue.

### 17.10 Edit page no longer shows identity inputs

Open any existing user's `/users/:id`.

**Expect**:
- The Keycloak fields appear inside a **read-only summary card** (no inputs at all), showing first names, last names, role badge, Keycloak user ID.
- Only **Document**, **Birth date** and **Job title** are real inputs.
- Saving still only sends operational fields (verify in DevTools → Network).

---

## 18. Done

If steps 4–17 pass (including 17.1–17.10 against the live Keycloak picker endpoint), Phase 2's success criteria (plus the field-ownership and Keycloak-picker addenda) are met:

- ✅ Pagination works and is URL-driven.
- ✅ NestJS validation errors (array format) map to RHF fields.
- ✅ `409` conflicts on `document` and `keycloakUserId` render inline under the field.
- ✅ ADMIN-only routes; non-ADMIN sees the 403-safe redirect.
- ✅ `DataTable`, `PaginationBar`, `EmptyState` and the `Card`-centered form archetype are reusable for Phase 3+.

You're ready to commit and request Phase 3.

### Reset back to a clean state (rare)

```bash
rm -rf node_modules dist .vite
npm install
```

Clear any session-restore state with DevTools → Application → Storage → "Clear site data".
