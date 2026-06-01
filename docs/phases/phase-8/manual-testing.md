# Phase 8 — Manual Testing Guide

Step-by-step verification of the Audit module (global search, per-entity timelines, dashboard feed).
The backend must be up, **including `audit-service` and RabbitMQ** (audit is populated by the AMQP
consumer, so events only appear once the broker delivers them).

**Estimated time:** ~20 minutes.

---

## 0. Prerequisites

- **Node 20+**; **backend running** (`curl http://localhost:3000/health` → ok), with
  **`audit-service` + RabbitMQ** up so domain events get recorded.
- Seeded users for the three roles; login working (Phase 1).
- `CORS_ORIGIN=http://localhost:5173`.
- It helps to have at least one case, one evidence item, one task and one involved person from the
  earlier phases — or create them in §2 to generate fresh audit events.

---

## 1. Install & checks

```bash
cd /home/josed/AegisCase_FE
npm install
npm run lint && npm run typecheck && npm run test:run && npm run build
npm run dev          # http://localhost:5173
```

All four checks must pass before testing in the browser. **Audit is ADMIN-only**, so sign in as
**ADMIN** for §3–§7 (you can use DETECTIVE in §2 only to *generate* events).

---

## 2. Generate some activity

Audit only shows what the backend recorded, so create a few events first:

- **Create a case** (Cases → New) → emits `CASE_CREATED`.
- **Register evidence** in that case → `EVIDENCE_ADDED`; then **Transfer custody** → `EVIDENCE_CUSTODY_TRANSFERRED`.
- **Create a task** and **assign** it → `TASK_ASSIGNED`; mark it completed → `TASK_COMPLETED`.
- **Link an involved person** to the case → `INVOLVED_PERSON_LINKED`.
- **Upload media** to any entity → `MEDIA_UPLOADED`.
- (Optional, for the "System" check) Create a task with a **past due date** and wait for a tasks
  list/detail read to trigger the overdue sweep → `TASK_OVERDUE` (actor `system`).

---

## 3. Global audit page (`/audit`)

Open **Audit** in the sidebar.

**Expect**:
- A filter bar (Entity type, Action, User ID, Entity ID, From, To) + a table of records.
- Each row: relative **time** (hover → absolute), an **action badge** (colored + icon), the
  **entity** (type + short id, clickable when it has a detail page), and the **actor** name.
- Clicking a row opens a **detail dialog** with the full `previousState` / `newState` /
  `eventPayload` as monospaced JSON.

**Verify the snake_case boundary** (DevTools → Network): the `/audit` request query string uses
`entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`, `action` — never camelCase.

---

## 4. Filters

- **Action**: pick e.g. *Evidence custody transferred* → only `EVIDENCE_CUSTODY_TRANSFERRED` rows;
  the request carries `action=EVIDENCE_CUSTODY_TRANSFERRED`.
- **Entity type**: pick *Case* → request carries `entity_type=Case` (PascalCase). Only case rows.
- **User ID**: paste a user's Keycloak sub → request carries `user_id=<sub>`; only that user's actions.
- **From / To**: pick dates → request carries `from_date=YYYY-MM-DD` (and/or `to_date`).
- Filters are reflected in the **URL** (deep-linkable) and reset pagination to page 1.
- **Clear filters** removes them all.

---

## 5. "System" actor (overdue)

Find (or filter `action=TASK_OVERDUE`) an overdue row.

**Expect**: the actor renders as **"System"** with a small gear (`Cog`) icon — **never** a raw UUID.

---

## 6. Per-entity timelines

- **Case**: open a case → **Audit** tab → a chronological timeline of that case's events
  (`GET /audit/entity/Case/:id`). Each node: action badge, actor, relative time, and a **Show
  details** toggle revealing the JSON.
- **Evidence**: `/evidence/:id` → **Activity** card → `GET /audit/entity/Evidence/:id`.
- **Task**: `/tasks/:id` → **Activity** card → `GET /audit/entity/Task/:id`.
- **Involved person**: `/involved/:id` → **Activity** card → `GET /audit/entity/InvolvedPerson/:id`.

The per-entity path uses the **PascalCase** entity type (`Case`, `Evidence`, `Task`,
`InvolvedPerson`) and returns events in chronological order.

---

## 7. Dashboard feed

Go to the **Dashboard**.

**Expect**: a **Recent activity** card listing the latest ~8 events (action badge + actor + relative
time), with a **View all** link to `/audit`. Trigger a new event in another tab (e.g. create a case);
within ~30 s the feed refreshes and shows it (polling; it does **not** poll while the tab is hidden).

---

## 8. Role gating (ADMIN-only)

Audit is **ADMIN-only on the FE**. Sign in as **DETECTIVE** or **ANALYST** and verify that:

- The **Audit** item is **absent** from the sidebar.
- Navigating directly to `/audit` **redirects** to the dashboard (route guarded).
- Case detail has **no Audit tab**; evidence/task/involved detail pages show **no Activity card**.
- The dashboard shows **no Recent activity** widget.

Sign back in as **ADMIN** → all audit surfaces reappear.

> Note: this is UX gating. The backend still permits all three roles, so it is not a security
> boundary — non-admins simply don't see the surfaces.

---

## 9. Responsive

DevTools device toolbar:
- **375 × 812 (mobile)**: the audit table becomes a **card list**; filters stack one per row.
- **768 × 1024 (tablet)** / **1440 × 900 (desktop)**: full table; filters in a 2/3-column grid.

---

## Success criteria (from the plan)

- [ ] Snake_case query mapping is correct (`entity_type`, `from_date`, … in the Network tab).
- [ ] `userId="system"` (overdue events) renders as **"System"**, not a UUID.
- [ ] Filtering by an action name from the catalog narrows the results.
- [ ] Per-entity timelines show each entity's chronological history.
- [ ] The dashboard `<AuditFeed>` polls (~30 s) and links to `/audit`.
