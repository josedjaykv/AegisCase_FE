import { httpClient } from '@/services/http/client';
import type { Paginated } from '@/types/api';
import type {
  ChangeTaskStatusInput,
  CreateTaskInput,
  Task,
  TasksListParams,
  UpdateTaskInput,
} from './tasks.types';

export const tasksApi = {
  /** ⚠️ Reading sweeps OVERDUE server-side (emits task.overdue events). */
  async list(params: TasksListParams): Promise<Paginated<Task>> {
    const { data } = await httpClient.get<Paginated<Task>>('/tasks', {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.assignedToUserId ? { assignedToUserId: params.assignedToUserId } : {}),
        ...(params.caseId ? { caseId: params.caseId } : {}),
      },
    });
    return data;
  },

  async getById(id: string): Promise<Task> {
    const { data } = await httpClient.get<Task>(`/tasks/${id}`);
    return data;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const { data } = await httpClient.post<Task>('/tasks', input);
    return data;
  },

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const { data } = await httpClient.put<Task>(`/tasks/${id}`, input);
    return data;
  },

  async changeStatus(id: string, input: ChangeTaskStatusInput): Promise<Task> {
    const { data } = await httpClient.patch<Task>(`/tasks/${id}/status`, input);
    return data;
  },
};
