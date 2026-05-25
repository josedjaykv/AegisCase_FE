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

## 16. Done

If steps 4–15 pass, Phase 2's success criteria are met:

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
