import { useMemo } from 'react';
import { toast } from 'sonner';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import type { CaseTeamMember, TeamRole } from '@/services/cases/cases.types';
import { useDisplayNames } from '@/services/users/users.queries';
import { useUpdateTeamMemberRoleMutation } from '@/services/cases/cases.queries';
import { isNormalizedApiError } from '@/services/http/errors';

const ROLE_TONE: Record<TeamRole, BadgeProps['tone']> = {
  CREATOR: 'primary',
  LEAD: 'info',
  MEMBER: 'neutral',
};

// Only LEAD ↔ MEMBER are assignable; CREATOR is immutable provenance.
const EDITABLE_ROLES: TeamRole[] = ['LEAD', 'MEMBER'];

interface TeamMemberListProps {
  members: CaseTeamMember[] | undefined;
  isLoading?: boolean;
  /** When set, MEMBER/LEAD rows expose an inline role picker. */
  caseId?: string | undefined;
  /** Gate from the parent (role + not-closed + not-archived). */
  editable?: boolean | undefined;
}

export function TeamMemberList({ members, isLoading, caseId, editable }: TeamMemberListProps) {
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

            {editable && caseId && m.teamRole !== 'CREATOR' ? (
              <RolePicker caseId={caseId} member={m} />
            ) : (
              <Badge tone={ROLE_TONE[m.teamRole]}>{m.teamRole}</Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RolePicker({ caseId, member }: { caseId: string; member: CaseTeamMember }) {
  const mutation = useUpdateTeamMemberRoleMutation(caseId);

  const onChange = async (next: string) => {
    if (next === member.teamRole) return;
    try {
      await mutation.mutateAsync({ userId: member.userId, teamRole: next as TeamRole });
      toast.success(`Role changed to ${next}`);
    } catch (err) {
      // 403 is surfaced by the axios interceptor toast.
      if (isNormalizedApiError(err) && err.status !== 403) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Select value={member.teamRole} onValueChange={onChange} disabled={mutation.isPending}>
      <SelectTrigger className="h-8 w-32" aria-label="Change team role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EDITABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
