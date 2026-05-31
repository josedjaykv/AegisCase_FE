/**
 * Audit entity types are PascalCase singular on the wire — NOT the media enums.
 * See BACKEND_INVESTIGATION_REPORT.md §3.10 / §7.2.
 */
export const AUDIT_ENTITY_TYPES = [
  'Case',
  'Evidence',
  'Task',
  'InvolvedPerson',
  'Media',
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** The full action catalog (event_type → action map, §3.10). These are the `action` filter values. */
export const AUDIT_ACTIONS = [
  'CASE_CREATED',
  'CASE_UPDATED',
  'CASE_CLOSED',
  'CASE_ARCHIVED',
  'INVOLVED_PERSON_LINKED',
  'EVIDENCE_ADDED',
  'EVIDENCE_CUSTODY_TRANSFERRED',
  'EVIDENCE_ARCHIVED',
  'TASK_ASSIGNED',
  'TASK_COMPLETED',
  'TASK_OVERDUE',
  'MEDIA_UPLOADED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** The BaseEvent envelope stored under `eventPayload` (§7.2). */
export interface AuditEventPayload {
  event_id: string;
  event_type: string;
  occurred_at: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
}

/** A single audit record (camelCase on read, §5.9 sample row). */
export interface AuditRecord {
  id: string;
  eventId: string;
  /** Keycloak sub of the actor, or the literal "system" for task.overdue events. */
  userId: string;
  /** One of AUDIT_ACTIONS — typed loosely since the backend owns the catalog. */
  action: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  eventPayload?: AuditEventPayload | null;
  createdAt: string;
}

/** Camelcase query the app uses; mapped to snake_case at the network boundary. */
export interface AuditQuery {
  page: number;
  limit: number;
  entityType?: string | undefined;
  entityId?: string | undefined;
  userId?: string | undefined;
  action?: string | undefined;
  /** `YYYY-MM-DD` or full ISO. */
  fromDate?: string | undefined;
  toDate?: string | undefined;
}

export interface AuditListResponse {
  data: AuditRecord[];
  total: number;
  page: number;
  limit: number;
}

/** Per-entity endpoint returns chronological data with no page/limit. */
export interface AuditEntityResponse {
  data: AuditRecord[];
  total: number;
}
