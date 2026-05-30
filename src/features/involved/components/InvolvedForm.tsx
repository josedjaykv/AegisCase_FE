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
  useCreateInvolvedMutation,
  useUpdateInvolvedMutation,
} from '@/services/involved/involved.queries';
import {
  CreateInvolvedSchema,
  type CreateInvolvedFormValues,
} from '@/services/involved/involved.schemas';
import type { InvolvedPerson } from '@/services/involved/involved.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface InvolvedFormProps {
  mode: 'create' | 'edit';
  initial?: InvolvedPerson;
}

const KNOWN_FIELDS = new Set(['firstNames', 'lastNames', 'document', 'observations']);

export function InvolvedForm({ mode, initial }: InvolvedFormProps) {
  const navigate = useNavigate();
  const createMut = useCreateInvolvedMutation();
  const updateMut = useUpdateInvolvedMutation(initial?.id ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateInvolvedFormValues>({
    resolver: zodResolver(CreateInvolvedSchema) as never,
    defaultValues: {
      firstNames: initial?.firstNames ?? '',
      lastNames: initial?.lastNames ?? '',
      document: initial?.document ?? '',
      observations: initial?.observations ?? '',
    },
  });

  const onSubmit = async (values: CreateInvolvedFormValues) => {
    setSubmitError(null);
    const payload = {
      firstNames: values.firstNames,
      ...(values.lastNames ? { lastNames: values.lastNames } : {}),
      ...(values.document ? { document: values.document } : {}),
      ...(values.observations ? { observations: values.observations } : {}),
    };
    try {
      if (mode === 'create') {
        const created = await createMut.mutateAsync(payload);
        toast.success('Person registered');
        navigate(`/involved/${created.id}`, { replace: true });
      } else if (initial) {
        await updateMut.mutateAsync(payload);
        toast.success('Person updated');
        navigate(`/involved/${initial.id}`);
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
            form.setError(field as Path<CreateInvolvedFormValues>, {
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
        // document is the only unique field → 409 means a document collision.
        form.setError('document', { type: 'server', message: err.message || 'Document already registered' });
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
            <CardTitle>{mode === 'create' ? 'Register person' : 'Edit person'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      <Input {...field} value={field.value ?? ''} autoComplete="family-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observations</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={4}
                      className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Optional notes about this person"
                    />
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
              onClick={() => navigate(mode === 'edit' && initial ? `/involved/${initial.id}` : '/involved')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Register person' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
