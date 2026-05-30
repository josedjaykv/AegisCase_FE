import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useTaskQuery } from '@/services/tasks/tasks.queries';
import { isTerminal } from '../taskRules';
import { TaskForm } from '../components/TaskForm';

export function TaskEditPage() {
  const { id } = useParams<{ id: string }>();
  const query = useTaskQuery(id);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/tasks/${id}` : '/tasks'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to task
      </Link>

      {query.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {query.isError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load task.
        </div>
      )}

      {query.data && isTerminal(query.data.status) && (
        <div
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          A {query.data.status.toLowerCase()} task cannot be modified.
        </div>
      )}

      {query.data && !isTerminal(query.data.status) && (
        <TaskForm mode="edit" initial={query.data} />
      )}
    </section>
  );
}
