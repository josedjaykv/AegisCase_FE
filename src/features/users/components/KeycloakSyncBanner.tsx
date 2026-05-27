import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateUserMutation } from '@/services/users/users.queries';
import { isNormalizedApiError } from '@/services/http/errors';
import type { User } from '@/services/users/users.types';
import type { Role } from '@/auth/permissions';

interface KeycloakSyncBannerProps {
  user: User;
  keycloakRole: Role;
}

/**
 * Shown on the *current user's own* profile when their role in user-service
 * has drifted from what Keycloak reports via /auth/me. Lets the admin pull
 * the Keycloak value down with a single click. See docs/architecture/architecture.md §4.7.
 */
export function KeycloakSyncBanner({ user, keycloakRole }: KeycloakSyncBannerProps) {
  const [syncing, setSyncing] = useState(false);
  const updateMut = useUpdateUserMutation(user.id);

  const onSync = async () => {
    setSyncing(true);
    try {
      await updateMut.mutateAsync({ role: keycloakRole });
      toast.success(`Role synced from Keycloak (${keycloakRole})`);
    } catch (err) {
      const msg =
        isNormalizedApiError(err) ? err.message : 'Sync failed. Try again.';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium text-foreground">Out of sync with Keycloak</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your role here is <span className="font-mono">{user.role}</span> but Keycloak
          reports <span className="font-mono">{keycloakRole}</span>. Pull the Keycloak
          value down to fix the drift.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing…' : 'Sync from Keycloak'}
      </Button>
    </div>
  );
}
