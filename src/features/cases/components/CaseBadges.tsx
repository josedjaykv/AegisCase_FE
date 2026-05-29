import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import type { CasePriority, CaseStatus } from '@/services/cases/cases.types';

// Tones come straight from docs/design-system.md §2.
const STATUS_TONE: Record<CaseStatus, BadgeProps['tone']> = {
  OPEN: 'info',
  UNDER_INVESTIGATION: 'primary',
  PAUSED: 'neutral',
  CLOSED: 'success',
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: 'Open',
  UNDER_INVESTIGATION: 'Under investigation',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
};

const PRIORITY_TONE: Record<CasePriority, BadgeProps['tone']> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function CasePriorityBadge({ priority }: { priority: CasePriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{priority}</Badge>;
}

export function ArchivedPill() {
  return (
    <Badge tone="outline" className="gap-1">
      <Lock className="h-3 w-3" aria-hidden="true" /> Archived
    </Badge>
  );
}
