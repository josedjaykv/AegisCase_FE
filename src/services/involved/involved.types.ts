export const INVOLVEMENT_TYPES = ['VICTIM', 'SUSPECT', 'WITNESS', 'OTHER'] as const;
export type InvolvementType = (typeof INVOLVEMENT_TYPES)[number];

export interface InvolvedPerson {
  id: string;
  firstNames: string;
  lastNames?: string | null;
  document?: string | null;
  observations?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on GET /involved-persons/:id (findOne). */
  caseLinks?: CaseInvolvedPerson[];
}

export interface CaseInvolvedPerson {
  caseId: string;
  involvedPersonId: string;
  involvementType: InvolvementType;
  observations?: string | null;
}

/** Roster row from GET /involved-persons/by-case/:caseId — person embedded. */
export interface CaseInvolvedPersonWithPerson extends CaseInvolvedPerson {
  person: {
    id: string;
    firstNames: string;
    lastNames?: string | null;
    document?: string | null;
  };
}

export interface UpdateCaseLinkInput {
  involvementType?: InvolvementType;
  observations?: string;
}

export interface CreateInvolvedPersonInput {
  firstNames: string;
  lastNames?: string;
  document?: string;
  observations?: string;
}

export type UpdateInvolvedPersonInput = Partial<CreateInvolvedPersonInput>;

export interface LinkToCaseInput {
  involvementType: InvolvementType;
  observations?: string;
}

export interface InvolvedListParams {
  page: number;
  limit: number;
}
