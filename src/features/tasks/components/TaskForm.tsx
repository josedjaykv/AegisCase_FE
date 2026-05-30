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
import { CaseSelect } from '@/features/cases/components/CaseSelect';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from '@/services/tasks/tasks.queries';
import { TASK_PRIORITIES, type Task } from '@/services/tasks/tasks.types';
import { TaskFormSchema, type TaskFormValues } from '@/services/tasks/tasks.schemas';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface TaskFormProps {
  mode: 'create' | 'edit';
  caseId?: string | undefined;
  initial?: Task | undefined;
}

export function TaskForm({ mode, caseId, initial }: TaskFormProps) {
  const navigate = useNavigate();
  const createMut = useCreateTaskMutation();
  const updateMut = useUpdateTaskMutation(initial?.id ?? '');
  const [assignee, setAssignee] = useState<KeycloakUser | null>(null);
  // When create is opened without a fixed case (global board), the user picks it.
  const [pickedCaseId, setPickedCaseId] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const needsCasePicker = mode === 'create' && !caseId;
  const effectiveCaseId = caseId ?? pickedCaseId;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(TaskFormSchema) as never,
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      priority: initial?.priority ?? 'MEDIUM',
      dueDate: initial?.dueDate ?? '',
    },
  });

  const backTo =
    mode === 'edit' && initial
      ? `/tasks/${initial.id}`
      : caseId
        ? `/cases/${caseId}/tasks`
        : '/tasks';

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);
    try {
      if (mode === 'create') {
        if (!effectiveCaseId) {
          setSubmitError('Pick a case.');
          return;
        }
        if (!assignee) {
          setSubmitError('Pick an assignee.');
          return;
        }
        const created = await createMut.mutateAsync({
          caseId: effectiveCaseId,
          title: values.title,
          priority: values.priority,
          assignedToUserId: assignee.sub,
          ...(values.description ? { description: values.description } : {}),
          ...(values.dueDate ? { dueDate: values.dueDate } : {}),
        });
        toast.success('Task created');
        navigate(`/tasks/${created.id}`, { replace: true });
      } else if (initial) {
        const updated = await updateMut.mutateAsync({
          title: values.title,
          priority: values.priority,
          ...(values.description ? { description: values.description } : {}),
          ...(values.dueDate ? { dueDate: values.dueDate } : {}),
          ...(assignee ? { assignedToUserId: assignee.sub } : {}),
        });
        toast.success('Task updated');
        navigate(`/tasks/${updated.id}`);
      }
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setSubmitError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 400 && err.fieldErrors) {
        let mapped = 0;
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (['title', 'description', 'priority', 'dueDate'].includes(field)) {
            form.setError(field as keyof TaskFormValues, {
              type: 'server',
              message: messages[0] ?? 'Invalid value',
            });
            mapped += 1;
          }
        }
        if (mapped === 0) setSubmitError(err.message || 'Validation failed.');
        return;
      }
      // 400 "Cannot modify a completed/cancelled task" or 403 analyst-not-own.
      setSubmitError(err.message);
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? 'New task' : 'Edit task'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsCasePicker && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Case</p>
                <CaseSelect
                  value={pickedCaseId}
                  onChange={setPickedCaseId}
                  placeholder="Select a case"
                  className="w-full"
                  aria-label="Assign to case"
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Interview eyewitness" />
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
                      rows={3}
                      className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder="Optional details"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Assignee</p>
              {mode === 'edit' && !assignee && (
                <p className="text-xs text-muted-foreground">
                  Current: <span className="font-mono">{initial?.assignedToUserId}</span>. Search to
                  reassign, or leave as is.
                </p>
              )}
              <KeycloakUserPicker value={assignee} onChange={setAssignee} mode="assign" />
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
            <Button type="button" variant="outline" onClick={() => navigate(backTo)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create task' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
