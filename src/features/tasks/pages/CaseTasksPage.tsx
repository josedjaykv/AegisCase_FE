import { ChevronLeft, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/auth/RoleGate';
import { useCaseQuery } from '@/services/cases/cases.queries';
import { TasksView } from '../components/TasksView';

export function CaseTasksPage() {
  const { id } = useParams<{ id: string }>();
  const caseQuery = useCaseQuery(id);

  return (
    <section className="space-y-6">
      <Link
        to={id ? `/cases/${id}` : '/cases'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to case
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          {caseQuery.data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {caseQuery.data.caseCode} · {caseQuery.data.title}
            </p>
          )}
        </div>
        {!caseQuery.data?.archived && (
          <RoleGate roles={['ADMIN', 'DETECTIVE']}>
            <Button asChild>
              <Link to={`/cases/${id}/tasks/new`}>
                <Plus className="mr-2 h-4 w-4" /> New task
              </Link>
            </Button>
          </RoleGate>
        )}
      </header>

      {id && <TasksView caseId={id} />}
    </section>
  );
}
