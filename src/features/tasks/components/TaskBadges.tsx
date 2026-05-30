import { Badge, type BadgeProps } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '@/services/tasks/tasks.types';

// Tones from docs/design-system.md §2.
const STATUS_TONE: Record<TaskStatus, BadgeProps['tone']> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} className="gap-1">
      {status === 'OVERDUE' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
      {status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_TONE: Record<TaskPriority, BadgeProps['tone']> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{priority}</Badge>;
}
