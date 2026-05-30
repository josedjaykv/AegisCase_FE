import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Evidence } from '@/services/evidence/evidence.types';
import { ArchivedPill, EvidenceStatusBadge, EvidenceTypeBadge } from './EvidenceBadges';

interface EvidenceCardProps {
  evidence: Evidence;
  custodianName?: string | null;
}

/** Mobile representation of an evidence item (design-system §11). */
export function EvidenceCard({ evidence: e, custodianName }: EvidenceCardProps) {
  return (
    <Link
      to={`/evidence/${e.id}`}
      className={cn(
        'block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
        'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        e.archived && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {e.description}
        </p>
        {e.archived && <ArchivedPill />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EvidenceTypeBadge type={e.evidenceType} />
        <EvidenceStatusBadge status={e.evidenceStatus} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Custodian: {custodianName ?? (e.currentCustodianId ? '…' : '—')} ·{' '}
        {new Date(e.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
