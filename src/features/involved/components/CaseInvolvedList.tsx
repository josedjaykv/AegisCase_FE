import { Link } from 'react-router-dom';
import { ExternalLink, UsersRound } from 'lucide-react';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/auth/RoleGate';
import type { CaseInvolvedPersonWithPerson } from '@/services/involved/involved.types';
import { InvolvementBadge } from './InvolvementBadge';
import { LinkActions } from './LinkActions';

interface CaseInvolvedListProps {
  caseId: string;
  rows: CaseInvolvedPersonWithPerson[] | undefined;
  isLoading?: boolean;
  /** Edit/unlink controls only when the case is editable (not archived). */
  manageable?: boolean;
}

export function CaseInvolvedList({ caseId, rows, isLoading, manageable }: CaseInvolvedListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        Icon={UsersRound}
        title="No one linked yet"
        description="Link a registered person to record their involvement in this case."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {rows.map((r) => {
        const name = `${r.person.firstNames} ${r.person.lastNames ?? ''}`.trim();
        return (
          <li
            key={r.involvedPersonId}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/involved/${r.involvedPersonId}`}
                  className="truncate text-sm font-medium text-foreground hover:underline"
                >
                  {name}
                </Link>
                <Link
                  to={`/involved/${r.involvedPersonId}`}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Open person"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {r.person.document && (
                <p className="font-mono text-[11px] text-muted-foreground">{r.person.document}</p>
              )}
              {r.observations && <p className="text-sm text-foreground">{r.observations}</p>}
            </div>

            {manageable ? (
              <RoleGate roles={['ADMIN', 'DETECTIVE']} fallback={<InvolvementBadge type={r.involvementType} />}>
                <LinkActions
                  personId={r.involvedPersonId}
                  caseId={caseId}
                  involvementType={r.involvementType}
                  label={name}
                />
              </RoleGate>
            ) : (
              <InvolvementBadge type={r.involvementType} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
