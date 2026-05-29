import { httpClient } from '@/services/http/client';
import type { Paginated } from '@/types/api';
import type {
  AddTeamMemberInput,
  Case,
  CaseTeamMember,
  CasesListParams,
  ChangeStatusInput,
  CreateCaseInput,
  UpdateCaseInput,
} from './cases.types';

export const casesApi = {
  async list(params: CasesListParams): Promise<Paginated<Case>> {
    const { data } = await httpClient.get<Paginated<Case>>('/cases', {
      params: { page: params.page, limit: params.limit },
    });
    return data;
  },

  async getById(id: string): Promise<Case> {
    const { data } = await httpClient.get<Case>(`/cases/${id}`);
    return data;
  },

  async create(input: CreateCaseInput): Promise<Case> {
    const { data } = await httpClient.post<Case>('/cases', input);
    return data;
  },

  async update(id: string, input: UpdateCaseInput): Promise<Case> {
    const { data } = await httpClient.put<Case>(`/cases/${id}`, input);
    return data;
  },

  async changeStatus(id: string, input: ChangeStatusInput): Promise<Case> {
    const { data } = await httpClient.patch<Case>(`/cases/${id}/status`, input);
    return data;
  },

  async archive(id: string): Promise<Case> {
    const { data } = await httpClient.patch<Case>(`/cases/${id}/archive`);
    return data;
  },

  async getTeam(id: string): Promise<CaseTeamMember[]> {
    const { data } = await httpClient.get<CaseTeamMember[]>(`/cases/${id}/team`);
    return data;
  },

  async addTeamMember(id: string, input: AddTeamMemberInput): Promise<CaseTeamMember> {
    const { data } = await httpClient.post<CaseTeamMember>(`/cases/${id}/team`, input);
    return data;
  },
};
