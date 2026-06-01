import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginationBar } from '@/components/data/PaginationBar';
import { useAuditListQuery } from '@/services/audit/audit.queries';
import { AuditFilters, type AuditFilterValues } from '../components/AuditFilters';
import { AuditTable } from '../components/AuditTable';

const DEFAULT_LIMIT = 20;
const FILTER_KEYS = ['entityType', 'action', 'userId', 'entityId', 'fromDate', 'toDate'] as const;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));

  const filters: AuditFilterValues = {
    entityType: searchParams.get('entityType') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    entityId: searchParams.get('entityId') ?? undefined,
    fromDate: searchParams.get('fromDate') ?? undefined,
    toDate: searchParams.get('toDate') ?? undefined,
  };

  const query = useAuditListQuery({ page, limit: DEFAULT_LIMIT, ...filters });

  const onFiltersChange = useCallback(
    (values: AuditFilterValues) => {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete('page'); // any filter change resets to page 1
        for (const key of FILTER_KEYS) {
          const v = values[key];
          if (v) sp.set(key, v);
          else sp.delete(key);
        }
        return sp;
      });
    },
    [setSearchParams],
  );

  const onPageChange = (next: number) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (next <= 1) sp.delete('page');
      else sp.set('page', String(next));
      return sp;
    });
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Searchable activity across the system. Click a row to inspect the full record.
        </p>
      </header>

      <AuditFilters initial={filters} onChange={onFiltersChange} />

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load audit records. Try again shortly.
        </div>
      ) : (
        <>
          <AuditTable records={query.data?.data} isLoading={query.isLoading} />
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
