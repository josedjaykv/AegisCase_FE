import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authApi } from '@/services/auth/auth.api';
import {
  LoginSchema,
  type LoginFormValues,
} from '@/services/auth/auth.schemas';
import { useLoginMutation } from '@/services/auth/auth.queries';
import { isNormalizedApiError } from '@/services/http/errors';
import { useAuthStore } from '@/stores/auth.store';

interface LocationState {
  from?: { pathname: string };
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const loginMutation = useLoginMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      const tokens = await loginMutation.mutateAsync(values);
      // Temporarily set tokens so /auth/me request carries Authorization.
      useAuthStore.setState({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
      });
      const user = await authApi.me();
      setSession(tokens, user);
      toast.success(`Welcome, ${user.email}`);
      const dest = (location.state as LocationState | null)?.from?.pathname ?? '/';
      navigate(dest, { replace: true });
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setSubmitError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 401) {
        setSubmitError('Invalid email or password.');
      } else if (err.status === 503) {
        setSubmitError('Authentication service is unavailable. Try again shortly.');
      } else if (err.status === 0) {
        setSubmitError(`Cannot reach the API at ${import.meta.env.VITE_API_BASE_URL}.`);
      } else {
        setSubmitError(err.message);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@aegiscase.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}
