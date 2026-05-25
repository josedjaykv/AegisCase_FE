import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  const visible = NAV_ITEMS.filter(
    (item) => (!item.devOnly || env.isDev) && role && item.roles.includes(role),
  );

  return (
    <aside
      aria-label="Primary"
      className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold">AegisCase</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {visible.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{role ?? 'No role'}</p>
        <p>v0.1.0 · Phase 1</p>
      </div>
    </aside>
  );
}
