# Phase 6 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phase 3 (cases), plus the shared `KeycloakUserPicker`, `useDisplayNames`, `useCaseSummaries`, DataTable/cards pattern.

Phase 6 delivers the **Tasks module**: a Kanban board (primary) + a list view (secondary), a detail page, a case-scoped board, a dashboard widget, and role-aware status transitions with OVERDUE handling.

---

## Routes

| Route | Roles (FE gate) | Page |
|---|---|---|
| `/tasks` | all authed | `TasksPage` (board/list toggle, persisted) |
| `/tasks/:id` | all authed | `TaskDetailPage` (polls 60 s) |
| `/tasks/:id/edit` | all authed* | `TaskEditPage` (*server enforces analyst-own + terminal) |
| `/cases/:id/tasks` | all authed | `CaseTasksPage` (board scoped to the case) |
| `/cases/:id/tasks/new` | ADMIN, DETECTIVE | `TaskNewPage` |

The case-detail **Tasks tab** links to the case board; the **dashboard** hosts the My-tasks widget.

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §5.7, §3.8, §6.3)

| Endpoint | Hook | Notes |
|---|---|---|
| `GET /tasks` (+ `assignedToUserId?`) | `useTasksListQuery(params, { poll })` | `staleTime: 0`; polls **30 s** when `poll`; ⚠️ sweeps OVERDUE server-side |
| `GET /tasks/:id` | `useTaskQuery(id, { poll })` | polls 60 s on the detail page |
| `POST /tasks` | `useCreateTaskMutation` | |
| `PUT /tasks/:id` | `useUpdateTaskMutation` | 400 completed/cancelled, 403 analyst-not-own surfaced |
| `PATCH /tasks/:id/status` | `useChangeTaskStatusMutation` (unbound, **optimistic**) | shared by the board (drag) and the picker (select) |

## Kanban (`<KanbanBoard>`)

- **Library:** `@dnd-kit/core` + `@dnd-kit/utilities` (approved in tech-stack). `PointerSensor` + `KeyboardSensor` → keyboard-navigable (focus the grip, Space to grab, arrows, Space to drop).
- **Columns:** all 5 `TaskStatus` values; each shows a count; cards sorted **priority DESC then dueDate ASC** (`sortTasks`).
- **Card:** title (strikethrough when CANCELLED), priority badge, case code link, assignee initials+name (resolved via `useDisplayNames`), due date with **"Nd overdue"** in `--destructive`.
- **Drag rules (client-side mirror of the backend; server authoritative)** — `taskRules.ts`:
  - COMPLETED & CANCELLED are terminal → not draggable (lock icon + reason).
  - ANALYST may only drag their **own** tasks; others render locked.
  - ANALYST cannot drop into CANCELLED; nobody can drop into OVERDUE (system-only). Denied drops show a toast explaining why.
- **Optimistic:** the card moves on drop immediately (cache patched across all list queries); rolls back + toast on failure.
- **Responsive:** drag is enabled only at `≥ md` (`useIsDesktop`). Below `md`, the board renders columns with an **inline `TaskStatusPicker`** under each card — status changes via the picker, no drag (design-system §11).
- **Polling:** the board polls every 30 s (drives the server OVERDUE sweep). `useOverdueNotifier` toasts when a task **newly** flips to OVERDUE between polls (primed to skip the first load).

## `<TaskStatusPicker>`

Honors the rules via `allowedTargets`: terminal tasks and not-permitted actors render a read-only badge; ANALYST never sees CANCELLED; the current value is shown disabled with allowed targets below. Uses the same optimistic mutation.

## Other pieces

- `TasksView` — shared board/list shell with the view toggle (persisted in `useUiStore.taskView`) and filters (priority select, "Assigned to me", "Overdue"). Used by both the global and case-scoped pages.
- `TaskListView` — secondary list (table on `md+`, cards on mobile); CANCELLED titles struck through.
- `TaskForm` — create (caseId fixed from context, assignee via picker) / edit; maps 400/403 messages.
- `MyTasksWidget` — dashboard, `GET /tasks?assignedToUserId=me`, polls 30 s, shows active (PENDING/IN_PROGRESS/OVERDUE) tasks.
- `lib/date.ts` already provided relative time; `taskRules.ts` adds `daysOverdue`.

## Success criteria verification

| Criterion | Status |
|---|---|
| All roles use the board within permissions; analyst-restricted cards non-draggable; tap-actions hide forbidden transitions | ✅ `taskRules` + lock icons + picker filtering |
| PENDING → IN_PROGRESS → COMPLETED with optimistic UI + invalidation | ✅ optimistic mutation, invalidate on settle |
| OVERDUE badge after server flip; cards reflow without refresh | ✅ 30 s poll re-groups columns |
| Toast surfaces newly-overdue tasks during a poll | ✅ `useOverdueNotifier` |
| Keyboard-navigable kanban | ✅ dnd-kit `KeyboardSensor` |
| Mobile: swipe/tap to change status via picker, no DnD | ✅ inline picker below cards on `< md` |
| Lint / typecheck / tests / build | ✅ all green |

## Known limitations

- **Kanban is not paginated** (it needs all statuses at once). The list view shares the same fetched set rather than independent server pagination — pragmatic for v1.
- **Assignee role pre-check** (CLAUDE.md note: assignee should be DETECTIVE/ANALYST) is not enforced — the picker allows any provisioned user; the backend doesn't validate it either. Could be tightened later.

## Addendum — server-side `caseId` filter (shipped)

The backend added `caseId?` to `GET /tasks` ([brief](./backend-prompt-tasks-casefilter.md)). The FE now filters the case-scoped board server-side:

- `services/tasks/tasks.types.ts` — `TasksListParams.caseId?`.
- `services/tasks/tasks.api.ts` — forwards `caseId` as a query param.
- `features/tasks/components/TasksView.tsx` — calls `useTasksListQuery({ caseId, … })`; the previous client-side `caseId` filter is removed. Priority / "assigned to me" / "overdue" stay client-side over the fetched page.

`/cases/:id/tasks` is now correct at any volume — a case's tasks are no longer constrained to whatever fell in the global page.

## Addendum — Kanban layout polish (Feature 005)

Post-review UX changes (full write-up: [`../../features/feature-005-sidebar-collapse-and-themed-scroll.md`](../../features/feature-005-sidebar-collapse-and-themed-scroll.md)):

- **Full-height board** — `md:h-[calc(100vh-14rem)]`; columns are `flex-1 min-w-[15rem] md:h-full` (share width, only scroll horizontally when they truly don't fit) and each column's card area scrolls internally.
- **Themed scrollbar** — the raw OS scrollbar is replaced by the `.scrollbar-thin` utility on the board (both axes); also applied app-wide to `DataTable` and the tab scroller.
- **Collapsible sidebar** — toggle from the top bar or the sidebar footer; collapsed = icon-only `w-16`; state persisted. Collapsing reclaims width for the board.

## Addendum — board filters & global create (Feature 006)

[Full write-up.](../../features/feature-006-tasks-board-filters-and-global-create.md) FE-only (backend already supported the params):

- **Case filter** on the global board → server-side `GET /tasks?caseId=` (new reusable `features/cases/components/CaseSelect.tsx`).
- **Assignee filter** → options derived from the fetched tasks, resolved to names via `/users/directory` (works for all roles), filtered client-side. Replaces the "Assigned to me" toggle (now a "Me" option in the selector).
- **Create from the board** → `/tasks/new` (ADMIN/DETECTIVE) with a required case picker; the in-case create flow is unchanged.
