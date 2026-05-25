import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLES, type Role } from '@/auth/permissions';
import {
  CreateUserSchema,
  UpdateUserSchema,
  type CreateUserFormValues,
} from '@/services/users/users.schemas';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
} from '@/services/users/users.queries';
import type { User } from '@/services/users/users.types';
import { isNormalizedApiError } from '@/services/http/errors';

type Mode = 'create' | 'edit';

interface UserFormProps {
  mode: Mode;
  initial?: User;
}

// Map NestJS validation error field tokens onto our form field names.
// NestJS messages arrive as `"<field> <constraint>"`; field names mostly match.
const KNOWN_FIELDS = new Set([
  'keycloakUserId',
  'firstNames',
  'lastNames',
  'document',
  'birthDate',
  'role',
  'jobTitle',
]);

export function UserForm({ mode, initial }: UserFormProps) {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createMut = useCreateUserMutation();
  const updateMut = useUpdateUserMutation(initial?.id ?? '');

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(mode === 'create' ? CreateUserSchema : UpdateUserSchema) as never,
    defaultValues: {
      keycloakUserId: initial?.keycloakUserId ?? '',
      firstNames: initial?.firstNames ?? '',
      lastNames: initial?.lastNames ?? '',
      document: initial?.document ?? '',
      birthDate: initial?.birthDate ?? '',
      role: (initial?.role ?? 'DETECTIVE') as Role,
      jobTitle: initial?.jobTitle ?? '',
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        const payload = {
          keycloakUserId: values.keycloakUserId,
          firstNames: values.firstNames,
          lastNames: values.lastNames,
          document: values.document,
          role: values.role,
          ...(values.birthDate ? { birthDate: values.birthDate } : {}),
          ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
        };
        const created = await createMut.mutateAsync(payload);
        toast.success('User created');
        navigate(`/users/${created.id}`, { replace: true });
      } else if (initial) {
        const payload = {
          firstNames: values.firstNames,
          lastNames: values.lastNames,
          document: values.document,
          role: values.role,
          ...(values.birthDate ? { birthDate: values.birthDate } : {}),
          ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
        };
        await updateMut.mutateAsync(payload);
        toast.success('User updated');
      }
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setSubmitError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 400 && err.fieldErrors) {
        let mapped = 0;
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (KNOWN_FIELDS.has(field)) {
            form.setError(field as Path<CreateUserFormValues>, {
              type: 'server',
              message: messages[0] ?? 'Invalid value',
            });
            mapped += 1;
          }
        }
        if (mapped === 0) {
          setSubmitError(err.message || 'Validation failed.');
        }
        return;
      }
      if (err.status === 409) {
        const msg = err.message || 'Conflict';
        // Server returns "Document already registered" or "Keycloak user ID already registered".
        if (/document/i.test(msg)) {
          form.setError('document', { type: 'server', message: msg });
        } else if (/keycloak/i.test(msg)) {
          form.setError('keycloakUserId', { type: 'server', message: msg });
        } else {
          setSubmitError(msg);
        }
        return;
      }
      if (err.status === 404) {
        setSubmitError('User no longer exists.');
        return;
      }
      setSubmitError(err.message);
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'New user' : 'Edit user'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="keycloakUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keycloak user ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={mode === 'edit'}
                      placeholder="Keycloak sub UUID"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First names</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="given-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last names</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="family-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job title</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {submitError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {submitError}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/users')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
