import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useCaseQuery } from '@/services/cases/cases.queries';
import { CaseForm } from '../components/CaseForm';

export function CaseEditPage() {
  const { id } = useParams<{ id: string }>();
  const query = useCaseQuery(id);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/cases/${id}` : '/cases'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to case
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
          Failed to load case.
        </div>
      )}

      {query.data?.status === 'CLOSED' && (
        <div
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          A closed case cannot be modified. Reopen it first (admin only).
        </div>
      )}

      {query.data && query.data.status !== 'CLOSED' && <CaseForm mode="edit" initial={query.data} />}
    </section>
  );
}
