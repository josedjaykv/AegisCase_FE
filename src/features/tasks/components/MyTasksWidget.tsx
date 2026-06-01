import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasksListQuery } from '@/services/tasks/tasks.queries';
import { useOverdueNotifier } from '../useOverdueNotifier';
import { sortTasks, daysOverdue } from '../taskRules';
import { TaskPriorityBadge, TaskStatusBadge } from './TaskBadges';

const ACTIVE = new Set(['PENDING', 'IN_PROGRESS', 'OVERDUE']);

/** Dashboard widget — my active tasks, polling every 30 s. */
export function MyTasksWidget() {
  const userSub = useAuthStore((s) => s.user?.sub);
  const query = useTasksListQuery(
    { page: 1, limit: 50, assignedToUserId: userSub },
    { poll: true },
  );
  useOverdueNotifier(query.data?.data);

  const tasks = (query.data?.data ?? [])
    .filter((t) => ACTIVE.has(t.status))
    .sort(sortTasks)
    .slice(0, 6);

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">My active tasks</h2>
        <Link to="/tasks" className="text-xs text-primary hover:underline">
          View board
        </Link>
      </div>

      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" /> Nothing active. Nice.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => {
            const od = daysOverdue(t.dueDate);
            return (
              <li key={t.id}>
                <Link
                  to={`/tasks/${t.id}`}
                  className="block rounded-md border border-border px-3 py-2 transition-colors hover:bg-accent/40"
                >
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <TaskPriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} />
                    {od > 0 && (
                      <span className="text-[11px] font-medium text-destructive">{od}d overdue</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
