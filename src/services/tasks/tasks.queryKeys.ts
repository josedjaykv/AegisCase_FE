import type { TasksListParams } from './tasks.types';

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksQueryKeys.all, 'list'] as const,
  list: (params: TasksListParams) => [...tasksQueryKeys.lists(), params] as const,
  details: () => [...tasksQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasksQueryKeys.details(), id] as const,
};
