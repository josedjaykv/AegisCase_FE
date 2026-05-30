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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeycloakUserPicker } from '@/features/users/components/KeycloakUserPicker';
import {
  useCreateEvidenceMutation,
  useUpdateEvidenceMutation,
} from '@/services/evidence/evidence.queries';
import { EVIDENCE_TYPES, type Evidence } from '@/services/evidence/evidence.types';
import {
  CreateEvidenceSchema,
  type CreateEvidenceFormValues,
} from '@/services/evidence/evidence.schemas';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface EvidenceFormProps {
  mode: 'create' | 'edit';
  /** Required in create mode — the case this evidence belongs to. */
  caseId?: string | undefined;
  initial?: Evidence | undefined;
}

export function EvidenceForm({ mode, caseId, initial }: EvidenceFormProps) {
  const navigate = useNavigate();
  const createMut = useCreateEvidenceMutation();
  const updateMut = useUpdateEvidenceMutation(initial?.id ?? '');
  const [custodian, setCustodian] = useState<KeycloakUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateEvidenceFormValues>({
    resolver: zodResolver(CreateEvidenceSchema) as never,
    defaultValues: {
      evidenceType: initial?.evidenceType ?? 'PHYSICAL',
      description: initial?.description ?? '',
    },
  });

  const backTo =
    mode === 'edit' && initial
      ? `/evidence/${initial.id}`
      : caseId
        ? `/cases/${caseId}/evidence`
        : '/evidence';

  const onSubmit = async (values: CreateEvidenceFormValues) => {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        if (!caseId) {
          setSubmitError('Missing case context.');
          return;
        }
        const created = await createMut.mutateAsync({
          caseId,
          evidenceType: values.evidenceType,
          description: values.description,
          ...(custodian ? { currentCustodianId: custodian.sub } : {}),
        });
        toast.success('Evidence registered');
        navigate(`/cases/${caseId}/evidence`, { replace: true, state: { registeredId: created.id } });
      } else if (initial) {
        const updated = await updateMut.mutateAsync({
          evidenceType: values.evidenceType,
          description: values.description,
        });
        toast.success('Evidence updated');
        navigate(`/evidence/${updated.id}`);
      }
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setSubmitError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 400 && err.fieldErrors) {
        let mapped = 0;
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (field === 'evidenceType' || field === 'description') {
            form.setError(field, { type: 'server', message: messages[0] ?? 'Invalid value' });
            mapped += 1;
          }
        }
        if (mapped === 0) setSubmitError(err.message || 'Validation failed.');
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
            <CardTitle>{mode === 'create' ? 'Register evidence' : 'Edit evidence'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="evidenceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVIDENCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={4}
                      className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="What is this evidence?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'create' && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Initial custodian</p>
                <p className="text-xs text-muted-foreground">
                  Optional — defaults to you if left empty.
                </p>
                <KeycloakUserPicker value={custodian} onChange={setCustodian} mode="assign" />
              </div>
            )}

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
            <Button type="button" variant="outline" onClick={() => navigate(backTo)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Register evidence' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
