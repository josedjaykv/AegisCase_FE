import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { z } from 'zod';
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
  useCreateUserMutation,
  useUpdateUserMutation,
} from '@/services/users/users.queries';
import type { User } from '@/services/users/users.types';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';
import { KeycloakUserPicker } from './KeycloakUserPicker';
import { RoleBadge } from './RoleBadge';

type Mode = 'create' | 'edit';

interface UserFormProps {
  mode: Mode;
  initial?: User;
}

/**
 * Operational fields are the only ones the FE may author. `firstNames`,
 * `lastNames`, `role`, `keycloakUserId` come from Keycloak (see
 * docs/architecture/architecture.md §4.7).
 */
const OperationalSchema = z.object({
  document: z.string().min(1, 'Document is required'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  jobTitle: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
type OperationalValues = z.infer<typeof OperationalSchema>;

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
  if (mode === 'create') return <CreateUserForm />;
  if (!initial) return null;
  return <EditUserForm initial={initial} />;
}

// ---------- Create ----------

function CreateUserForm() {
  const navigate = useNavigate();
  const createMut = useCreateUserMutation();
  const [selected, setSelected] = useState<KeycloakUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OperationalValues>({
    resolver: zodResolver(OperationalSchema) as never,
    defaultValues: { document: '', birthDate: '', jobTitle: '' },
  });

  const canSubmit = !!selected && !!selected.role && !form.formState.isSubmitting;

  const onSubmit = async (values: OperationalValues) => {
    setSubmitError(null);
    if (!selected) {
      setSubmitError('Pick a Keycloak user first.');
      return;
    }
    if (!selected.role) {
      setSubmitError(
        'This Keycloak user has no app role assigned. Assign one of ADMIN/DETECTIVE/ANALYST in Keycloak first.',
      );
      return;
    }
    try {
      const payload = {
        keycloakUserId: selected.sub,
        firstNames: selected.firstName,
        lastNames: selected.lastName,
        document: values.document,
        role: selected.role,
        ...(values.birthDate ? { birthDate: values.birthDate } : {}),
        ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
      };
      const created = await createMut.mutateAsync(payload);
      toast.success('User created');
      navigate(`/users/${created.id}`, { replace: true });
    } catch (err) {
      handleMutationError(err, form, setSubmitError);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>New user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KeycloakNote mode="create" />

            <div className="space-y-2">
              <p className="text-sm font-medium">Keycloak user</p>
              <KeycloakUserPicker value={selected} onChange={setSelected} />
              {selected && !selected.role && (
                <p className="text-xs text-warning">
                  This Keycloak user has no app role (ADMIN / DETECTIVE / ANALYST). Assign one
                  in Keycloak before continuing.
                </p>
              )}
            </div>

            <fieldset
              className="space-y-4 border-t border-border pt-4"
              disabled={!selected}
            >
              <legend className="sr-only">Operational profile</legend>

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
            </fieldset>

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
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {form.formState.isSubmitting ? 'Saving…' : 'Create user'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

// ---------- Edit ----------

function EditUserForm({ initial }: { initial: User }) {
  const navigate = useNavigate();
  const updateMut = useUpdateUserMutation(initial.id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OperationalValues>({
    resolver: zodResolver(OperationalSchema) as never,
    defaultValues: {
      document: initial.document,
      birthDate: initial.birthDate ?? '',
      jobTitle: initial.jobTitle ?? '',
    },
  });

  const onSubmit = async (values: OperationalValues) => {
    setSubmitError(null);
    try {
      const payload = {
        document: values.document,
        ...(values.birthDate ? { birthDate: values.birthDate } : {}),
        ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
      };
      await updateMut.mutateAsync(payload);
      toast.success('User updated');
    } catch (err) {
      handleMutationError(err, form, setSubmitError);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KeycloakNote mode="edit" />

            <ReadOnlyKeycloakSummary
              firstNames={initial.firstNames}
              lastNames={initial.lastNames}
              keycloakUserId={initial.keycloakUserId}
              role={initial.role}
            />

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
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

// ---------- Shared bits ----------

function KeycloakNote({ mode }: { mode: Mode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-foreground"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <p>
        <span className="font-medium">Keycloak owns identity.</span>{' '}
        {mode === 'create'
          ? 'Identity (name / role / sub) is pulled from Keycloak when you pick a user below; only Document, Birth date and Job title are entered here.'
          : 'First names, last names, role and Keycloak user ID are managed in Keycloak and cannot be edited here. Update them in Keycloak; this profile will be re-synced.'}
      </p>
    </div>
  );
}

function ReadOnlyKeycloakSummary(props: {
  firstNames: string;
  lastNames: string;
  keycloakUserId: string;
  role: User['role'];
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2">
      <SummaryRow label="First names" value={props.firstNames} />
      <SummaryRow label="Last names" value={props.lastNames} />
      <SummaryRow
        label="Role"
        value={<RoleBadge role={props.role} />}
      />
      <SummaryRow
        label="Keycloak user ID"
        value={<span className="font-mono text-[11px]">{props.keycloakUserId}</span>}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function handleMutationError(
  err: unknown,
  form: ReturnType<typeof useForm<OperationalValues>>,
  setSubmitError: (msg: string | null) => void,
) {
  if (!isNormalizedApiError(err)) {
    setSubmitError('Unexpected error. Try again.');
    return;
  }
  if (err.status === 400 && err.fieldErrors) {
    let mapped = 0;
    for (const [field, messages] of Object.entries(err.fieldErrors)) {
      if (KNOWN_FIELDS.has(field) && (field === 'document' || field === 'birthDate' || field === 'jobTitle')) {
        form.setError(field as Path<OperationalValues>, {
          type: 'server',
          message: messages[0] ?? 'Invalid value',
        });
        mapped += 1;
      }
    }
    if (mapped === 0) setSubmitError(err.message || 'Validation failed.');
    return;
  }
  if (err.status === 409) {
    const msg = err.message || 'Conflict';
    if (/document/i.test(msg)) {
      form.setError('document', { type: 'server', message: msg });
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
