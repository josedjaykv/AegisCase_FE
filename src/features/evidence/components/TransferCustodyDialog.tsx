import { useState } from 'react';
import { Repeat } from 'lucide-react';
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
import { KeycloakUserPicker } from '@/features/users/components/KeycloakUserPicker';
import { useTransferCustodyMutation } from '@/services/evidence/evidence.queries';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';

export function TransferCustodyDialog({ evidenceId }: { evidenceId: string }) {
  const [open, setOpen] = useState(false);
  const [custodian, setCustodian] = useState<KeycloakUser | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transferMut = useTransferCustodyMutation(evidenceId);

  const reset = () => {
    setCustodian(null);
    setReason('');
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (!custodian) {
      setError('Pick the new custodian.');
      return;
    }
    try {
      await transferMut.mutateAsync({
        newCustodianId: custodian.sub,
        ...(reason.trim() ? { transferReason: reason.trim() } : {}),
      });
      toast.success(`Custody transferred to ${custodian.firstName} ${custodian.lastName}`);
      reset();
      setOpen(false);
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setError('Unexpected error. Try again.');
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
        <Button size="sm" variant="outline">
          <Repeat className="mr-2 h-4 w-4" /> Transfer custody
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer custody</DialogTitle>
          <DialogDescription>
            Hand custody of this evidence to another user. This is recorded in the chain of custody.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">New custodian</p>
            <KeycloakUserPicker value={custodian} onChange={setCustodian} mode="assign" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Reason</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Optional reason for the transfer"
            />
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={transferMut.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={transferMut.isPending || !custodian}>
            {transferMut.isPending ? 'Transferring…' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
