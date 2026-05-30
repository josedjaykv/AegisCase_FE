# Phase 6 — Manual Testing Guide

Step-by-step verification of the Tasks module + Kanban board. The backend must be up.

**Estimated time:** ~25 minutes.

---

## 0. Prerequisites

- **Node 20+**; **backend running** (`curl http://localhost:3000/health` → ok).
- Seeded users for the three roles; Keycloak picker working (Phase 2 §0).
- **At least one case** (Phase 3) and a couple of provisioned users to assign tasks to.
- `CORS_ORIGIN=http://localhost:5173`.

---

## 1. Install & checks

```bash
cd /home/josed/AegisCase_FE
npm install          # picks up @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
npm run lint && npm run typecheck && npm run test:run && npm run build
npm run dev          # http://localhost:5173
```

Sign in as **DETECTIVE**.

---

## 2. Create tasks (from a case)

Open a case → **Tasks** tab → **New task** (or `/cases/:id/tasks` → **New task**).

- Title (required), optional description, **Priority** (LOW/MEDIUM/HIGH/URGENT), optional **Due date**, **Assignee** (search a provisioned user).
- Create a few tasks with different priorities and assignees. Make one with a **past due date** (e.g. yesterday) — you'll use it for OVERDUE.

**Expect**: toast "Task created", redirect to `/tasks/:id`. `POST /tasks` body has `caseId`, `title`, `priority`, `assignedToUserId` (+ description/dueDate).

---

## 3. Kanban board (`/tasks`)

Go to **Tasks** in the sidebar.

**Expect**:
- A **Board / List** toggle (defaults to Board; choice persists across reloads).
- Five columns: **Pending · In progress · Overdue · Completed · Cancelled**, each with a count.
- Cards show title, priority badge, case code, assignee initials+name, due date.
- Cards are ordered by priority (URGENT first) then due date.

---

## 4. Drag to change status (desktop, optimistic)

Drag a card from **Pending** to **In progress** using the grip handle.

**Expect**: while dragging, a tilted copy of the card **floats above all columns** (never clipped behind them — see fix 001) and the source card dims in place. The card moves **immediately** (optimistic), toast "Moved to In progress", and `PATCH /tasks/:id/status` fires. Drag it to **Completed**.

Now try to drag the **Completed** card anywhere: it shows a **lock** icon and is not draggable (terminal). The same for Cancelled.

**Rollback:** to see rollback, stop the backend and drag a card — it snaps back with an error toast. Restart the backend after.

---

## 5. Keyboard accessibility

`Tab` to a card's grip handle, press **Space** to grab, **arrow keys** to move toward another column, **Space** to drop. The status updates. (Full axe-core audit is Phase 10.)

---

## 6. OVERDUE auto-sweep + toast

You created a task with a past due date in §2. The OVERDUE flip happens server-side on every `GET /tasks`.

- Stay on the board ~30 s (it polls). The past-due task **reflows into the Overdue column** without a manual refresh, with an "Nd overdue" label in red.
- When it flips during a poll (not the first load), a **toast** appears: "Task overdue: <title>". (If it was already OVERDUE when you opened the board, you won't get a toast — that's intentional; force it by creating a new past-due task and waiting a poll.)

---

## 7. List view

Toggle to **List**.

**Expect**: a table — **Title · Priority · Status · Assignee · Due · Case** — sorted like the board; CANCELLED titles are struck through; row click opens the detail. The toggle persists.

---

## 8. Filters

- **Priority** select → only matching cards/rows show.
- **Assigned to me** → only your tasks.
- **Overdue** → only overdue/past-due tasks.

Filters apply to both board and list.

---

## 9. Task detail + status picker

Open a task (`/tasks/:id`).

**Expect**: header with priority + case code, title, a **status dropdown** (allowed transitions only), Edit (when permitted), assignee/assigned-by names, due date (red if overdue). The page polls every 60 s.

Change status via the dropdown — same optimistic behavior, toast.

---

## 10. ANALYST restrictions (the important role test)

Sign in as **ANALYST**.

- On the board: cards **assigned to you** are draggable; **all others show a lock icon** and can't be dragged.
- Drag one of **your** Pending tasks → In progress: works.
- Your card's status dropdown (mobile / picker) **does not offer Cancelled** (analysts can't cancel).
- Try to drag your card to **Cancelled**: denied with a toast "Analysts can't cancel tasks."
- **No "New task"** button anywhere (create is ADMIN/DETECTIVE). `/cases/:id/tasks/new` by URL → permission toast + redirect.
- Editing: you can edit **your own** task; editing another's → the server 403 surfaces.

