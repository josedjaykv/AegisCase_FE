import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from './permissions';

interface RoleGateProps {
  roles: readonly Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * UX-only: renders `children` when the current user's role is allowed.
 * Hiding is NOT a security boundary — the backend still enforces.
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
