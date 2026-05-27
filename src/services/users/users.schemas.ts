import { z } from 'zod';
import { ROLES } from '@/auth/permissions';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const roleEnum = z.enum(ROLES);

export const CreateUserSchema = z.object({
  keycloakUserId: z.string().min(1, 'Keycloak user ID is required'),
  firstNames: z.string().min(1, 'First names are required'),
  lastNames: z.string().min(1, 'Last names are required'),
  document: z.string().min(1, 'Document is required'),
  birthDate: isoDate.optional().or(z.literal('').transform(() => undefined)),
  role: roleEnum,
  jobTitle: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateUserFormValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.omit({ keycloakUserId: true });
export type UpdateUserFormValues = z.infer<typeof UpdateUserSchema>;
