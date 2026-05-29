export const CASE_STATUSES = ['OPEN', 'UNDER_INVESTIGATION', 'PAUSED', 'CLOSED'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type CasePriority = (typeof CASE_PRIORITIES)[number];

export const TEAM_ROLES = ['CREATOR', 'LEAD', 'MEMBER'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export interface CaseTeamMember {
  caseId: string;
  /** Keycloak `sub` of the team member (logical FK to user-service). */
  userId: string;
  teamRole: TeamRole;
  linkedAt: string;
}

export interface Case {
  id: string;
  caseCode: string;
  title: string;
  description?: string | null;
  priority: CasePriority;
  status: CaseStatus;
  /** Keycloak `sub` of the case leader. */
  leaderUserId: string;
  createdByUserId: string;
  archived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on GET /cases/:id (findOne), never on the list. */
  team?: CaseTeamMember[];
}

export interface CreateCaseInput {
  title: string;
  description?: string;
  priority: CasePriority;
  leaderUserId: string;
}

export type UpdateCaseInput = Partial<CreateCaseInput>;

export interface ChangeStatusInput {
  status: CaseStatus;
}

export interface AddTeamMemberInput {
  userId: string;
  teamRole: TeamRole;
}

export interface CasesListParams {
  page: number;
  limit: number;
}
