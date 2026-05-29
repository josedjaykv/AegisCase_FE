import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGate } from '@/auth/RoleGate';
import { useCaseQuery, useCaseTeamQuery } from '@/services/cases/cases.queries';
import { TeamMemberList } from '../components/TeamMemberList';
import { AddTeamMemberDialog } from '../components/AddTeamMemberDialog';

export function CaseTeamPage() {
  const { id } = useParams<{ id: string }>();
  const caseQuery = useCaseQuery(id);
  const teamQuery = useCaseTeamQuery(id);

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Link
        to={id ? `/cases/${id}` : '/cases'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to case
      </Link>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Team</CardTitle>
            {caseQuery.data && (
              <p className="mt-1 text-sm text-muted-foreground">
                {caseQuery.data.caseCode} · {caseQuery.data.title}
              </p>
            )}
          </div>
          {id && (
            <RoleGate roles={['ADMIN', 'DETECTIVE']}>
              <AddTeamMemberDialog caseId={id} />
            </RoleGate>
          )}
        </CardHeader>
        <CardContent>
          {teamQuery.isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Failed to load the team.
            </div>
          ) : (
            <TeamMemberList members={teamQuery.data} isLoading={teamQuery.isLoading} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
