import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGate } from '@/auth/RoleGate';
import { usePermissions } from '@/auth/usePermissions';
import { useCaseQuery, useCaseTeamQuery } from '@/services/cases/cases.queries';
import { TeamMemberList } from '../components/TeamMemberList';
import { AddTeamMemberDialog } from '../components/AddTeamMemberDialog';

export function CaseTeamPage() {
  const { id } = useParams<{ id: string }>();
  const caseQuery = useCaseQuery(id);
  const teamQuery = useCaseTeamQuery(id);
  const { can } = usePermissions();

  const c = caseQuery.data;
  // Team composition can't change on a closed or archived case (backend 400s).
  const locked = !c || c.status === 'CLOSED' || c.archived;
  const canManage = can('case.team.updateRole') && !locked;

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
            {c && (
              <p className="mt-1 text-sm text-muted-foreground">
                {c.caseCode} · {c.title}
              </p>
            )}
          </div>
          {id && canManage && (
            <RoleGate roles={['ADMIN', 'DETECTIVE']}>
              <AddTeamMemberDialog caseId={id} />
            </RoleGate>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {c && locked && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              {c.archived
                ? 'This case is archived — the team is read-only.'
                : 'This case is closed — the team is read-only. Reopen it to make changes.'}
            </p>
          )}
          {teamQuery.isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Failed to load the team.
            </div>
          ) : (
            <TeamMemberList
              members={teamQuery.data}
              isLoading={teamQuery.isLoading}
              caseId={id}
              editable={canManage}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
