import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TaskForm } from '../components/TaskForm';

export function TaskNewPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/cases/${id}/tasks` : '/tasks'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to tasks
      </Link>
      <TaskForm mode="create" caseId={id} />
    </section>
  );
}
