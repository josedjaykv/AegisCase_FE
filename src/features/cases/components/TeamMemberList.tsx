import { useMemo } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { CaseTeamMember, TeamRole } from '@/services/cases/cases.types';
import { useDisplayNames } from '@/services/users/users.queries';

const ROLE_TONE: Record<TeamRole, BadgeProps['tone']> = {
  CREATOR: 'primary',
  LEAD: 'info',
  MEMBER: 'neutral',
};

interface TeamMemberListProps {
  members: CaseTeamMember[] | undefined;
  isLoading?: boolean;
}

export function TeamMemberList({ members, isLoading }: TeamMemberListProps) {
  const subs = useMemo(() => members?.map((m) => m.userId) ?? [], [members]);
  const { displayName } = useDisplayNames(subs);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <EmptyState
        Icon={Users}
        title="No team members"
        description="Add a lead or members to this case."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {members.map((m) => {
        const name = displayName(m.userId);
        return (
          <li
            key={`${m.caseId}-${m.userId}`}
            className="flex items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              {name ? (
                <p className="truncate text-sm font-medium text-foreground">{name}</p>
              ) : (
                // Fallback: the sub didn't resolve (e.g. profile not yet
                // provisioned in user-service). Show the raw id so the row
                // never blanks out.
                <p className="truncate font-mono text-xs text-foreground">{m.userId}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Linked {new Date(m.linkedAt).toLocaleDateString()}
              </p>
            </div>
            <Badge tone={ROLE_TONE[m.teamRole]}>{m.teamRole}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
