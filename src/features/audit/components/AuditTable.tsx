import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/EmptyState';
import { History } from 'lucide-react';
import { formatDateTime, relativeTime } from '@/lib/date';
import type { AuditRecord } from '@/services/audit/audit.types';
import { entityLink, entityTypeLabel } from '../auditCatalog';
import { AuditActionBadge } from './AuditActionBadge';
import { ActorLabel } from './ActorLabel';
import { AuditDetailDialog } from './AuditDetailDialog';

const EMPTY = <EmptyState Icon={History} title="No audit records" description="Adjust the filters or generate some activity." />;

function EntityCell({ record }: { record: AuditRecord }) {
  const to = entityLink(record.entityType, record.entityId);
  const label = (
    <span>
      <span className="text-foreground">{entityTypeLabel(record.entityType)}</span>{' '}
      <span className="font-mono text-xs text-muted-foreground">{record.entityId.slice(0, 8)}…</span>
    </span>
  );
  if (!to) return label;
  return (
    <Link to={to} className="hover:underline" onClick={(e) => e.stopPropagation()}>
      {label}
    </Link>
  );
}

/** Desktop table + mobile card list, sharing one detail dialog. */
export function AuditTable({
  records,
  isLoading,
}: {
  records: AuditRecord[] | undefined;
  isLoading?: boolean;
}) {
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  const columns: ColumnDef<AuditRecord, unknown>[] = [
    {
      header: 'Time',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatDateTime(row.original.createdAt)}>
          {relativeTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }) => <AuditActionBadge action={row.original.action} />,
    },
    {
      header: 'Entity',
      accessorKey: 'entityType',
      cell: ({ row }) => <EntityCell record={row.original} />,
    },
    {
      header: 'Actor',
      accessorKey: 'userId',
      cell: ({ row }) => <ActorLabel userId={row.original.userId} className="text-sm" />,
    },
  ];

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={records}
          isLoading={isLoading}
          emptyState={EMPTY}
          onRowClick={(r) => setSelected(r)}
          rowClassName={() => 'cursor-pointer text-sm'}
        />
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading && !records ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : !records || records.length === 0 ? (
          EMPTY
        ) : (
          records.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AuditActionBadge action={r.action} />
                <span className="text-xs text-muted-foreground" title={formatDateTime(r.createdAt)}>
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>
                  <span className="text-muted-foreground">Entity: </span>
                  {entityTypeLabel(r.entityType)}
                </span>
                <ActorLabel userId={r.userId} className="text-foreground" />
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <AuditDetailDialog
          record={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </>
  );
}
