# Phase 4 — Manual Testing Guide

Step-by-step verification of the Involved persons module from a clean checkout. The backend must be up.

**Estimated time:** ~15 minutes.

---

## 0. Prerequisites

- **Node 20+** (`node -v`).
- **Backend running** (`docker compose up`): `curl http://localhost:3000/health` → ok.
- **Seeded users** for the three roles (`admin@…`, `detective1@…`, `analyst1@…`).
- **At least one case created** (Phase 3) so you can test linking a person to a case.
- **CORS** `CORS_ORIGIN=http://localhost:5173`.

---

## 1. From-zero install & checks

```bash
cd /home/josed/AegisCase_FE
npm install
cp .env.example .env.local     # if missing; VITE_API_BASE_URL=http://localhost:3000

npm run lint        # 0 errors
npm run typecheck   # no output
npm run test:run    # 8 passed
npm run build       # success
```

```bash
npm run dev   # http://localhost:5173
```

Sign in as **DETECTIVE**. Click **Involved** in the sidebar (all roles see it).

---

## 2. Involved list

**Expect**:
- Title "Involved persons" + a **Register person** button (ADMIN/DETECTIVE only; ANALYST won't see it).
- A `DataTable` (desktop/tablet) with **Name · Document · Registered**; `?page=N` URL-driven pagination.
- Empty state ("No people yet") if the registry is empty.

---

## 3. Register a person (DETECTIVE)

Click **Register person** (`/involved/new`).

- **First names** is required; **Last names**, **Document**, **Observations** are optional.
- Submit with everything empty → inline error "First names are required".
- Fill First names (e.g. `Jane`), Last names (`Roe`), a unique Document (e.g. `55512345`), and click **Register person**.

**Expect**: toast "Person registered", redirect to `/involved/<id>`. `POST /involved-persons` carries only the filled fields.

---

## 4. Duplicate document → 409 inline

Register another person reusing the same Document (`55512345`).

**Expect**: **no toast**; an inline error under **Document** ("Document already registered"). The form stays put.

(Leaving Document blank is always allowed — it's a sparse unique field.)

---

## 5. Person detail & edit

Open a person (`/involved/<id>`):

- A summary card: name, document (mono), observations, registered/updated timestamps.
- **Edit** button (ADMIN/DETECTIVE) → `/involved/:id/edit`. Change Observations, **Save changes** → toast "Person updated", back to detail with the new value.
- A **Linked cases** card (empty initially) with a **Link to a case** button (ADMIN/DETECTIVE).

---

## 6. Link a person to a case — from the person page

On the person detail, click **Link to a case**.

- A dialog opens with a **Case** picker. Type part of a case title or code → matching cases appear (client-side filter; status badge shown).
- Pick a case → it shows as selected ("Change" to reset).
- Choose an **Involvement type** (VICTIM / SUSPECT / WITNESS / OTHER).
- Optionally add **Observations**. Click **Link**.

**Expect**: toast "Linked to case", dialog closes, the case appears in **Linked cases** with the involvement badge (VICTIM info, SUSPECT red, WITNESS amber, OTHER grey) and an **Open case** link.

**Duplicate guard:** link the same person to the same case again. **Expect** an inline error in the dialog ("Person is already linked to this case") — no toast, dialog stays open.

**caseId validity:** because the case is picked from the `GET /cases`-bound list, you can never submit a non-existent case id — the required client-side pre-check is satisfied by construction.

---

## 7. Link from the case page (Involved tab)

Open a case (`/cases/<id>`) → **Involved** tab.

- As ADMIN/DETECTIVE: a **Link person** button. Click it → dialog with a **Person** picker (search by name/document), involvement type, observations → **Link**.
- **Expect** toast "Linked to case"; the person now appears in the case **roster** (see §11).
- On an **archived** case, the **Link person** button is hidden and the roster is read-only.
- As **ANALYST**, no link button anywhere.

---

## 8. ANALYST is read-only

Sign in as **ANALYST**:
- Can open `/involved` and any `/involved/:id` (read).
- **No** Register button, **no** Edit, **no** Link buttons.
- Visiting `/involved/new` or `/involved/:id/edit` by URL → permission toast + redirect to `/`.

---

## 9. Responsive checks

DevTools responsive mode:
- **375 × 812:** the involved list becomes stacked **cards** (no horizontal scroll); the link dialog is usable full-width; detail cards stack.
- **768 × 1024 / 1440 × 900:** DataTable returns; two-column detail metadata.

Every action reachable by tap; no hover-only affordances.

---

## 10. Feature 004 — link management (requires the 3 new backend routes)

Backend routes used: `GET /involved-persons/by-case/:caseId`, `PATCH /involved-persons/:id/cases/:caseId`, `DELETE /involved-persons/:id/cases/:caseId`.

### 11. Case roster shows linked persons

Open a case with at least one linked person → **Involved** tab.

**Expect**: a list of linked persons — each row shows the person's **name** (links to their page) + document, observations, and the involvement type. DevTools → Network shows one `GET /involved-persons/by-case/<caseId>`. All three roles see the roster (ANALYST sees static badges, no controls).

### 12. Edit involvement type

On the case roster (ADMIN/DETECTIVE), a row has an **involvement-type dropdown**. Change WITNESS → SUSPECT.

**Expect**: toast "Involvement set to SUSPECT"; the badge/value updates. `PATCH /involved-persons/<personId>/cases/<caseId>` with `{"involvementType":"SUSPECT"}`. Selecting the same value again does nothing (idempotent short-circuit).

The same dropdown is available on the **person page → Linked cases** rows.

### 13. Unlink a person from a case

On a roster row (ADMIN/DETECTIVE), click the **trash** icon → a confirm dialog ("Unlink from case?"). Confirm.

**Expect**: toast "Unlinked from case"; the row disappears (`DELETE /involved-persons/<personId>/cases/<caseId>`). The person and case still exist (open either to confirm). Unlinking the same pair again via curl returns `404 Link not found`.

### 14. Already-linked items are hidden from the pickers

- **Person page → Link to a case:** open the case picker. A case the person is **already linked to** does **not** appear in the results.
- **Case page → Link person:** open the person picker. A person **already on the case** does **not** appear.

This prevents the 409 path from ever being hit through the UI (the duplicate guard in §6 remains as a backend safety net).

> ANALYST sees none of the §12–§13 controls; firing the PATCH/DELETE via curl as ANALYST returns `403`.

---

## 15. Done

If steps 2–14 pass, Phase 4 (plus Feature 004) success criteria are met:

- ✅ Linking respects the involvement-type enum.
- ✅ 409 (already linked / duplicate document) surfaces gracefully inline; already-linked items are pre-filtered from the pickers.
- ✅ Client-side `caseId` pre-check (the case picker only yields real cases).
- ✅ Case roster lists linked persons; involvement type is editable; unlink works with a confirm.

Ready to commit and request Phase 5.

### Reset (rare)

```bash
rm -rf node_modules dist .vite && npm install
```
Then DevTools → Application → Storage → "Clear site data".
