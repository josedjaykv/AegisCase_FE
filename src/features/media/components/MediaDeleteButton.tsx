import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { RoleGate } from '@/auth/RoleGate';
import { useDeleteMediaMutation } from '@/services/media/media.queries';
import type { Media } from '@/services/media/media.types';
import { isNormalizedApiError } from '@/services/http/errors';

interface MediaDeleteButtonProps {
  media: Media;
  entityType: Media['entityType'];
  entityId: string;
}

export function MediaDeleteButton({ media, entityType, entityId }: MediaDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteMediaMutation(entityType, entityId);

  const onConfirm = async () => {
    try {
      await mutation.mutateAsync(media.id);
      toast.success('File deleted');
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
      throw err; // keep dialog open on failure
    }
  };

  return (
    <RoleGate roles={['ADMIN']}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${media.originalFilename ?? 'file'}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this file?"
        description="This soft-deletes the file: it disappears from the gallery and future downloads return 404. This cannot be undone from the app."
        confirmLabel="Delete file"
        destructive
        onConfirm={onConfirm}
      />
    </RoleGate>
  );
}
