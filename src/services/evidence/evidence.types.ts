export const EVIDENCE_TYPES = [
  'PHYSICAL',
  'DIGITAL',
  'DOCUMENTARY',
  'TESTIMONIAL',
  'OTHER',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_STATUSES = [
  'REGISTERED',
  'IN_CUSTODY',
  'TRANSFERRED',
  'ARCHIVED',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export interface ChainOfCustody {
  id: string;
  evidenceId: string;
  /** Keycloak sub of the previous custodian (null on the initial row). */
  previousCustodianId?: string | null;
  newCustodianId: string;
  transferredByUserId: string;
  transferReason?: string | null;
  createdAt: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  evidenceType: EvidenceType;
  /** Short label, e.g. "Testimonio de Juanito". Nullable for rows created before this field existed. */
  title?: string | null;
  description: string;
  evidenceStatus: EvidenceStatus;
  /** Keycloak sub of the current custodian. */
  currentCustodianId?: string | null;
  createdByUserId: string;
  archived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on GET /evidence/:id (the side-effecting view). */
  custodyChain?: ChainOfCustody[];
}

export interface CreateEvidenceInput {
  caseId: string;
  evidenceType: EvidenceType;
  title: string;
  description: string;
  currentCustodianId?: string;
}

export interface UpdateEvidenceInput {
  evidenceType?: EvidenceType;
  title?: string;
  description?: string;
  evidenceStatus?: EvidenceStatus;
}

export interface TransferCustodyInput {
  newCustodianId: string;
  transferReason?: string;
}

export interface EvidenceListParams {
  page: number;
  limit: number;
  caseId?: string | undefined;
}
