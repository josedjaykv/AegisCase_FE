import type { Role } from '@/auth/permissions';
import { TASK_PRIORITIES, type Task, type TaskPriority, type TaskStatus } from '@/services/tasks/tasks.types';

/**
 * Client-side mirror of the backend task rules (server stays authoritative):
 * - COMPLETED and CANCELLED are terminal — no transitions out.
 * - ANALYST may only act on tasks assigned to them.
 * - ANALYST may not move a task to CANCELLED.
 */

export function isTerminal(status: TaskStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

export function isOwnTask(task: Task, userSub: string | undefined): boolean {
  return !!userSub && task.assignedToUserId === userSub;
}

/** Can this actor change this task's status at all (independent of target)? */
export function canActOnTask(task: Task, role: Role | null, userSub: string | undefined): boolean {
  if (isTerminal(task.status)) return false;
  if (role === 'ANALYST') return isOwnTask(task, userSub);
  return role === 'ADMIN' || role === 'DETECTIVE';
}

/** Is moving this task to `target` allowed for this actor? */
export function canTransition(
  task: Task,
  target: TaskStatus,
  role: Role | null,
  userSub: string | undefined,
): boolean {
  if (!canActOnTask(task, role, userSub)) return false;
  if (target === task.status) return false;
  // OVERDUE is system-assigned, never a manual target.
  if (target === 'OVERDUE') return false;
  if (target === 'CANCELLED' && role === 'ANALYST') return false;
  return true;
}

/** Status values an actor may pick for a task (excludes the current + forbidden). */
export function allowedTargets(
  task: Task,
  role: Role | null,
  userSub: string | undefined,
): TaskStatus[] {
  const targets: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  return targets.filter((t) => canTransition(task, t, role, userSub));
}

const PRIORITY_RANK: Record<TaskPriority, number> = TASK_PRIORITIES.reduce(
  (acc, p, i) => ({ ...acc, [p]: i }),
  {} as Record<TaskPriority, number>,
);

/** priority DESC then dueDate ASC (nulls last). */
export function sortTasks(a: Task, b: Task): number {
  const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (byPriority !== 0) return byPriority;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Whole days overdue (positive) for a YYYY-MM-DD due date, else 0. */
export function daysOverdue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}
