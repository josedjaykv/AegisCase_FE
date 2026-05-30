import { ChevronLeft, Plus } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/data/PaginationBar';
import { RoleGate } from '@/auth/RoleGate';
import { useCaseQuery } from '@/services/cases/cases.queries';
import { useEvidenceListQuery } from '@/services/evidence/evidence.queries';
import { EvidenceList } from '../components/EvidenceList';

const DEFAULT_LIMIT = 20;

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function CaseEvidenceListPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));

  const caseQuery = useCaseQuery(id);
  const query = useEvidenceListQuery({ page, limit: DEFAULT_LIMIT, caseId: id });

  const onPageChange = (next: number) => {
    const sp = new URLSearchParams(searchParams);
    if (next <= 1) sp.delete('page');
    else sp.set('page', String(next));
    setSearchParams(sp);
  };

  return (
    <section className="space-y-6">
      <Link
        to={id ? `/cases/${id}` : '/cases'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to case
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Evidence</h1>
          {caseQuery.data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {caseQuery.data.caseCode} · {caseQuery.data.title}
            </p>
          )}
        </div>
        {!caseQuery.data?.archived && (
          <RoleGate roles={['ADMIN', 'DETECTIVE']}>
            <Button asChild>
              <Link to={`/cases/${id}/evidence/new`}>
                <Plus className="mr-2 h-4 w-4" /> Register evidence
              </Link>
            </Button>
          </RoleGate>
        )}
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
          <EvidenceList
            rows={query.data?.data}
            isLoading={query.isLoading}
            emptyHint="Register the first piece of evidence for this case."
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
