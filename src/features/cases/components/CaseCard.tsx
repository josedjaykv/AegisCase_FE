import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Case } from '@/services/cases/cases.types';
import { ArchivedPill, CasePriorityBadge, CaseStatusBadge } from './CaseBadges';

/**
 * Mobile representation of a case (design-system §11: cards replace the
 * DataTable below `md`). The whole card is the tap target → case detail.
 */
export function CaseCard({ caseItem }: { caseItem: Case }) {
  const c = caseItem;
  return (
    <Link
      to={`/cases/${c.id}`}
      className={cn(
        'block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
        'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        c.archived && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-medium leading-tight text-foreground">{c.title}</h2>
        {c.archived && <ArchivedPill />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CaseStatusBadge status={c.status} />
        <CasePriorityBadge priority={c.priority} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-mono">{c.caseCode}</span>
        {' · '}
        {new Date(c.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
