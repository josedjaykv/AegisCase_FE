import { ChevronLeft, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/auth/RoleGate';
import {
  useInvolvedCasesQuery,
  useInvolvedPersonQuery,
} from '@/services/involved/involved.queries';
import { CaseLinksList } from '../components/CaseLinksList';
import { LinkToCaseDialog } from '../components/LinkToCaseDialog';
import { MediaGallery } from '@/features/media/components/MediaGallery';

export function InvolvedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const personQuery = useInvolvedPersonQuery(id);
  const casesQuery = useInvolvedCasesQuery(id);

  if (personQuery.isLoading) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (personQuery.isError || !personQuery.data) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/involved"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to involved persons
        </Link>
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {personQuery.error &&
          typeof personQuery.error === 'object' &&
          'status' in personQuery.error &&
          (personQuery.error as { status: number }).status === 404
            ? 'Person not found.'
            : 'Failed to load person.'}
        </div>
      </section>
    );
  }

  const p = personQuery.data;
  const name = `${p.firstNames} ${p.lastNames ?? ''}`.trim();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/involved"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to involved persons
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{name}</CardTitle>
            {p.document && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">{p.document}</p>
            )}
          </div>
          <RoleGate roles={['ADMIN', 'DETECTIVE']}>
            <Button asChild variant="outline" size="sm">
              <Link to={`/involved/${p.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          </RoleGate>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Observations</p>
            <p className="whitespace-pre-wrap text-foreground">
              {p.observations?.trim() ? p.observations : '—'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Registered {new Date(p.createdAt).toLocaleString()}</span>
            <span>Updated {new Date(p.updatedAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Linked cases</CardTitle>
          {id && (
            <RoleGate roles={['ADMIN', 'DETECTIVE']}>
              <LinkToCaseDialog mode="pick-case" personId={id} />
            </RoleGate>
          )}
        </CardHeader>
        <CardContent>
          {casesQuery.isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Failed to load linked cases.
            </div>
          ) : (
            <CaseLinksList
              links={casesQuery.data}
              isLoading={casesQuery.isLoading}
              personId={id}
              personLabel={name}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Files attached to this person.</p>
        </CardHeader>
        <CardContent>
          <MediaGallery entityType="INVOLVED_PERSON" entityId={p.id} />
        </CardContent>
      </Card>
    </section>
  );
}
