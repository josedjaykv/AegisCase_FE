import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEvidenceChainQuery } from '@/services/evidence/evidence.queries';
import { CustodyChainTimeline } from '../components/CustodyChainTimeline';

export function EvidenceChainPage() {
  const { id } = useParams<{ id: string }>();
  const chainQuery = useEvidenceChainQuery(id);

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/evidence/${id}` : '/evidence'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to evidence
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Chain of custody</CardTitle>
          <p className="text-sm text-muted-foreground">
            Read-only history, oldest first. Viewing this does not change custody.
          </p>
        </CardHeader>
        <CardContent>
          {chainQuery.isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Failed to load the chain of custody.
            </div>
          ) : (
            <CustodyChainTimeline chain={chainQuery.data} isLoading={chainQuery.isLoading} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
