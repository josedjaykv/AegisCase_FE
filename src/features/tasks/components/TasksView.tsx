import { useMemo, useState } from 'react';
import { KanbanSquare, List } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useTasksListQuery } from '@/services/tasks/tasks.queries';
import { useDisplayNames } from '@/services/users/users.queries';
import { CaseSelect } from '@/features/cases/components/CaseSelect';
import { TASK_PRIORITIES, type Task, type TaskPriority } from '@/services/tasks/tasks.types';
import { cn } from '@/lib/utils';
import { abbreviateName } from '@/lib/format';
import { KanbanBoard } from './KanbanBoard';
import { TaskListView } from './TaskListView';
import { daysOverdue } from '../taskRules';
import { useOverdueNotifier } from '../useOverdueNotifier';

// Kanban needs all statuses at once, so we fetch a generous page rather than
// paginate. Fine for v1 scale; see implementation notes.
const FETCH_LIMIT = 100;
const ALL = '__ALL__';

export function TasksView({ caseId }: { caseId?: string }) {
  const taskView = useUiStore((s) => s.taskView);
  const setTaskView = useUiStore((s) => s.setTaskView);
  const userSub = useAuthStore((s) => s.user?.sub);
  const dragEnabled = useIsDesktop();

  const [priority, setPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [assignee, setAssignee] = useState<string>(ALL);
  const [overdueOnly, setOverdueOnly] = useState(false);
  // Case filter only on the global board (the case-scoped board fixes caseId).
  const [caseFilter, setCaseFilter] = useState<string | undefined>(undefined);

  // caseId is filtered server-side (GET /tasks?caseId=). priority / assignee /
  // overdue are applied client-side over the fetched page.
  const effectiveCaseId = caseId ?? caseFilter;
  const query = useTasksListQuery(
    { page: 1, limit: FETCH_LIMIT, caseId: effectiveCaseId },
    { poll: true },
  );
  useOverdueNotifier(query.data?.data);

  const allRows = useMemo(() => query.data?.data ?? [], [query.data]);

  // Assignee filter options derive from who actually has tasks in the fetched
  // set — resolved to names via /users/directory (available to every role).
  const assigneeSubs = useMemo(
    () => Array.from(new Set(allRows.map((t) => t.assignedToUserId))),
    [allRows],
  );
  const { displayName } = useDisplayNames(assigneeSubs);

  const tasks = useMemo<Task[]>(() => {
    let rows = allRows;
    if (priority !== 'ALL') rows = rows.filter((t) => t.priority === priority);
    if (assignee !== ALL) rows = rows.filter((t) => t.assignedToUserId === assignee);
    if (overdueOnly) rows = rows.filter((t) => t.status === 'OVERDUE' || daysOverdue(t.dueDate) > 0);
    return rows;
  }, [allRows, priority, assignee, overdueOnly]);

  return (
    <div className="space-y-4">
      {/* Toolbar: view toggle + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-md border border-border p-0.5">
          <ToggleBtn active={taskView === 'kanban'} onClick={() => setTaskView('kanban')}>
            <KanbanSquare className="mr-1.5 h-4 w-4" /> Board
          </ToggleBtn>
          <ToggleBtn active={taskView === 'list'} onClick={() => setTaskView('list')}>
            <List className="mr-1.5 h-4 w-4" /> List
          </ToggleBtn>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!caseId && (
            <CaseSelect
              value={caseFilter}
              onChange={setCaseFilter}
              allowAll
              placeholder="All cases"
              className="h-9 w-52"
              aria-label="Filter by case"
            />
          )}

          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger
              className="h-9 w-44"
              aria-label="Filter by assignee"
              title={assignee === ALL ? undefined : (displayName(assignee) ?? undefined)}
            >
              {/* Trigger shows a compact "First L." label so a long selected
                  name doesn't overflow; the dropdown lists full names. */}
              <span className="truncate">
                {assignee === ALL
                  ? 'All assignees'
                  : abbreviateName(displayName(assignee) ?? assignee)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
              {userSub && assigneeSubs.includes(userSub) && (
                <SelectItem value={userSub}>Me ({displayName(userSub) ?? 'you'})</SelectItem>
              )}
              {assigneeSubs
                .filter((sub) => sub !== userSub)
                .map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {displayName(sub) ?? sub.slice(0, 8)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority | 'ALL')}>
            <SelectTrigger className="h-9 w-36" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleFilter active={overdueOnly} onClick={() => setOverdueOnly((v) => !v)}>
            Overdue
          </ToggleFilter>
        </div>
      </div>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load tasks. Try again shortly.
        </div>
      ) : taskView === 'kanban' ? (
        <KanbanBoard tasks={tasks} dragEnabled={dragEnabled} />
      ) : (
        <TaskListView tasks={tasks} isLoading={query.isLoading} />
      )}
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function ToggleFilter({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
