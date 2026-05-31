import type { AuditQuery } from './audit.types';

export const auditQueryKeys = {
  all: ['audit'] as const,
  lists: () => [...auditQueryKeys.all, 'list'] as const,
  list: (query: AuditQuery) => [...auditQueryKeys.lists(), query] as const,
  feed: () => [...auditQueryKeys.all, 'feed'] as const,
  entity: (entityType: string, entityId: string) =>
    [...auditQueryKeys.all, 'entity', entityType, entityId] as const,
  detail: (id: string) => [...auditQueryKeys.all, 'detail', id] as const,
};
