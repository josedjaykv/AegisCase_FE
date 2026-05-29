import { useState } from 'react';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { RoleGate } from '@/auth/RoleGate';
import { useArchiveCaseMutation } from '@/services/cases/cases.queries';
import type { Case } from '@/services/cases/cases.types';
import { isNormalizedApiError } from '@/services/http/errors';

export function ArchiveButton({ caseItem }: { caseItem: Case }) {
  const [open, setOpen] = useState(false);
  const mutation = useArchiveCaseMutation(caseItem.id);

  if (caseItem.archived) return null;

  const onConfirm = async () => {
    try {
      await mutation.mutateAsync();
      toast.success('Case archived');
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) {
        toast.error(err.message);
      }
      throw err; // keep the dialog open on failure
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
        title="Archive this case?"
        description={
          <>
            This permanently archives <span className="font-medium">{caseItem.caseCode}</span>. The
            case becomes read-only and cannot be un-archived. Continue?
          </>
        }
        confirmLabel="Archive case"
        destructive
        confirmPhrase={caseItem.caseCode}
        onConfirm={onConfirm}
      />
    </RoleGate>
  );
}
