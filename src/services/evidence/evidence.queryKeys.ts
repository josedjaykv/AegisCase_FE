import type { EvidenceListParams } from './evidence.types';

export const evidenceQueryKeys = {
  all: ['evidence'] as const,
  lists: () => [...evidenceQueryKeys.all, 'list'] as const,
  list: (params: EvidenceListParams) => [...evidenceQueryKeys.lists(), params] as const,
  details: () => [...evidenceQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...evidenceQueryKeys.details(), id] as const,
  /** Read-only summary (no custody side effect) — distinct from the mutating `detail`. */
  summary: (id: string) => [...evidenceQueryKeys.all, 'summary', id] as const,
  chain: (id: string) => [...evidenceQueryKeys.all, 'chain', id] as const,
};
