import { z } from 'zod';
import { INVOLVEMENT_TYPES } from './involved.types';

const optionalString = z
  .string()
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Mirrors involved-service CreateInvolvedPersonDto class-validator decorators:
 *   firstNames   @IsString @IsNotEmpty  → .min(1)
 *   lastNames    @IsString (optional)   → optional
 *   document     @IsString (optional, unique sparse) → optional; 409 inline on conflict
 *   observations @IsString (optional)   → optional
 */
export const CreateInvolvedSchema = z.object({
  firstNames: z.string().min(1, 'First names are required'),
  lastNames: optionalString,
  document: optionalString,
  observations: optionalString,
});
export type CreateInvolvedFormValues = z.infer<typeof CreateInvolvedSchema>;

export const UpdateInvolvedSchema = CreateInvolvedSchema.partial();
export type UpdateInvolvedFormValues = z.infer<typeof UpdateInvolvedSchema>;

export const LinkToCaseSchema = z.object({
  involvementType: z.enum(INVOLVEMENT_TYPES),
  observations: optionalString,
});
export type LinkToCaseFormValues = z.infer<typeof LinkToCaseSchema>;
