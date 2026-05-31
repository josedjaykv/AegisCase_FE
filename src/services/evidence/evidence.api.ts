import { httpClient } from '@/services/http/client';
import type { Paginated } from '@/types/api';
import type {
  ChainOfCustody,
  CreateEvidenceInput,
  Evidence,
  EvidenceListParams,
  TransferCustodyInput,
  UpdateEvidenceInput,
} from './evidence.types';

export const evidenceApi = {
  async list(params: EvidenceListParams): Promise<Paginated<Evidence>> {
    const { data } = await httpClient.get<Paginated<Evidence>>('/evidence', {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.caseId ? { caseId: params.caseId } : {}),
      },
    });
    return data;
  },

  /**
   * ⚠️ SIDE EFFECT: this appends a "Viewed by user" chain-of-custody row and
   * reassigns currentCustodianId to the caller. NEVER call this without
   * explicit user confirmation through <EvidenceViewDialog>. For read-only
   * inspection use getChain() below.
   */
  async viewWithSideEffect(id: string): Promise<Evidence> {
    const { data } = await httpClient.get<Evidence>(`/evidence/${id}`);
    return data;
  },

  /**
   * Read-only single-evidence summary — NO custody side effect (unlike
   * viewWithSideEffect / GET /evidence/:id). Used to populate the detail page on
   * a fresh load / deep-link when no list is cached. Backend: GET /evidence/:id/summary.
   */
  async getSummary(id: string): Promise<Evidence> {
    const { data } = await httpClient.get<Evidence>(`/evidence/${id}/summary`);
    return data;
  },

  async getChain(id: string): Promise<ChainOfCustody[]> {
    const { data } = await httpClient.get<ChainOfCustody[]>(`/evidence/${id}/chain-of-custody`);
    return data;
  },

  async create(input: CreateEvidenceInput): Promise<Evidence> {
    const { data } = await httpClient.post<Evidence>('/evidence', input);
    return data;
  },

  async update(id: string, input: UpdateEvidenceInput): Promise<Evidence> {
    const { data } = await httpClient.put<Evidence>(`/evidence/${id}`, input);
    return data;
  },

  async transferCustody(id: string, input: TransferCustodyInput): Promise<Evidence> {
    const { data } = await httpClient.patch<Evidence>(`/evidence/${id}/transfer-custody`, input);
    return data;
  },

  /**
   * Self-assign custody to the caller (all roles). Used before downloading an
   * evidence file when the caller is not the current custodian. The backend sets
   * the chain-of-custody reason (e.g. "Accessed evidence file").
   */
  async takeCustody(id: string): Promise<Evidence> {
    const { data } = await httpClient.patch<Evidence>(`/evidence/${id}/take-custody`);
    return data;
  },

  async archive(id: string): Promise<Evidence> {
    const { data } = await httpClient.patch<Evidence>(`/evidence/${id}/archive`);
    return data;
  },
};
