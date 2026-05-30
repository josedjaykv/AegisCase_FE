export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'OVERDUE',
  'COMPLETED',
  'CANCELLED',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  /** Keycloak sub of the assignee. */
  assignedToUserId: string;
  assignedByUserId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  caseId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedToUserId: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: string;
}

export interface ChangeTaskStatusInput {
  status: TaskStatus;
}

export interface TasksListParams {
  page: number;
  limit: number;
  assignedToUserId?: string | undefined;
  caseId?: string | undefined;
}
