import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvolvedPersonQuery } from '@/services/involved/involved.queries';
import { InvolvedForm } from '../components/InvolvedForm';

export function InvolvedEditPage() {
  const { id } = useParams<{ id: string }>();
  const query = useInvolvedPersonQuery(id);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/involved/${id}` : '/involved'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to person
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
          Failed to load person.
        </div>
      )}

      {query.data && <InvolvedForm mode="edit" initial={query.data} />}
    </section>
  );
}
