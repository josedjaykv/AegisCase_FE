import { Badge } from '@/components/ui/badge';
import type { Role } from '@/auth/permissions';

const TONE: Record<Role, 'primary' | 'info' | 'neutral'> = {
  ADMIN: 'primary',
  DETECTIVE: 'info',
  ANALYST: 'neutral',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={TONE[role]}>{role}</Badge>;
}
