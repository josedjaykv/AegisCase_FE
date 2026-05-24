# Phase 6 — Tasks module + Kanban board

**Status:** ⬜ Not started
**Duration estimate:** 6–8 days
**Dependencies:** Phase 3 (cases must exist)

## Objective

Task module with two complementary views — a **Kanban board** (primary) and a paginated list (secondary) — plus role-aware actions and OVERDUE handling.

## Deliverables

- `/tasks` defaulting to **Kanban view** (Jira-style), with a toggle to switch to list view (persisted in `useUiStore`).
- `/tasks/:id` detail page.
- `/cases/:id/tasks` showing the kanban scoped to that case.
- My-tasks dashboard widget polling every 30–60 s.
- `TaskStatusPicker` honoring analyst-only-own + cancel restrictions and COMPLETED-terminal rule.
- `<KanbanBoard>` component (see Kanban specification below).

## Kanban specification

- **Columns:** one per `TaskStatus` — `PENDING`, `IN_PROGRESS`, `OVERDUE`, `COMPLETED`, `CANCELLED`. Each column shows count + cards ordered by `priority DESC` then `dueDate ASC`.
- **Card content:** title, priority badge, assignee avatar/initials, due date (with "X days overdue" in `--destructive` when applicable), case code link.
- **Drag-and-drop:** card drag changes status via `PATCH /tasks/:id/status`. Library: **`@dnd-kit/core`** (accessible, keyboard support, lighter than `react-beautiful-dnd`).
- **Drop restrictions enforced client-side** (server still authoritative):
  - Cannot drop from `COMPLETED` (terminal — rule from backend, returns 400).
  - ANALYST cannot drop into `CANCELLED` (returns 403).
  - ANALYST can only drag cards where `assignedToUserId === user.sub` (others render non-draggable with a small lock icon).
- **Optimistic update:** card moves immediately on drop; revert with toast if the mutation fails.
- **Filters:** assignee, priority, case, due-date range — drive the same TanStack Query key used by the list view.
- **Keyboard:** focus a card with `Tab`, `Space` to grab, arrow keys to move between columns, `Space` to drop (dnd-kit handles this).
- **Responsive behavior:** see [`docs/design-system.md`](../../design-system.md) §11 — desktop shows all 5 columns; tablet 2 scrollable; mobile single column with swipe + segmented control. Drag-and-drop is **disabled on `< md`**; on mobile, status changes via the card's tap-to-open `TaskStatusPicker`.
- **Polling:** kanban refetches every 30 s while visible (drives OVERDUE sweep server-side); newly-OVERDUE cards animate into the OVERDUE column.

## Backend integrations

- `POST /tasks`
- `GET /tasks` (with `assignedToUserId?` filter; ⚠️ sweeps OVERDUE as side effect)
- `GET /tasks/:id` (also sweeps OVERDUE)
- `PUT /tasks/:id`
- `PATCH /tasks/:id/status`

## Success criteria

- All three roles can use the board within their permissions; analyst-restricted cards are visibly non-draggable and tap-actions hide forbidden transitions.
- Dragging from `PENDING` → `IN_PROGRESS` → `COMPLETED` works end-to-end with optimistic UI and proper invalidation.
- OVERDUE badge appears after server flip; cards reflow into the OVERDUE column without page refresh.
- Toast surfaces newly-overdue tasks discovered during a poll.
- Kanban is keyboard-navigable (Tab/Space/arrows) and passes axe-core.
- Mobile experience: swipe between columns, tap card to change status via picker — no drag-and-drop required.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §4 conditional permission gates (analyst-only-own, no-CANCEL-by-analyst); §5 `<TaskStatusPicker>` and `<KanbanBoard>`
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — `/tasks` polling 30–60 s; OVERDUE sweep side effect
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Task lifecycle
- [`docs/design-system.md`](../../design-system.md) — §2 `TaskStatus` and `TaskPriority` badge mappings (OVERDUE solid + icon); §11 Kanban responsive behavior
- `BACKEND_INVESTIGATION_REPORT.md` §3.8, §5.7, §6.3 — task entity, endpoints, lifecycle and overdue auto-sweep mechanic
