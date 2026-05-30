import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const open = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);

  const visible = NAV_ITEMS.filter(
    (item) => (!item.devOnly || env.isDev) && role && item.roles.includes(role),
  );

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        open ? 'w-64' : 'w-16',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border',
          open ? 'gap-2 px-4' : 'justify-center px-2',
        )}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {open && <span className="text-base font-semibold">AegisCase</span>}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-3', open ? 'px-3' : 'px-2')}>
        <ul className="space-y-0.5">
          {visible.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                title={open ? undefined : label}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-md py-2 text-sm font-medium transition-colors',
                    open ? 'gap-3 px-3' : 'justify-center px-0',
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {open && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={cn('border-t border-border p-2', open && 'px-3')}>
        <button
          type="button"
          onClick={toggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-pressed={!open}
          className={cn(
            'flex w-full items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            open ? 'gap-3 px-3' : 'justify-center px-0',
          )}
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {open && <span>Collapse</span>}
        </button>
        {open && (
          <p className="mt-2 px-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{role ?? 'No role'}</span> · v0.1.0
          </p>
        )}
      </div>
    </aside>
  );
}
