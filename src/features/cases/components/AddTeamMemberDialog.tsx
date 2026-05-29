import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeycloakUserPicker } from '@/features/users/components/KeycloakUserPicker';
import { useAddTeamMemberMutation } from '@/services/cases/cases.queries';
import type { TeamRole } from '@/services/cases/cases.types';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';

// CREATOR is assigned automatically by the backend at case creation, so the
// admin/detective can only add LEAD or MEMBER here.
const ASSIGNABLE_ROLES: TeamRole[] = ['LEAD', 'MEMBER'];

export function AddTeamMemberDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [teamRole, setTeamRole] = useState<TeamRole>('MEMBER');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAddTeamMemberMutation(caseId);

  const reset = () => {
    setUser(null);
    setTeamRole('MEMBER');
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (!user) {
      setError('Pick a user first.');
      return;
    }
    try {
      await mutation.mutateAsync({ userId: user.sub, teamRole });
      toast.success(`${user.firstName} ${user.lastName} added to the team`);
      reset();
      setOpen(false);
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 409) {
        setError(err.message || 'User is already a team member.');
        return;
      }
      if (err.status !== 403) setError(err.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Search for an existing app user and assign a team role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">User</p>
            <KeycloakUserPicker value={user} onChange={setUser} mode="assign" />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Team role</p>
            <Select value={teamRole} onValueChange={(v) => setTeamRole(v as TeamRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={mutation.isPending || !user}>
            {mutation.isPending ? 'Adding…' : 'Add member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
