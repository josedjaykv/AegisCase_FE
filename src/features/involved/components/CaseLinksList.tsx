import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Link2 } from 'lucide-react';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleGate } from '@/auth/RoleGate';
import { useCaseSummaries } from '@/services/cases/cases.queries';
import { CaseStatusBadge } from '@/features/cases/components/CaseBadges';
import type { CaseInvolvedPerson } from '@/services/involved/involved.types';
import { InvolvementBadge } from './InvolvementBadge';
import { LinkActions } from './LinkActions';

interface CaseLinksListProps {
  links: CaseInvolvedPerson[] | undefined;
  isLoading?: boolean;
  /** The person whose links these are — enables edit/unlink. */
  personId?: string | undefined;
  personLabel?: string | undefined;
}

export function CaseLinksList({ links, isLoading, personId, personLabel }: CaseLinksListProps) {
  const caseIds = useMemo(() => links?.map((l) => l.caseId) ?? [], [links]);
  const { summary } = useCaseSummaries(caseIds);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!links || links.length === 0) {
    return (
      <EmptyState
        Icon={Link2}
        title="Not linked to any case"
        description="Link this person to a case to record their involvement."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {links.map((l) => {
        const c = summary(l.caseId);
        return (
        <li
          key={`${l.caseId}-${l.involvedPersonId}`}
          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <Link
              to={`/cases/${l.caseId}`}
              className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              <span className="truncate">{c ? c.title : 'Loading case…'}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {c ? c.caseCode : l.caseId}
              </span>
              {c && <CaseStatusBadge status={c.status} />}
            </div>
            {l.observations && <p className="text-sm text-foreground">{l.observations}</p>}
          </div>

          {personId ? (
            <RoleGate
              roles={['ADMIN', 'DETECTIVE']}
              fallback={<InvolvementBadge type={l.involvementType} />}
            >
              <LinkActions
                personId={personId}
                caseId={l.caseId}
                involvementType={l.involvementType}
                label={personLabel ?? 'this person'}
              />
            </RoleGate>
          ) : (
            <InvolvementBadge type={l.involvementType} />
          )}
        </li>
        );
      })}
    </ul>
  );
}
