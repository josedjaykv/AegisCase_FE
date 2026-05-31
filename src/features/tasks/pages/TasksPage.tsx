import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/auth/RoleGate';
import { TasksView } from '../components/TasksView';

export function TasksPage() {
  //throw new Error('Boom');
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Board across all cases. Filter by case or assignee.
          </p>
        </div>
        <RoleGate roles={['ADMIN', 'DETECTIVE']}>
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="mr-2 h-4 w-4" /> New task
            </Link>
          </Button>
        </RoleGate>
      </header>
      <TasksView />
    </section>
  );
}
