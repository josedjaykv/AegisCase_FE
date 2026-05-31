import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { relativeTime, formatDateTime } from '@/lib/date';
import { useAuditFeedQuery } from '@/services/audit/audit.queries';
import { AuditActionBadge } from './AuditActionBadge';
import { ActorLabel } from './ActorLabel';

/** Dashboard widget — most recent activity, polling every 30 s. */
export function AuditFeed() {
  const query = useAuditFeedQuery(10);
  const rows = (query.data?.data ?? []).slice(0, 8);

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" /> Recent activity
        </h2>
        <Link to="/audit" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>

      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <AuditActionBadge action={r.action} />
                <span
                  className="ml-auto text-[11px] text-muted-foreground"
                  title={formatDateTime(r.createdAt)}
                >
                  {relativeTime(r.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <ActorLabel userId={r.userId} className="text-foreground" />
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
