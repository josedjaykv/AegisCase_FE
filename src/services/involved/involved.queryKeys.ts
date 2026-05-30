import type { InvolvedListParams } from './involved.types';

export const involvedQueryKeys = {
  all: ['involved'] as const,
  lists: () => [...involvedQueryKeys.all, 'list'] as const,
  list: (params: InvolvedListParams) => [...involvedQueryKeys.lists(), params] as const,
  details: () => [...involvedQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...involvedQueryKeys.details(), id] as const,
  cases: (id: string) => [...involvedQueryKeys.all, 'cases', id] as const,
  /** Roster of persons linked to a case (GET /involved-persons/by-case/:caseId). */
  byCase: (caseId: string) => [...involvedQueryKeys.all, 'by-case', caseId] as const,
};
