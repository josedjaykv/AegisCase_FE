import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import type { EvidenceStatus } from '@/services/evidence/evidence.types';

// Tones from docs/design-system.md §2 EvidenceStatus mapping.
const STATUS_TONE: Record<EvidenceStatus, BadgeProps['tone']> = {
  REGISTERED: 'info',
  IN_CUSTODY: 'primary',
  TRANSFERRED: 'warning',
  ARCHIVED: 'neutral',
};

const STATUS_LABEL: Record<EvidenceStatus, string> = {
  REGISTERED: 'Registered',
  IN_CUSTODY: 'In custody',
  TRANSFERRED: 'Transferred',
  ARCHIVED: 'Archived',
};

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function EvidenceTypeBadge({ type }: { type: string }) {
  return <Badge tone="outline">{type}</Badge>;
}

export function ArchivedPill() {
  return (
    <Badge tone="outline" className="gap-1">
      <Lock className="h-3 w-3" aria-hidden="true" /> Archived
    </Badge>
  );
}
