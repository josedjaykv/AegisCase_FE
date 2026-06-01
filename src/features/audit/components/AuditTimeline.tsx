import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/EmptyState';
import { History } from 'lucide-react';
import { formatDateTime, relativeTime } from '@/lib/date';
import type { AuditRecord } from '@/services/audit/audit.types';
import { AuditActionBadge } from './AuditActionBadge';
import { ActorLabel } from './ActorLabel';

/** Vertical chronological timeline for an entity's audit history. */
export function AuditTimeline({
  records,
  isLoading,
}: {
  records: AuditRecord[] | undefined;
  isLoading?: boolean;
}) {
  if (isLoading && !records) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!records || records.length === 0) {
    return <EmptyState Icon={History} title="No activity yet" />;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {records.map((r) => (
        <AuditTimelineNode key={r.id} record={r} />
      ))}
    </ol>
  );
}

function AuditTimelineNode({ record }: { record: AuditRecord }) {
  const [open, setOpen] = useState(false);
  const details = record.newState ?? record.previousState ?? record.eventPayload?.payload ?? null;
  const hasDetails = !!details && Object.keys(details).length > 0;

  return (
    <li className="relative">
      <span
        className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border border-border bg-card"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2">
        <AuditActionBadge action={record.action} />
        <ActorLabel userId={record.userId} className="text-sm text-foreground" />
        <span className="text-xs text-muted-foreground" title={formatDateTime(record.createdAt)}>
          {relativeTime(record.createdAt)}
        </span>
      </div>

      {hasDetails && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {open ? 'Hide details' : 'Show details'}
          </button>
          {open && (
            <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs scrollbar-thin">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}
