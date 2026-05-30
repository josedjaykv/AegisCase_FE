import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Paginated } from '@/types/api';
import { tasksApi } from './tasks.api';
import { tasksQueryKeys } from './tasks.queryKeys';
import type {
  ChangeTaskStatusInput,
  CreateTaskInput,
  Task,
  TasksListParams,
  UpdateTaskInput,
} from './tasks.types';

const THIRTY_SEC = 1000 * 30;
const FIVE_MIN = 1000 * 60 * 5;

interface ListOptions {
  /** Poll every 30 s while the tab is visible (drives the OVERDUE sweep). */
  poll?: boolean;
}

export function useTasksListQuery(params: TasksListParams, options: ListOptions = {}) {
  return useQuery({
    queryKey: tasksQueryKeys.list(params),
    queryFn: () => tasksApi.list(params),
    staleTime: 0,
    gcTime: FIVE_MIN,
    placeholderData: keepPreviousData,
    ...(options.poll
      ? { refetchInterval: THIRTY_SEC, refetchIntervalInBackground: false }
      : {}),
  });
}

export function useTaskQuery(id: string | undefined, options: ListOptions = {}) {
  return useQuery({
    queryKey: tasksQueryKeys.detail(id ?? ''),
    queryFn: () => tasksApi.getById(id as string),
    enabled: !!id,
    staleTime: 0,
    gcTime: FIVE_MIN,
    ...(options.poll
      ? { refetchInterval: 1000 * 60, refetchIntervalInBackground: false }
      : {}),
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: tasksQueryKeys.lists() });
      qc.setQueryData(tasksQueryKeys.detail(created.id), created);
    },
  });
}

export function useUpdateTaskMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => tasksApi.update(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: tasksQueryKeys.lists() });
      qc.setQueryData(tasksQueryKeys.detail(id), updated);
    },
  });
}

/**
 * Optimistic status change — the kanban card / picker reflects the new status
 * immediately and rolls back on failure. Patches every cached task list so the
 * card reflows columns without waiting for the refetch.
 */
export function useChangeTaskStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string } & ChangeTaskStatusInput) =>
      tasksApi.changeStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: tasksQueryKeys.lists() });
      const snapshots = qc.getQueriesData<Paginated<Task>>({ queryKey: tasksQueryKeys.lists() });
      for (const [key, page] of snapshots) {
        if (!page) continue;
        qc.setQueryData(key, {
          ...page,
          data: page.data.map((t) => (t.id === id ? { ...t, status } : t)),
        });
      }
      const prevDetail = qc.getQueryData<Task>(tasksQueryKeys.detail(id));
      if (prevDetail) {
        qc.setQueryData(tasksQueryKeys.detail(id), { ...prevDetail, status });
      }
      return { snapshots, prevDetail, id };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, page]) => qc.setQueryData(key, page));
      if (ctx?.prevDetail && ctx.id) qc.setQueryData(tasksQueryKeys.detail(ctx.id), ctx.prevDetail);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: tasksQueryKeys.lists() });
      qc.invalidateQueries({ queryKey: tasksQueryKeys.detail(id) });
    },
  });
}
