import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { KeycloakUserPicker } from '@/features/users/components/KeycloakUserPicker';
import {
  useCreateCaseMutation,
  useUpdateCaseMutation,
} from '@/services/cases/cases.queries';
import { CASE_PRIORITIES, type Case } from '@/services/cases/cases.types';
import {
  CreateCaseSchema,
  type CreateCaseFormValues,
} from '@/services/cases/cases.schemas';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface CaseFormProps {
  mode: 'create' | 'edit';
  initial?: Case;
}

export function CaseForm({ mode, initial }: CaseFormProps) {
  const navigate = useNavigate();
  const createMut = useCreateCaseMutation();
  const updateMut = useUpdateCaseMutation(initial?.id ?? '');
  const [leader, setLeader] = useState<KeycloakUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateCaseFormValues>({
    resolver: zodResolver(CreateCaseSchema) as never,
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      priority: initial?.priority ?? 'MEDIUM',
      // For edit we seed the existing leader sub so the field is valid even if
      // the admin doesn't re-pick. For create it's empty until a pick is made.
      leaderUserId: initial?.leaderUserId ?? '',
    },
  });

  // Keep the hidden leaderUserId field in sync with the picker selection.
  const onPickLeader = (next: KeycloakUser | null) => {
    setLeader(next);
    form.setValue('leaderUserId', next?.sub ?? (mode === 'edit' ? (initial?.leaderUserId ?? '') : ''), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: CreateCaseFormValues) => {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        const payload = {
          title: values.title,
          priority: values.priority,
          leaderUserId: values.leaderUserId,
          ...(values.description ? { description: values.description } : {}),
        };
        const created = await createMut.mutateAsync(payload);
        toast.success('Case created');
        navigate(`/cases/${created.id}`, { replace: true });
      } else if (initial) {
        const payload = {
          title: values.title,
          priority: values.priority,
          leaderUserId: values.leaderUserId,
          ...(values.description ? { description: values.description } : {}),
        };
        await updateMut.mutateAsync(payload);
        toast.success('Case updated');
        navigate(`/cases/${initial.id}`);
      }
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setSubmitError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 400 && err.fieldErrors) {
        let mapped = 0;
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (['title', 'description', 'priority', 'leaderUserId'].includes(field)) {
            form.setError(field as keyof CreateCaseFormValues, {
              type: 'server',
              message: messages[0] ?? 'Invalid value',
            });
            mapped += 1;
          }
        }
        if (mapped === 0) setSubmitError(err.message || 'Validation failed.');
        return;
      }
      // 400 business rule e.g. "A closed case cannot be modified".
      setSubmitError(err.message);
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'New case' : 'Edit case'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Robbery at Central Bank" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={4}
                      className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Optional summary of the case"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Select a priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CASE_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
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
              name="leaderUserId"
              render={() => (
                <FormItem>
                  <FormLabel>Case leader</FormLabel>
                  {mode === 'edit' && !leader && (
                    <p className="text-xs text-muted-foreground">
                      Current leader:{' '}
                      <span className="font-mono">{initial?.leaderUserId}</span>. Search to
                      reassign, or leave as is.
                    </p>
                  )}
                  <FormControl>
                    <KeycloakUserPicker value={leader} onChange={onPickLeader} mode="assign" />
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
              onClick={() => navigate(mode === 'edit' && initial ? `/cases/${initial.id}` : '/cases')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create case' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
