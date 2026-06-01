import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/auth/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useChangeTaskStatusMutation } from '@/services/tasks/tasks.queries';
import type { Task, TaskStatus } from '@/services/tasks/tasks.types';
import { isNormalizedApiError } from '@/services/http/errors';
import { allowedTargets, canActOnTask } from '../taskRules';
import { TaskStatusBadge } from './TaskBadges';

const LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export function TaskStatusPicker({ task }: { task: Task }) {
  const { role } = usePermissions();
  const userSub = useAuthStore((s) => s.user?.sub);
  const mutation = useChangeTaskStatusMutation();

  const targets = allowedTargets(task, role, userSub);

  // Terminal task or actor can't act → show the status as a read-only badge.
  if (!canActOnTask(task, role, userSub) || targets.length === 0) {
    return <TaskStatusBadge status={task.status} />;
  }

  const onChange = async (next: string) => {
    if (next === task.status) return;
    try {
      await mutation.mutateAsync({ id: task.id, status: next as TaskStatus });
      toast.success(`Status changed to ${LABEL[next as TaskStatus]}`);
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
    }
  };

  return (
    <Select value={task.status} onValueChange={onChange} disabled={mutation.isPending}>
      <SelectTrigger className="h-9 w-44" aria-label="Change task status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* Current value first (disabled), then allowed targets. */}
        <SelectItem value={task.status} disabled>
          {LABEL[task.status]}
        </SelectItem>
        {targets.map((s) => (
          <SelectItem key={s} value={s}>
            {LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
