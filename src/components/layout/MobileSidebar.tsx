import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth.store';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const visible = NAV_ITEMS.filter(
    (item) => (!item.devOnly || env.isDev) && role && item.roles.includes(role),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="flex h-14 flex-row items-center gap-2 border-b border-border px-4">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <SheetTitle className="text-base">AegisCase</SheetTitle>
        </SheetHeader>
        <nav className="p-3">
          <ul className="space-y-0.5">
            {visible.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
