import { z } from 'zod';
import { EVIDENCE_TYPES } from './evidence.types';

/**
 * Mirrors evidence-service CreateEvidenceDto:
 *   caseId             @IsUUID()                 → supplied by the case context, not typed
 *   evidenceType       @IsEnum(EvidenceType)     → z.enum
 *   title              @IsString @MaxLength(200) → .min(1).max(200) (required on the FE)
 *   description        @IsString @IsNotEmpty     → .min(1)
 *   currentCustodianId @IsUUID() (optional)      → from <KeycloakUserPicker>, defaults to actor
 */
export const CreateEvidenceSchema = z.object({
  evidenceType: z.enum(EVIDENCE_TYPES),
  title: z.string().min(1, 'Title is required').max(200, 'Keep the title under 200 characters'),
  description: z.string().min(1, 'Description is required'),
});
export type CreateEvidenceFormValues = z.infer<typeof CreateEvidenceSchema>;

export const UpdateEvidenceSchema = z.object({
  evidenceType: z.enum(EVIDENCE_TYPES),
  title: z.string().min(1, 'Title is required').max(200, 'Keep the title under 200 characters'),
  description: z.string().min(1, 'Description is required'),
});
export type UpdateEvidenceFormValues = z.infer<typeof UpdateEvidenceSchema>;
