import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, UsersRound } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data/DataTable';
import { PaginationBar } from '@/components/data/PaginationBar';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/auth/RoleGate';
import { useInvolvedListQuery } from '@/services/involved/involved.queries';
import type { InvolvedPerson } from '@/services/involved/involved.types';
import { InvolvedCard } from '../components/InvolvedCard';

const DEFAULT_LIMIT = 20;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function InvolvedListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = parsePage(searchParams.get('page'));

  const query = useInvolvedListQuery({ page, limit: DEFAULT_LIMIT });

  const columns = useMemo<ColumnDef<InvolvedPerson>[]>(
    () => [
      {
        header: 'Name',
        accessorFn: (p) => `${p.firstNames} ${p.lastNames ?? ''}`,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.firstNames} {row.original.lastNames ?? ''}
          </span>
        ),
      },
      {
        header: 'Document',
        accessorKey: 'document',
        cell: ({ row }) =>
          row.original.document ? (
            <span className="font-mono text-xs">{row.original.document}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        header: 'Registered',
        accessorKey: 'createdAt',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  const onPageChange = (next: number) => {
    const sp = new URLSearchParams(searchParams);
    if (next <= 1) sp.delete('page');
    else sp.set('page', String(next));
    setSearchParams(sp);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Involved persons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People registered across investigations.
          </p>
        </div>
        <RoleGate roles={['ADMIN', 'DETECTIVE']}>
          <Button asChild>
            <Link to="/involved/new">
              <Plus className="mr-2 h-4 w-4" /> Register person
            </Link>
          </Button>
        </RoleGate>
      </header>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load people. Try again shortly.
        </div>
      ) : (
        <>
          {/* Desktop / tablet: DataTable */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={query.data?.data}
              isLoading={query.isLoading}
              onRowClick={(p) => navigate(`/involved/${p.id}`)}
              emptyState={
                <EmptyState
                  Icon={UsersRound}
                  title="No people yet"
                  description="Register the first involved person."
                />
              }
            />
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {query.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : query.data && query.data.data.length > 0 ? (
              query.data.data.map((p) => <InvolvedCard key={p.id} person={p} />)
            ) : (
              <EmptyState
                Icon={UsersRound}
                title="No people yet"
                description="Register the first involved person."
              />
            )}
          </div>

          {query.data && query.data.total > 0 && (
            <PaginationBar
              page={query.data.page}
              limit={query.data.limit}
              total={query.data.total}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </section>
  );
}
