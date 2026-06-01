import { httpClient } from '@/services/http/client';
import type {
  AuditEntityResponse,
  AuditListResponse,
  AuditQuery,
  AuditRecord,
} from './audit.types';

/**
 * ⚠️ Field-casing boundary: the audit query DTO uses snake_case
 * (`entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`, `action`).
 * This mapper is the ONLY place that casing lives — the rest of the app is
 * camelCase. Template: api-integration.md §6.
 */
function toAuditParams(query: AuditQuery): Record<string, string> {
  return {
    page: String(query.page),
    limit: String(query.limit),
    ...(query.entityType ? { entity_type: query.entityType } : {}),
    ...(query.entityId ? { entity_id: query.entityId } : {}),
    ...(query.userId ? { user_id: query.userId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.fromDate ? { from_date: query.fromDate } : {}),
    ...(query.toDate ? { to_date: query.toDate } : {}),
  };
}

export const auditApi = {
  async list(query: AuditQuery): Promise<AuditListResponse> {
    const { data } = await httpClient.get<AuditListResponse>('/audit', {
      params: toAuditParams(query),
    });
    return data;
  },

  /** Chronological (createdAt ASC) replay for one entity. No page/limit envelope. */
  async listByEntity(entityType: string, entityId: string): Promise<AuditEntityResponse> {
    const { data } = await httpClient.get<AuditEntityResponse>(
      `/audit/entity/${entityType}/${entityId}`,
    );
    return data;
  },

  async getById(id: string): Promise<AuditRecord> {
    const { data } = await httpClient.get<AuditRecord>(`/audit/${id}`);
    return data;
  },
};
