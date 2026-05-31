import { Badge } from '@/components/ui/badge';
import { actionIcon, actionLabel, actionTone } from '../auditCatalog';

export function AuditActionBadge({ action }: { action: string }) {
  const Icon = actionIcon(action);
  return (
    <Badge tone={actionTone(action)} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {actionLabel(action)}
    </Badge>
  );
}
