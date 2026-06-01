import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/date';
import type { AuditRecord } from '@/services/audit/audit.types';
import { entityTypeLabel } from '../auditCatalog';
import { AuditActionBadge } from './AuditActionBadge';
import { ActorLabel } from './ActorLabel';

/** Read-only inspector for a single audit record (state diff + full envelope). */
export function AuditDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AuditRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-2xl flex-col gap-3">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base">Audit record</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AuditActionBadge action={record.action} />
            <ActorLabel userId={record.userId} className="text-sm text-foreground" />
            <span className="text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</span>
          </div>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Entity</dt>
            <dd>{entityTypeLabel(record.entityType)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Entity id</dt>
            <dd className="truncate font-mono text-xs" title={record.entityId}>
              {record.entityId}
            </dd>
          </div>
        </dl>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin">
          <JsonBlock label="Previous state" value={record.previousState} />
          <JsonBlock label="New state" value={record.newState} />
          <JsonBlock label="Event payload" value={record.eventPayload} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs scrollbar-thin">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
