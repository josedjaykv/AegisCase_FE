import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUnlinkMutation,
  useUpdateCaseLinkMutation,
} from '@/services/involved/involved.queries';
import { INVOLVEMENT_TYPES, type InvolvementType } from '@/services/involved/involved.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface LinkActionsProps {
  personId: string;
  caseId: string;
  involvementType: InvolvementType;
  /** Shown in the unlink confirmation. */
  label: string;
}

/**
 * Inline controls for an existing case ↔ person link: change the involvement
 * type and unlink. Render only for ADMIN/DETECTIVE (gate at the call site).
 */
export function LinkActions({ personId, caseId, involvementType, label }: LinkActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateMut = useUpdateCaseLinkMutation();
  const unlinkMut = useUnlinkMutation();

  const onChangeType = async (next: string) => {
    if (next === involvementType) return;
    try {
      await updateMut.mutateAsync({
        personId,
        caseId,
        input: { involvementType: next as InvolvementType },
      });
      toast.success(`Involvement set to ${next}`);
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
    }
  };

  const onUnlink = async () => {
    try {
      await unlinkMut.mutateAsync({ personId, caseId });
      toast.success('Unlinked from case');
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
      throw err; // keep the dialog open on failure
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={involvementType} onValueChange={onChangeType} disabled={updateMut.isPending}>
        <SelectTrigger className="h-8 w-32" aria-label="Change involvement type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INVOLVEMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
        aria-label="Unlink from case"
        disabled={unlinkMut.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Unlink from case?"
        description={
          <>
            This removes the link between <span className="font-medium">{label}</span> and this
            case. The person and the case are kept; only the involvement is removed. You can re-link
            later.
          </>
        }
        confirmLabel="Unlink"
        destructive
        onConfirm={onUnlink}
      />
    </div>
  );
}
