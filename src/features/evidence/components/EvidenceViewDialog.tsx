import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useViewEvidenceMutation } from '@/services/evidence/evidence.queries';
import { isNormalizedApiError } from '@/services/http/errors';

interface EvidenceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceId: string;
  onViewed?: () => void;
}

/**
 * THE critical UX guard for Phase 5. `GET /evidence/:id` MUTATES the
 * chain-of-custody and reassigns custody to the viewer. This dialog is the
 * ONLY path that may trigger that request — the detail page never auto-fetches
 * it. See docs/architecture/architecture.md §5 and the always-on guardrail.
 */
export function EvidenceViewDialog({
  open,
  onOpenChange,
  evidenceId,
  onViewed,
}: EvidenceViewDialogProps) {
  const viewMut = useViewEvidenceMutation();

  const onConfirm = async () => {
    try {
      await viewMut.mutateAsync(evidenceId);
      toast.success('You are now recorded as the current custodian');
      onOpenChange(false);
      onViewed?.();
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) {
        toast.error(err.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !viewMut.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 text-warning">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle>Take custody of this evidence?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Viewing this evidence will record <span className="font-medium text-foreground">you</span>{' '}
            as the current custodian and add a "Viewed by user" entry to its chain of custody. This
            cannot be undone. Continue only if you intend to take responsibility for it.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={viewMut.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={viewMut.isPending}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {viewMut.isPending ? 'Recording…' : 'View & take custody'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
