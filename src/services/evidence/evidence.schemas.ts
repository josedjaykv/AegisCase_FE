import { z } from 'zod';
import { EVIDENCE_TYPES } from './evidence.types';

/**
 * Mirrors evidence-service CreateEvidenceDto:
 *   caseId             @IsUUID()                 → supplied by the case context, not typed
 *   evidenceType       @IsEnum(EvidenceType)     → z.enum
 *   description        @IsString @IsNotEmpty     → .min(1)
 *   currentCustodianId @IsUUID() (optional)      → from <KeycloakUserPicker>, defaults to actor
 */
export const CreateEvidenceSchema = z.object({
  evidenceType: z.enum(EVIDENCE_TYPES),
  description: z.string().min(1, 'Description is required'),
});
export type CreateEvidenceFormValues = z.infer<typeof CreateEvidenceSchema>;

export const UpdateEvidenceSchema = z.object({
  evidenceType: z.enum(EVIDENCE_TYPES),
  description: z.string().min(1, 'Description is required'),
});
export type UpdateEvidenceFormValues = z.infer<typeof UpdateEvidenceSchema>;
