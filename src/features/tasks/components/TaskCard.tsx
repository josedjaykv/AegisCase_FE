import { Link } from 'react-router-dom';
import { CalendarClock, GripVertical, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shortFirstName } from '@/lib/format';
import type { Task } from '@/services/tasks/tasks.types';
import { useCaseSummaries } from '@/services/cases/cases.queries';
import { useDisplayNames } from '@/services/users/users.queries';
import { TaskPriorityBadge } from './TaskBadges';
import { daysOverdue } from '../taskRules';

interface TaskCardProps {
  task: Task;
  /** Drag handle props + listeners from dnd-kit (desktop only). */
  dragHandle?: React.HTMLAttributes<HTMLButtonElement> | undefined;
  draggable?: boolean;
  /** Why the card can't be dragged (shown as a lock tooltip). */
  lockedReason?: string | undefined;
}

export function TaskCard({ task, dragHandle, draggable, lockedReason }: TaskCardProps) {
  const { displayName } = useDisplayNames([task.assignedToUserId]);
  const { summary } = useCaseSummaries([task.caseId]);
  const assignee = displayName(task.assignedToUserId);
  const caseSummary = summary(task.caseId);
  const overdue = daysOverdue(task.dueDate);

  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        {draggable && dragHandle ? (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
            aria-label="Drag task"
            {...dragHandle}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : lockedReason ? (
          <span className="mt-0.5 text-muted-foreground" title={lockedReason}>
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1 space-y-2">
          <Link
            to={`/tasks/${task.id}`}
            className={cn(
              'block text-sm font-medium leading-tight text-foreground hover:underline',
              task.status === 'CANCELLED' && 'text-muted-foreground line-through',
            )}
          >
            {task.title}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <TaskPriorityBadge priority={task.priority} />
            {caseSummary && (
              <Link
                to={`/cases/${task.caseId}`}
                className="font-mono text-[11px] text-primary hover:underline"
                onClick={(ev) => ev.stopPropagation()}
              >
                {caseSummary.caseCode}
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1" title={assignee ?? undefined}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-foreground">
                {initials(assignee, task.assignedToUserId)}
              </span>
              {/* Only the first name (≤10 chars) so long names don't break the card. */}
              <span>{shortFirstName(assignee)}</span>
            </span>
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  overdue > 0 && 'font-medium text-destructive',
                )}
              >
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                {overdue > 0 ? `${overdue}d overdue` : task.dueDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function initials(name: string | null, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || fallback.slice(0, 2).toUpperCase();
}
