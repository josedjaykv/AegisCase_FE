import {
  Archive,
  CheckCircle2,
  Clock,
  FilePlus2,
  FolderPlus,
  Link2,
  Lock,
  Pencil,
  ShieldAlert,
  Upload,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';

/** Friendly labels for the action catalog (§3.10). */
export const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED: 'Case created',
  CASE_UPDATED: 'Case updated',
  CASE_CLOSED: 'Case closed',
  CASE_ARCHIVED: 'Case archived',
  INVOLVED_PERSON_LINKED: 'Involved person linked',
  EVIDENCE_ADDED: 'Evidence added',
  EVIDENCE_CUSTODY_TRANSFERRED: 'Evidence custody transferred',
  EVIDENCE_ARCHIVED: 'Evidence archived',
  TASK_ASSIGNED: 'Task assigned',
  TASK_COMPLETED: 'Task completed',
  TASK_OVERDUE: 'Task overdue',
  MEDIA_UPLOADED: 'Media uploaded',
};

/** Human label for an action; falls back to the raw string for unknown actions. */
export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** Badge tone per action, using design-system semantic tokens (design-system §2). */
export const ACTION_TONE: Record<string, BadgeProps['tone']> = {
  CASE_CREATED: 'success',
  CASE_UPDATED: 'info',
  CASE_CLOSED: 'success',
  CASE_ARCHIVED: 'neutral',
  INVOLVED_PERSON_LINKED: 'info',
  EVIDENCE_ADDED: 'success',
  EVIDENCE_CUSTODY_TRANSFERRED: 'warning',
  EVIDENCE_ARCHIVED: 'neutral',
  TASK_ASSIGNED: 'info',
  TASK_COMPLETED: 'success',
  TASK_OVERDUE: 'destructive',
  MEDIA_UPLOADED: 'primary',
};

export function actionTone(action: string): BadgeProps['tone'] {
  return ACTION_TONE[action] ?? 'neutral';
}

const ACTION_ICON: Record<string, LucideIcon> = {
  CASE_CREATED: FolderPlus,
  CASE_UPDATED: Pencil,
  CASE_CLOSED: CheckCircle2,
  CASE_ARCHIVED: Lock,
  INVOLVED_PERSON_LINKED: Link2,
  EVIDENCE_ADDED: FilePlus2,
  EVIDENCE_CUSTODY_TRANSFERRED: ShieldAlert,
  EVIDENCE_ARCHIVED: Archive,
  TASK_ASSIGNED: UserPlus,
  TASK_COMPLETED: CheckCircle2,
  TASK_OVERDUE: Clock,
  MEDIA_UPLOADED: Upload,
};

export function actionIcon(action: string): LucideIcon {
  return ACTION_ICON[action] ?? Clock;
}

/** Friendly labels for entity types (audit uses PascalCase singular). */
export const ENTITY_TYPE_LABEL: Record<string, string> = {
  Case: 'Case',
  Evidence: 'Evidence',
  Task: 'Task',
  InvolvedPerson: 'Involved person',
  Media: 'Media',
};

export function entityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABEL[entityType] ?? entityType;
}

/** Overdue (and other system-generated) events use the literal actor "system". */
export function isSystemActor(userId: string | null | undefined): boolean {
  return userId === 'system';
}

/**
 * Map an audit entityType to the FE detail route, when one exists. Media has no
 * standalone detail page, so it returns null.
 */
export function entityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'Case':
      return `/cases/${entityId}`;
    case 'Evidence':
      return `/evidence/${entityId}`;
    case 'Task':
      return `/tasks/${entityId}`;
    case 'InvolvedPerson':
      return `/involved/${entityId}`;
    default:
      return null;
  }
}
