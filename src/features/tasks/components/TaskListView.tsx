import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDisplayNames } from '@/services/users/users.queries';
import { useCaseSummaries } from '@/services/cases/cases.queries';
import type { Task } from '@/services/tasks/tasks.types';
import { TaskPriorityBadge, TaskStatusBadge } from './TaskBadges';
import { daysOverdue, sortTasks } from '../taskRules';

export function TaskListView({ tasks, isLoading }: { tasks: Task[] | undefined; isLoading?: boolean }) {
  const navigate = useNavigate();
  const sorted = useMemo(() => [...(tasks ?? [])].sort(sortTasks), [tasks]);
  const assigneeSubs = useMemo(() => sorted.map((t) => t.assignedToUserId), [sorted]);
  const caseIds = useMemo(() => sorted.map((t) => t.caseId), [sorted]);
  const { displayName } = useDisplayNames(assigneeSubs);
  const { summary } = useCaseSummaries(caseIds);

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-medium text-foreground',
              row.original.status === 'CANCELLED' && 'text-muted-foreground line-through',
            )}
          >
            {row.original.title}
          </span>
        ),
      },
      {
        header: 'Priority',
        accessorKey: 'priority',
        cell: ({ row }) => <TaskPriorityBadge priority={row.original.priority} />,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
      },
      {
        header: 'Assignee',
        accessorKey: 'assignedToUserId',
        cell: ({ row }) => {
          const name = displayName(row.original.assignedToUserId);
          return name ? (
            <span className="text-sm">{name}</span>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.original.assignedToUserId}
            </span>
          );
        },
      },
      {
        header: 'Due',
        accessorKey: 'dueDate',
        cell: ({ row }) => {
          const od = daysOverdue(row.original.dueDate);
          if (!row.original.dueDate) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className={cn('text-xs', od > 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {od > 0 ? `${od}d overdue` : row.original.dueDate}
            </span>
          );
        },
      },
      {
        header: 'Case',
        accessorKey: 'caseId',
        cell: ({ row }) => {
          const c = summary(row.original.caseId);
          return (
            <Link
              to={`/cases/${row.original.caseId}`}
              className="font-mono text-[11px] text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {c?.caseCode ?? 'case'}
            </Link>
          );
        },
      },
    ],
    [displayName, summary],
  );

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={sorted}
          isLoading={isLoading}
          onRowClick={(t) => navigate(`/tasks/${t.id}`)}
          emptyState={<EmptyState Icon={ClipboardList} title="No tasks" />}
        />
      </div>
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : sorted.length > 0 ? (
          sorted.map((t) => (
            <Link
              key={t.id}
              to={`/tasks/${t.id}`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <p
                className={cn(
                  'text-sm font-medium text-foreground',
                  t.status === 'CANCELLED' && 'text-muted-foreground line-through',
                )}
              >
                {t.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TaskPriorityBadge priority={t.priority} />
                <TaskStatusBadge status={t.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {displayName(t.assignedToUserId) ?? 'Unknown'}
                {t.dueDate ? ` · due ${t.dueDate}` : ''}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState Icon={ClipboardList} title="No tasks" />
        )}
      </div>
    </>
  );
}
