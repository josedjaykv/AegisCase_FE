import type { CasesListParams } from './cases.types';

export const casesQueryKeys = {
  all: ['cases'] as const,
  lists: () => [...casesQueryKeys.all, 'list'] as const,
  list: (params: CasesListParams) => [...casesQueryKeys.lists(), params] as const,
  details: () => [...casesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...casesQueryKeys.details(), id] as const,
  team: (id: string) => [...casesQueryKeys.all, 'team', id] as const,
};
