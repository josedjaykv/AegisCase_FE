import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data/DataTable';
import { PaginationBar } from '@/components/data/PaginationBar';
import { EmptyState } from '@/components/data/EmptyState';
import { useUsersListQuery } from '@/services/users/users.queries';
import type { User } from '@/services/users/users.types';
import { RoleBadge } from '../components/RoleBadge';

const DEFAULT_LIMIT = 20;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = parsePage(searchParams.get('page'));
  const limit = DEFAULT_LIMIT;

  const query = useUsersListQuery({ page, limit });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        header: 'Name',
        accessorFn: (u) => `${u.firstNames} ${u.lastNames}`,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.firstNames} {row.original.lastNames}
            </span>
            {row.original.jobTitle && (
              <span className="text-xs text-muted-foreground">{row.original.jobTitle}</span>
            )}
          </div>
        ),
      },
      {
        header: 'Document',
        accessorKey: 'document',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.document}</span>
        ),
      },
      {
        header: 'Role',
        accessorKey: 'role',
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
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
    setSearchParams(sp, { replace: false });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational profiles for users already provisioned in Keycloak.
          </p>
        </div>
        <Button asChild>
          <Link to="/users/new">
            <Plus className="mr-2 h-4 w-4" /> New user
          </Link>
        </Button>
      </header>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load users. Try again shortly.
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={query.data?.data}
            isLoading={query.isLoading}
            onRowClick={(u) => navigate(`/users/${u.id}`)}
            emptyState={
              <EmptyState
                Icon={Users}
                title="No users yet"
                description="Create the first operational profile."
                action={
                  <Button asChild size="sm">
                    <Link to="/users/new">New user</Link>
                  </Button>
                }
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
