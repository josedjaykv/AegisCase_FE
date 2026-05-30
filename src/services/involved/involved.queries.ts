import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { involvedApi } from './involved.api';
import { involvedQueryKeys } from './involved.queryKeys';
import type {
  CreateInvolvedPersonInput,
  InvolvedListParams,
  LinkToCaseInput,
  UpdateCaseLinkInput,
  UpdateInvolvedPersonInput,
} from './involved.types';

const ONE_MIN = 1000 * 60;
const FIVE_MIN = ONE_MIN * 5;
const TEN_MIN = ONE_MIN * 10;

export function useInvolvedListQuery(params: InvolvedListParams) {
  return useQuery({
    queryKey: involvedQueryKeys.list(params),
    queryFn: () => involvedApi.list(params),
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    placeholderData: keepPreviousData,
  });
}

export function useInvolvedPersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: involvedQueryKeys.detail(id ?? ''),
    queryFn: () => involvedApi.getById(id as string),
    enabled: !!id,
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
  });
}

export function useInvolvedCasesQuery(id: string | undefined) {
  return useQuery({
    queryKey: involvedQueryKeys.cases(id ?? ''),
    queryFn: () => involvedApi.getCases(id as string),
    enabled: !!id,
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
  });
}

export function useCaseInvolvedQuery(caseId: string | undefined) {
  return useQuery({
    queryKey: involvedQueryKeys.byCase(caseId ?? ''),
    queryFn: () => involvedApi.getByCase(caseId as string),
    enabled: !!caseId,
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
  });
}

export function useCreateInvolvedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvolvedPersonInput) => involvedApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: involvedQueryKeys.lists() });
      qc.setQueryData(involvedQueryKeys.detail(created.id), created);
    },
  });
}

export function useUpdateInvolvedMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInvolvedPersonInput) => involvedApi.update(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: involvedQueryKeys.lists() });
      qc.setQueryData(involvedQueryKeys.detail(id), updated);
    },
  });
}

/**
 * Link mutation that takes the person id in the variables, so it serves both
 * entry points: the person detail page (person fixed) and the case detail
 * Involved tab (person picked in the dialog).
 */
export function useLinkInvolvedMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      personId,
      caseId,
      input,
    }: {
      personId: string;
      caseId: string;
      input: LinkToCaseInput;
    }) => involvedApi.linkToCase(personId, caseId, input),
    onSuccess: (_data, { personId, caseId }) => {
      qc.invalidateQueries({ queryKey: involvedQueryKeys.cases(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.detail(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.byCase(caseId) });
    },
  });
}

/** Edit a link's involvement type / observations. Serves both surfaces. */
export function useUpdateCaseLinkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      personId,
      caseId,
      input,
    }: {
      personId: string;
      caseId: string;
      input: UpdateCaseLinkInput;
    }) => involvedApi.updateLink(personId, caseId, input),
    onSuccess: (_data, { personId, caseId }) => {
      qc.invalidateQueries({ queryKey: involvedQueryKeys.cases(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.detail(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.byCase(caseId) });
    },
  });
}

/** Unlink a person from a case (hard delete of the join row). */
export function useUnlinkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, caseId }: { personId: string; caseId: string }) =>
      involvedApi.unlink(personId, caseId),
    onSuccess: (_data, { personId, caseId }) => {
      qc.invalidateQueries({ queryKey: involvedQueryKeys.cases(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.detail(personId) });
      qc.invalidateQueries({ queryKey: involvedQueryKeys.byCase(caseId) });
    },
  });
}
