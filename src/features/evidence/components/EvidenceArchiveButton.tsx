import { useState } from 'react';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { RoleGate } from '@/auth/RoleGate';
import { useArchiveEvidenceMutation } from '@/services/evidence/evidence.queries';
import type { Evidence } from '@/services/evidence/evidence.types';
import { isNormalizedApiError } from '@/services/http/errors';

export function EvidenceArchiveButton({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(false);
  const mutation = useArchiveEvidenceMutation(evidence.id);

  if (evidence.archived) return null;

  const onConfirm = async () => {
    try {
      await mutation.mutateAsync();
      toast.success('Evidence archived');
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
      throw err; // keep dialog open on failure (e.g. 409 already archived)
    }
  };

  return (
    <RoleGate roles={['ADMIN']}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Archive className="mr-2 h-4 w-4" /> Archive
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this evidence?"
        description="This sets the evidence to ARCHIVED and removes it from active workflows. This cannot be undone. Continue?"
        confirmLabel="Archive evidence"
        destructive
        confirmPhrase="ARCHIVE"
        onConfirm={onConfirm}
      />
    </RoleGate>
  );
}
