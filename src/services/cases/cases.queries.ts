import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { casesApi } from './cases.api';
import { casesQueryKeys } from './cases.queryKeys';
import type {
  AddTeamMemberInput,
  CasesListParams,
  ChangeStatusInput,
  CreateCaseInput,
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
