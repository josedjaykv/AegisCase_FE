import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditApi } from './audit.api';
import { auditQueryKeys } from './audit.queryKeys';
import type { AuditQuery } from './audit.types';

const THIRTY_SEC = 1000 * 30;
const ONE_MIN = 1000 * 60;
const FIVE_MIN = ONE_MIN * 5;

/** Global, filterable audit list. staleTime 0 (per api-integration.md §3). */
export function useAuditListQuery(query: AuditQuery) {
  return useQuery({
    queryKey: auditQueryKeys.list(query),
    queryFn: () => auditApi.list(query),
    staleTime: 0,
    gcTime: FIVE_MIN,
    placeholderData: keepPreviousData,
  });
}

/** Per-entity chronological history; polls while the detail tab is visible. */
export function useEntityAuditQuery(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: auditQueryKeys.entity(entityType, entityId ?? ''),
    queryFn: () => auditApi.listByEntity(entityType, entityId as string),
    enabled: !!entityId,
    staleTime: THIRTY_SEC,
    gcTime: FIVE_MIN,
    refetchInterval: ONE_MIN,
    refetchIntervalInBackground: false,
  });
}

/**
 * Dashboard activity feed — latest N, polling every 30 s. A full refetch of the
 * most recent rows is inherently deduped and always reflects current state
 * (simpler than incremental from_date+eventId merging; same visible result).
 */
export function useAuditFeedQuery(limit = 10) {
  return useQuery({
    queryKey: auditQueryKeys.feed(),
    queryFn: () => auditApi.list({ page: 1, limit }),
    staleTime: 0,
    gcTime: FIVE_MIN,
    refetchInterval: THIRTY_SEC,
    refetchIntervalInBackground: false,
  });
}

export function useAuditDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: auditQueryKeys.detail(id ?? ''),
    queryFn: () => auditApi.getById(id as string),
    enabled: !!id,
    staleTime: FIVE_MIN,
    gcTime: FIVE_MIN,
  });
}
