import { ChevronLeft, Pencil, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleGate } from '@/auth/RoleGate';
import { useCaseQuery, useCaseTeamQuery } from '@/services/cases/cases.queries';
import { useCaseInvolvedQuery } from '@/services/involved/involved.queries';
import { useDisplayNames } from '@/services/users/users.queries';
import { LinkToCaseDialog } from '@/features/involved/components/LinkToCaseDialog';
import { CaseInvolvedList } from '@/features/involved/components/CaseInvolvedList';
import { ArchivedPill, CasePriorityBadge, CaseStatusBadge } from '../components/CaseBadges';
import { CaseStatusPicker } from '../components/CaseStatusPicker';
import { ArchiveButton } from '../components/ArchiveButton';
import { TeamMemberList } from '../components/TeamMemberList';

const PLACEHOLDER_TABS = [
  { value: 'evidence', label: 'Evidence', phase: 'Phase 5' },
  { value: 'tasks', label: 'Tasks', phase: 'Phase 6' },
  { value: 'audit', label: 'Audit', phase: 'Phase 8' },
  { value: 'media', label: 'Media', phase: 'Phase 7' },
] as const;

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useCaseQuery(id);
  const teamQuery = useCaseTeamQuery(id);
  const involvedQuery = useCaseInvolvedQuery(id);
  const headerSubs = query.data
    ? [query.data.leaderUserId, query.data.createdByUserId]
    : [];
  const { displayName } = useDisplayNames(headerSubs);

  if (query.isLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (query.isError || !query.data) {
    return (
      <section className="space-y-4">
        <Link
          to="/cases"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to cases
        </Link>
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {query.error &&
          typeof query.error === 'object' &&
          'status' in query.error &&
          (query.error as { status: number }).status === 404
            ? 'Case not found.'
            : 'Failed to load case.'}
        </div>
      </section>
    );
  }

  const c = query.data;
  const editable = !c.archived && c.status !== 'CLOSED';

  return (
    <section className="space-y-6">
      <Link
        to="/cases"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to cases
      </Link>

      {/* Entity header */}
      <header className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{c.caseCode}</span>
            <CaseStatusBadge status={c.status} />
            <CasePriorityBadge priority={c.priority} />
            {c.archived && <ArchivedPill />}
          </div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:max-w-md">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Leader</dt>
              <dd className="truncate">
                {displayName(c.leaderUserId) ?? (
                  <span className="font-mono text-xs">{c.leaderUserId}</span>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Created by</dt>
              <dd className="truncate">
                {displayName(c.createdByUserId) ?? (
                  <span className="font-mono text-xs">{c.createdByUserId}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd>{new Date(c.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Updated</dt>
              <dd>{new Date(c.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusPicker caseItem={c} />
            {editable && (
              <RoleGate roles={['ADMIN', 'DETECTIVE']}>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/cases/${c.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
              </RoleGate>
            )}
            <ArchiveButton caseItem={c} />
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="involved">Involved</TabsTrigger>
          {PLACEHOLDER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {c.description?.trim() ? c.description : 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">Team</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/cases/${c.id}/team`}>
                    <Users className="mr-2 h-4 w-4" /> Manage
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <TeamMemberList members={teamQuery.data} isLoading={teamQuery.isLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="involved">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Involved persons</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  People linked to this case.
                </p>
              </div>
              {!c.archived && (
                <RoleGate roles={['ADMIN', 'DETECTIVE']}>
                  <LinkToCaseDialog
                    mode="pick-person"
                    caseId={c.id}
                    triggerLabel="Link person"
                    excludePersonIds={involvedQuery.data?.map((r) => r.involvedPersonId)}
                  />
                </RoleGate>
              )}
            </CardHeader>
            <CardContent>
              {involvedQuery.isError ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  Failed to load involved persons.
                </div>
              ) : (
                <CaseInvolvedList
                  caseId={c.id}
                  rows={involvedQuery.data}
                  isLoading={involvedQuery.isLoading}
                  manageable={!c.archived}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {PLACEHOLDER_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              {t.label} lands in {t.phase}.
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
