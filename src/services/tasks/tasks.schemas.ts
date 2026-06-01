import { z } from 'zod';
import { TASK_PRIORITIES } from './tasks.types';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Mirrors task-service CreateTaskDto:
 *   caseId           @IsUUID()              → from case context
 *   title            @IsString @IsNotEmpty  → .min(1)
 *   description      @IsString (optional)
 *   priority         @IsEnum(TaskPriority)  → z.enum
 *   assignedToUserId @IsUUID()              → from <KeycloakUserPicker>
 *   dueDate          @IsDateString (opt)    → YYYY-MM-DD
 */
export const TaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: isoDate,
});
export type TaskFormValues = z.infer<typeof TaskFormSchema>;
