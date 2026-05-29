import { z } from 'zod';
import { CASE_PRIORITIES } from './cases.types';

/**
 * Mirrors case-service CreateCaseDto class-validator decorators 1:1:
 *   title        @IsString @IsNotEmpty        → .min(1)
 *   description  @IsString (optional)         → optional
 *   priority     @IsEnum(CasePriority)        → z.enum
 *   leaderUserId @IsUUID()                    → .uuid()
 * `leaderUserId` is supplied by <KeycloakUserPicker> (the selected user's sub),
 * never typed by hand.
 */
export const CreateCaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  priority: z.enum(CASE_PRIORITIES),
  leaderUserId: z.string().uuid('Pick a case leader'),
});

export type CreateCaseFormValues = z.infer<typeof CreateCaseSchema>;

export const UpdateCaseSchema = CreateCaseSchema.partial();
export type UpdateCaseFormValues = z.infer<typeof UpdateCaseSchema>;
