import { ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring session…
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          <span className="text-xl font-semibold">AegisCase</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <header className="mb-6 space-y-1 text-center">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Keycloak credentials to access the case management workspace.
            </p>
          </header>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access is logged. Unauthorized use is prohibited.
        </p>
      </div>
    </div>
  );
}
