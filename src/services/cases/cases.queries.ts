import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { casesApi } from './cases.api';
import { casesQueryKeys } from './cases.queryKeys';
import type {
  AddTeamMemberInput,
  Case,
  CasesListParams,
  ChangeStatusInput,
  CreateCaseInput,
  TeamRole,
  UpdateCaseInput,
} from './cases.types';

const ONE_MIN = 1000 * 60;
const FIVE_MIN = ONE_MIN * 5;
const THIRTY_SEC = 1000 * 30;

export function useCasesListQuery(params: CasesListParams) {
  return useQuery({
    queryKey: casesQueryKeys.list(params),
    queryFn: () => casesApi.list(params),
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
    placeholderData: keepPreviousData,
  });
}

export function useCaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: casesQueryKeys.detail(id ?? ''),
    queryFn: () => casesApi.getById(id as string),
    enabled: !!id,
    staleTime: THIRTY_SEC,
    gcTime: FIVE_MIN,
    // Poll while the detail route is active and the tab is visible.
    refetchInterval: ONE_MIN,
    refetchIntervalInBackground: false,
  });
}

/**
 * Resolve a batch of case ids into their summaries (code, title, status…),
 * reusing the per-case detail cache. Returns a `summary(id)` lookup that is
 * `null` until the case loads — callers should fall back to the id meanwhile.
 * Used to render case titles where only a caseId is available (e.g. a
 * person's linked-cases list).
 */
export function useCaseSummaries(caseIds: string[]) {
  const unique = useMemo(
    () => Array.from(new Set(caseIds.filter(Boolean))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseIds.join('|')],
  );

  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: casesQueryKeys.detail(id),
      queryFn: () => casesApi.getById(id),
      staleTime: THIRTY_SEC,
      gcTime: FIVE_MIN,
    })),
  });

  const byId = useMemo(() => {
    const m = new Map<string, Case>();
    results.forEach((r, i) => {
      const id = unique[i];
      if (id && r.data) m.set(id, r.data);
    });
    return m;
  }, [results, unique]);

  return { summary: (id: string): Case | null => byId.get(id) ?? null };
}

export function useCaseTeamQuery(id: string | undefined) {
  return useQuery({
    queryKey: casesQueryKeys.team(id ?? ''),
    queryFn: () => casesApi.getTeam(id as string),
    enabled: !!id,
    staleTime: THIRTY_SEC,
    gcTime: FIVE_MIN,
  });
}

export function useCreateCaseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaseInput) => casesApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.lists() });
      qc.setQueryData(casesQueryKeys.detail(created.id), created);
    },
  });
}

export function useUpdateCaseMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCaseInput) => casesApi.update(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.lists() });
      qc.setQueryData(casesQueryKeys.detail(id), updated);
    },
  });
}

export function useChangeCaseStatusMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeStatusInput) => casesApi.changeStatus(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.lists() });
      qc.setQueryData(casesQueryKeys.detail(id), updated);
    },
  });
}

export function useArchiveCaseMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => casesApi.archive(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.lists() });
      qc.setQueryData(casesQueryKeys.detail(id), updated);
    },
  });
}

export function useAddTeamMemberMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTeamMemberInput) => casesApi.addTeamMember(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.team(id) });
      qc.invalidateQueries({ queryKey: casesQueryKeys.detail(id) });
    },
  });
}

export function useUpdateTeamMemberRoleMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, teamRole }: { userId: string; teamRole: TeamRole }) =>
      casesApi.updateTeamMemberRole(id, userId, teamRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: casesQueryKeys.team(id) });
      qc.invalidateQueries({ queryKey: casesQueryKeys.detail(id) });
    },
  });
}
