import { useSearchParams } from 'react-router-dom';
import { PaginationBar } from '@/components/data/PaginationBar';
import { useEvidenceListQuery } from '@/services/evidence/evidence.queries';
import { EvidenceList } from '../components/EvidenceList';

const DEFAULT_LIMIT = 20;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function EvidenceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));

  const query = useEvidenceListQuery({ page, limit: DEFAULT_LIMIT });

  const onPageChange = (next: number) => {
    const sp = new URLSearchParams(searchParams);
    if (next <= 1) sp.delete('page');
    else sp.set('page', String(next));
    setSearchParams(sp);
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Evidence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All evidence across cases. Register evidence from within a case.
        </p>
      </header>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load evidence. Try again shortly.
        </div>
      ) : (
        <>
          <EvidenceList rows={query.data?.data} isLoading={query.isLoading} />
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
