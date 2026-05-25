import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserQuery } from '@/services/users/users.queries';
import { UserForm } from '../components/UserForm';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useUserQuery(id);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/users"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to users
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
          {query.error && typeof query.error === 'object' && 'status' in query.error && (query.error as { status: number }).status === 404
            ? 'User not found.'
            : 'Failed to load user.'}
        </div>
      )}

      {query.data && <UserForm mode="edit" initial={query.data} />}
    </section>
  );
}
