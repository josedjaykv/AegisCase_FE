import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { InvolvementType } from '@/services/involved/involved.types';

// Tones from docs/design-system.md §2 InvolvementType mapping.
const TONE: Record<InvolvementType, BadgeProps['tone']> = {
  VICTIM: 'info',
  SUSPECT: 'destructive',
  WITNESS: 'warning',
  OTHER: 'neutral',
};

export function InvolvementBadge({ type }: { type: InvolvementType }) {
  return <Badge tone={TONE[type]}>{type}</Badge>;
}
