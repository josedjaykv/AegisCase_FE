import { useMemo } from 'react';
import { ArrowRight, Eye, PackageCheck, Repeat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/EmptyState';
import { useDisplayNames } from '@/services/users/users.queries';
import { relativeTime, formatDateTime } from '@/lib/date';
import type { ChainOfCustody } from '@/services/evidence/evidence.types';

interface CustodyChainTimelineProps {
  chain: ChainOfCustody[] | undefined;
  isLoading?: boolean;
}

export function CustodyChainTimeline({ chain, isLoading }: CustodyChainTimelineProps) {
  const subs = useMemo(() => {
    const s = new Set<string>();
    chain?.forEach((c) => {
      if (c.previousCustodianId) s.add(c.previousCustodianId);
      s.add(c.newCustodianId);
      s.add(c.transferredByUserId);
    });
    return Array.from(s);
  }, [chain]);
  const { displayName } = useDisplayNames(subs);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!chain || chain.length === 0) {
    return <EmptyState Icon={PackageCheck} title="No custody history" />;
  }

  const name = (sub: string) => displayName(sub) ?? sub;

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {chain.map((entry) => {
        const isInitial = !entry.previousCustodianId;
        const isView = entry.transferReason === 'Viewed by user';
        const Icon = isInitial ? PackageCheck : isView ? Eye : Repeat;
        return (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {isInitial ? (
                  <span className="font-medium text-foreground">
                    Registered to {name(entry.newCustodianId)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    {entry.previousCustodianId ? name(entry.previousCustodianId) : '—'}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {name(entry.newCustodianId)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.transferReason ?? 'Custody transfer'} · by {name(entry.transferredByUserId)}
              </p>
              <p className="text-[11px] text-muted-foreground" title={formatDateTime(entry.createdAt)}>
                {relativeTime(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
