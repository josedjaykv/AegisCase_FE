import { httpClient } from '@/services/http/client';
import type { Paginated } from '@/types/api';
import type {
  CaseInvolvedPerson,
  CaseInvolvedPersonWithPerson,
  CreateInvolvedPersonInput,
  InvolvedListParams,
  InvolvedPerson,
  LinkToCaseInput,
  UpdateCaseLinkInput,
  UpdateInvolvedPersonInput,
} from './involved.types';

export const involvedApi = {
  async list(params: InvolvedListParams): Promise<Paginated<InvolvedPerson>> {
    const { data } = await httpClient.get<Paginated<InvolvedPerson>>('/involved-persons', {
      params: { page: params.page, limit: params.limit },
    });
    return data;
  },

  async getById(id: string): Promise<InvolvedPerson> {
    const { data } = await httpClient.get<InvolvedPerson>(`/involved-persons/${id}`);
    return data;
  },

  async create(input: CreateInvolvedPersonInput): Promise<InvolvedPerson> {
    const { data } = await httpClient.post<InvolvedPerson>('/involved-persons', input);
    return data;
  },

  async update(id: string, input: UpdateInvolvedPersonInput): Promise<InvolvedPerson> {
    const { data } = await httpClient.put<InvolvedPerson>(`/involved-persons/${id}`, input);
    return data;
  },

  async getCases(id: string): Promise<CaseInvolvedPerson[]> {
    const { data } = await httpClient.get<CaseInvolvedPerson[]>(`/involved-persons/${id}/cases`);
    return data;
  },

  async linkToCase(
    id: string,
    caseId: string,
    input: LinkToCaseInput,
  ): Promise<CaseInvolvedPerson> {
    const { data } = await httpClient.post<CaseInvolvedPerson>(
      `/involved-persons/${id}/cases/${caseId}`,
      input,
    );
    return data;
  },

  /** Roster of persons linked to a case. Path is by-case/:caseId (not /cases/...). */
  async getByCase(caseId: string): Promise<CaseInvolvedPersonWithPerson[]> {
    const { data } = await httpClient.get<CaseInvolvedPersonWithPerson[]>(
      `/involved-persons/by-case/${caseId}`,
    );
    return data;
  },

  async updateLink(
    id: string,
    caseId: string,
    input: UpdateCaseLinkInput,
  ): Promise<CaseInvolvedPerson> {
    const { data } = await httpClient.patch<CaseInvolvedPerson>(
      `/involved-persons/${id}/cases/${caseId}`,
      input,
    );
    return data;
  },

  async unlink(id: string, caseId: string): Promise<{ success: boolean }> {
    const { data } = await httpClient.delete<{ success: boolean }>(
      `/involved-persons/${id}/cases/${caseId}`,
    );
    return data;
  },
};
