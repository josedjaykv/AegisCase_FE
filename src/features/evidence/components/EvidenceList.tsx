import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayNames } from '@/services/users/users.queries';
import type { Evidence } from '@/services/evidence/evidence.types';
import { ArchivedPill, EvidenceStatusBadge, EvidenceTypeBadge } from './EvidenceBadges';
import { EvidenceCard } from './EvidenceCard';

interface EvidenceListProps {
  rows: Evidence[] | undefined;
  isLoading?: boolean | undefined;
  emptyHint?: string | undefined;
}

export function EvidenceList({ rows, isLoading, emptyHint }: EvidenceListProps) {
  const navigate = useNavigate();

  const custodianSubs = useMemo(
    () => (rows ?? []).map((e) => e.currentCustodianId).filter((s): s is string => !!s),
    [rows],
  );
  const { displayName } = useDisplayNames(custodianSubs);

  const columns = useMemo<ColumnDef<Evidence>[]>(
    () => [
      {
        header: 'Type',
        accessorKey: 'evidenceType',
        cell: ({ row }) => <EvidenceTypeBadge type={row.original.evidenceType} />,
      },
      {
        header: 'Description',
        accessorKey: 'description',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 max-w-md text-foreground">{row.original.description}</span>
            {row.original.archived && <ArchivedPill />}
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'evidenceStatus',
        cell: ({ row }) => <EvidenceStatusBadge status={row.original.evidenceStatus} />,
      },
      {
        header: 'Custodian',
        accessorKey: 'currentCustodianId',
        cell: ({ row }) => {
          const sub = row.original.currentCustodianId;
          if (!sub) return <span className="text-xs text-muted-foreground">—</span>;
          const name = displayName(sub);
          return name ? (
            <span className="text-sm">{name}</span>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">{sub}</span>
          );
        },
      },
      {
        header: 'Registered',
        accessorKey: 'createdAt',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [displayName],
  );

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          onRowClick={(e) => navigate(`/evidence/${e.id}`)}
          rowClassName={(e) => (e.archived ? 'opacity-60' : undefined)}
          emptyState={<EmptyState Icon={FileSearch} title="No evidence yet" description={emptyHint} />}
        />
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : rows && rows.length > 0 ? (
          rows.map((e) => (
            <EvidenceCard
              key={e.id}
              evidence={e}
              custodianName={e.currentCustodianId ? displayName(e.currentCustodianId) : null}
            />
          ))
        ) : (
          <EmptyState Icon={FileSearch} title="No evidence yet" description={emptyHint} />
        )}
      </div>
    </>
  );
}
