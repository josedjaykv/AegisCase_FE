import { Cog } from 'lucide-react';
import { useDisplayNames } from '@/services/users/users.queries';
import { isSystemActor } from '../auditCatalog';

/**
 * Renders an audit actor: "System" + Cog for system-generated events
 * (userId === "system"), the resolved display name when known, or a short
 * monospace id as a last resort. Never shows a raw UUID for system.
 */
export function ActorLabel({ userId, className }: { userId: string; className?: string }) {
  const system = isSystemActor(userId);
  const { displayName } = useDisplayNames(system ? [] : [userId]);

  if (system) {
    return (
      <span className={className}>
        <Cog className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-muted-foreground" aria-hidden="true" />
        System
      </span>
    );
  }

  const name = displayName(userId);
  if (name) return <span className={className}>{name}</span>;

  return <span className={`font-mono text-xs ${className ?? ''}`}>{userId.slice(0, 8)}…</span>;
}