Backend safety net: even if a restriction were bypassed, `PATCH /tasks/:id/status` returns 403 and the optimistic move rolls back.

---

## 11. COMPLETED is terminal

As any role, a **Completed** task: status dropdown shows a read-only badge (no transitions), no Edit, not draggable. Trying via curl (`PATCH .../status` to reopen) → `400 "A completed task cannot be reopened"`.

---

## 12. Dashboard "My active tasks" widget

Go to **Dashboard**.

**Expect**: a "My active tasks" card listing your active (Pending/In progress/Overdue) tasks, polling every 30 s, each linking to its detail, with a "View board" link. Empty state when you have none.

---

## 13. Mobile (no drag)

DevTools responsive → **375 px**, open `/tasks`.

**Expect**: columns are horizontally scrollable; **no drag handles** — instead each card has an **inline status dropdown** beneath it to change status. The list view becomes stacked cards.

---

## 14. Case-scoped board

Open `/cases/:id/tasks`.

**Expect**: the same board, showing **only this case's tasks**, with a **New task** button (ADMIN/DETECTIVE). DevTools → Network shows `GET /tasks?caseId=<id>&...` (server-side filter).

---

## 16. Kanban layout: full height + themed scrollbar (Feature 005)

On `/tasks` (desktop):

- The board **fills the viewport height** — columns are tall, not just as tall as their cards.
- A column with many cards **scrolls internally** (its header stays fixed); the scrollbar is the **thin themed** one (not the default OS bar).
- On a normal desktop the five columns **share the width with no horizontal scroll**. If the window is narrow enough to need it, the horizontal scrollbar is also the themed thin one.
- Tables (any list on mobile width) and the case-detail tab strip use the same themed scrollbar.

## 17. Collapsible sidebar (Feature 005)

On desktop (`≥ md`):

- Click the **panel icon** in the top bar (left side) → the sidebar collapses to an **icon-only** rail; labels disappear, icons stay, hovering an icon shows its label as a tooltip.
- Click it again → expands back to the full `w-64` with labels.
- There's also a **Collapse/Expand** button at the bottom of the sidebar.
- Collapse the sidebar, then open `/tasks` → the Kanban gains the reclaimed width (horizontal scroll, if any, disappears).
- Reload the page → the collapsed/expanded choice **persists** (stored in `aegiscase:ui`).
- On mobile (`< md`) the sidebar is still the slide-in drawer (hamburger) — unchanged.

---

## 19. Filter the board by case (Feature 006)

On the global `/tasks` board:

- A **case selector** (defaults to "All cases") appears in the toolbar. Pick a case → the board shows only that case's tasks. DevTools → Network shows `GET /tasks?caseId=<id>`. Set it back to "All cases" to clear.
- (On the case-scoped board `/cases/:id/tasks` the case selector is **not** shown — the case is already fixed.)

## 20. Filter the board by assignee (Feature 006)

- An **assignee selector** lists the users who currently have tasks in view, by **name** (resolved), plus a "Me (…)" option when you have tasks. Pick one → the board shows only that person's tasks. Works for ADMIN, DETECTIVE and ANALYST.
- Combine it with the case filter and priority/overdue.

## 21. Create a task from the board, choosing a case (Feature 006)

As ADMIN/DETECTIVE, on `/tasks` click **New task** (`/tasks/new`).

**Expect**: the task form now starts with a **Case** selector (required). Pick a case, fill title/priority/assignee (+ optional description/due date), **Create task**. `POST /tasks` carries the chosen `caseId`. You land on the new task's detail.

- The in-case create flow (`/cases/:id/tasks/new`) is unchanged — no case selector there, the case is fixed.
- As **ANALYST**, there's no **New task** button; `/tasks/new` by URL → permission toast + redirect.

---

## 22. Done

If §2–§21 pass, Phase 6's success criteria are met:

- ✅ All roles use the board within permissions; analyst cards locked; forbidden transitions hidden.
- ✅ PENDING → IN_PROGRESS → COMPLETED with optimistic UI + invalidation.
- ✅ OVERDUE appears after the server flip; cards reflow without refresh; a toast surfaces new overdues.
- ✅ Keyboard-navigable kanban; mobile uses the picker, no DnD.

Ready to commit and request Phase 7.

### Reset (rare)
```bash
rm -rf node_modules dist .vite && npm install
```
Then DevTools → Application → Storage → "Clear site data".
