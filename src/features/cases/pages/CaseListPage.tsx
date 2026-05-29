import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data/DataTable';
import { PaginationBar } from '@/components/data/PaginationBar';
import { EmptyState } from '@/components/data/EmptyState';
import { RoleGate } from '@/auth/RoleGate';
import { useCasesListQuery } from '@/services/cases/cases.queries';
import type { Case } from '@/services/cases/cases.types';
import { ArchivedPill, CasePriorityBadge, CaseStatusBadge } from '../components/CaseBadges';

const DEFAULT_LIMIT = 20;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function CaseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = parsePage(searchParams.get('page'));

  const query = useCasesListQuery({ page, limit: DEFAULT_LIMIT });

  const columns = useMemo<ColumnDef<Case>[]>(
    () => [
      {
        header: 'Code',
        accessorKey: 'caseCode',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.caseCode}</span>,
      },
      {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.original.title}</span>
            {row.original.archived && <ArchivedPill />}
          </div>
        ),
      },
      {
        header: 'Priority',
        accessorKey: 'priority',
        cell: ({ row }) => <CasePriorityBadge priority={row.original.priority} />,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <CaseStatusBadge status={row.original.status} />,
      },
      {
        header: 'Created',
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
          <h1 className="text-2xl font-semibold">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Investigations across the system.
          </p>
        </div>
        <RoleGate roles={['ADMIN', 'DETECTIVE']}>
          <Button asChild>
            <Link to="/cases/new">
              <Plus className="mr-2 h-4 w-4" /> New case
            </Link>
          </Button>
        </RoleGate>
      </header>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load cases. Try again shortly.
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.data}
            isLoading={query.isLoading}
            onRowClick={(c) => navigate(`/cases/${c.id}`)}
            rowClassName={(c) => (c.archived ? 'opacity-60' : undefined)}
            emptyState={
              <EmptyState
                Icon={Briefcase}
                title="No cases yet"
                description="Create the first investigation."
              />
            }
          />

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
