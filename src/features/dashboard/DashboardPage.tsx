import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Phase 0 placeholder. Role-specific widgets land in later phases.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Current session</h2>
          <p className="mt-2 text-lg font-semibold text-foreground">{user?.email ?? '—'}</p>
          <div className="mt-3">
            <Badge tone="primary">{user?.role ?? 'NO ROLE'}</Badge>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Auth in Phase 0 is mocked. Use the role switcher in the top bar to preview how the
            sidebar changes per role. Phase 1 wires this to <code>POST /auth/login</code>.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Backend gateway</h2>
          <p className="mt-2 break-all font-mono text-sm">{import.meta.env.VITE_API_BASE_URL}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Set in <code>.env.local</code>. The frontend will start making real calls in Phase 1.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Design system</h2>
          <p className="mt-2 text-sm">
            Open <code>/styleguide</code> (dev-only) to inspect tokens, badges, and typography.
          </p>
        </article>
      </div>
    </section>
  );
}
