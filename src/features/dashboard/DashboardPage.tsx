import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Phase 1 — signed in. Role-specific widgets land in later phases.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Current session</h2>
          <p className="mt-2 text-lg font-semibold text-foreground">{user?.email ?? '—'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="primary">{user?.role ?? 'NO ROLE'}</Badge>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Use the avatar menu in the top bar to sign out. The session is auto-restored on tab
            refresh while the browser tab is open.
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">Backend gateway</h2>
          <p className="mt-2 break-all font-mono text-sm">{import.meta.env.VITE_API_BASE_URL}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Set in <code>.env.local</code>. Token refresh on 401 is transparent.
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
