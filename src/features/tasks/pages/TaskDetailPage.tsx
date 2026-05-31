import { ChevronLeft, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/auth/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useTaskQuery } from '@/services/tasks/tasks.queries';
import { useCaseSummaries } from '@/services/cases/cases.queries';
import { useDisplayNames } from '@/services/users/users.queries';
import { formatDateTime } from '@/lib/date';
import { TaskPriorityBadge } from '../components/TaskBadges';
import { TaskStatusPicker } from '../components/TaskStatusPicker';
import { daysOverdue, isOwnTask, isTerminal } from '../taskRules';
import { MediaGallery } from '@/features/media/components/MediaGallery';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useTaskQuery(id, { poll: true });
  const { role } = usePermissions();
  const userSub = useAuthStore((s) => s.user?.sub);

  const t = query.data;
  const { displayName } = useDisplayNames(
    t ? [t.assignedToUserId, t.assignedByUserId] : [],
  );
  const { summary } = useCaseSummaries(t ? [t.caseId] : []);

  if (query.isLoading) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  if (query.isError || !t) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <Link to="/tasks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to tasks
        </Link>
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {query.error && typeof query.error === 'object' && 'status' in query.error && (query.error as { status: number }).status === 404
            ? 'Task not found.'
            : 'Failed to load task.'}
        </div>
      </section>
    );
  }

  const canEdit =
    !isTerminal(t.status) &&
    (role === 'ADMIN' || role === 'DETECTIVE' || (role === 'ANALYST' && isOwnTask(t, userSub)));
  const overdue = daysOverdue(t.dueDate);
  const caseSummary = summary(t.caseId);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link to="/tasks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to tasks
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <TaskPriorityBadge priority={t.priority} />
            {caseSummary && (
              <Link to={`/cases/${t.caseId}`} className="font-mono text-xs text-primary hover:underline">
                {caseSummary.caseCode}
              </Link>
            )}
          </div>
          <CardTitle className="text-lg">{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <TaskStatusPicker task={t} />
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/tasks/${t.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </div>

          {t.description?.trim() && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{t.description}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Assignee</dt>
              <dd className="truncate">{displayName(t.assignedToUserId) ?? t.assignedToUserId}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Assigned by</dt>
              <dd className="truncate">{displayName(t.assignedByUserId) ?? t.assignedByUserId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due date</dt>
              <dd className={overdue > 0 ? 'font-medium text-destructive' : undefined}>
                {t.dueDate ? (overdue > 0 ? `${t.dueDate} (${overdue}d overdue)` : t.dueDate) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd>{formatDateTime(t.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Files attached to this task.</p>
        </CardHeader>
        <CardContent>
          <MediaGallery entityType="TASK" entityId={t.id} readOnly={isTerminal(t.status)} />
        </CardContent>
      </Card>
    </section>
  );
}
