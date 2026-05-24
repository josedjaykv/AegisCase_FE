import { useAuthStore } from '@/stores/auth.store';
import { roleCan, type PermissionAction, type Role } from './permissions';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  return {
    role: (user?.role ?? null) as Role | null,
    can: (action: PermissionAction) => roleCan(user?.role, action),
  };
}
