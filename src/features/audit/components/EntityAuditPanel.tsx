import { useEntityAuditQuery } from '@/services/audit/audit.queries';
import type { AuditEntityType } from '@/services/audit/audit.types';
import { AuditTimeline } from './AuditTimeline';

/**
 * Reusable per-entity activity history. Embedded in the case detail Audit tab
 * and the evidence/task/involved detail "Activity" cards. `entityType` must be
 * the PascalCase audit value (Case | Evidence | Task | InvolvedPerson).
 */
export function EntityAuditPanel({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: string | undefined;
}) {
  const query = useEntityAuditQuery(entityType, entityId);

  if (query.isError) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        Failed to load activity.
      </div>
    );
  }

  return <AuditTimeline records={query.data?.data} isLoading={query.isLoading} />;
}
