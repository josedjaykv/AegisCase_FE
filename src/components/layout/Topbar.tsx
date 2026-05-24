import { useAuthStore } from '@/stores/auth.store';
import { ROLES, type Role } from '@/auth/permissions';
import { env } from '@/lib/env';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const setPreviewRole = useAuthStore((s) => s.setPreviewRole);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Signed in as{' '}
          <span className="font-semibold text-foreground">{user?.email ?? '—'}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {env.isDev && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Preview role</span>
            <select
              aria-label="Preview role (dev only)"
              value={user?.role ?? 'DETECTIVE'}
              onChange={(e) => setPreviewRole(e.target.value as Role)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
