import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { evidenceApi } from './evidence.api';
import { evidenceQueryKeys } from './evidence.queryKeys';
import type {
  CreateEvidenceInput,
  Evidence,
  EvidenceListParams,
  TransferCustodyInput,
  UpdateEvidenceInput,
} from './evidence.types';

const THIRTY_SEC = 1000 * 30;
const ONE_MIN = 1000 * 60;
const FIVE_MIN = ONE_MIN * 5;

export function useEvidenceListQuery(params: EvidenceListParams) {
  return useQuery({
    queryKey: evidenceQueryKeys.list(params),
    queryFn: () => evidenceApi.list(params),
    staleTime: THIRTY_SEC,
    gcTime: FIVE_MIN,
    placeholderData: keepPreviousData,
  });
}

/**
 * Read-only chain-of-custody. Safe to auto-fetch — it has NO side effect,
 * unlike GET /evidence/:id. Polls on the detail page while the tab is visible.
 */
export function useEvidenceChainQuery(id: string | undefined) {
  return useQuery({
    queryKey: evidenceQueryKeys.chain(id ?? ''),
    queryFn: () => evidenceApi.getChain(id as string),
    enabled: !!id,
    staleTime: THIRTY_SEC,
    gcTime: FIVE_MIN,
    refetchInterval: ONE_MIN,
    refetchIntervalInBackground: false,
  });
}

/**
 * The side-effecting view. Modeled as a MUTATION on purpose so it can never
 * auto-run from a component render — only an explicit user action (the
 * <EvidenceViewDialog> confirm) may trigger it. On success it seeds the detail
 * cache and refreshes the chain (which the view just appended to).
 */
export function useViewEvidenceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evidenceApi.viewWithSideEffect(id),
    onSuccess: (evidence) => {
      qc.setQueryData(evidenceQueryKeys.detail(evidence.id), evidence);
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.chain(evidence.id) });
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
    },
  });
}

/** The already-viewed detail from cache (seeded by the view mutation). No fetch. */
export function useViewedEvidence(id: string | undefined) {
  return useQuery({
    queryKey: evidenceQueryKeys.detail(id ?? ''),
    // Never fetches: data only ever arrives via useViewEvidenceMutation.
    queryFn: () => Promise.reject(new Error('not viewed')),
    enabled: false,
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
  });
}

/** Read an evidence summary from any cached list, without a network call. */
export function readEvidenceFromCache(qc: QueryClient, id: string): Evidence | undefined {
  const lists = qc.getQueriesData<{ data: Evidence[] }>({ queryKey: evidenceQueryKeys.lists() });
  for (const [, page] of lists) {
    const hit = page?.data.find((e) => e.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useCreateEvidenceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvidenceInput) => evidenceApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
    },
  });
}

export function useUpdateEvidenceMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEvidenceInput) => evidenceApi.update(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
      qc.setQueryData(evidenceQueryKeys.detail(id), updated);
    },
  });
}

export function useTransferCustodyMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferCustodyInput) => evidenceApi.transferCustody(id, input),
    onSuccess: (updated) => {
      qc.setQueryData(evidenceQueryKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.chain(id) });
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
    },
  });
}

/**
 * Take custody of the evidence as the caller (used before downloading a file
 * when not the custodian). Seeds the detail cache and refreshes the chain + lists
 * so the UI immediately reflects the new custodian.
 */
export function useTakeCustodyMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => evidenceApi.takeCustody(id),
    onSuccess: (updated) => {
      qc.setQueryData(evidenceQueryKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.chain(id) });
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
    },
  });
}

export function useArchiveEvidenceMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => evidenceApi.archive(id),
    onSuccess: (updated) => {
      qc.setQueryData(evidenceQueryKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: evidenceQueryKeys.lists() });
    },
  });
}
