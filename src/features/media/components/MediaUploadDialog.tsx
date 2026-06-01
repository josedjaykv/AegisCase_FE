import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { isNormalizedApiError } from '@/services/http/errors';
import { useUploadMediaMutation } from '@/services/media/media.queries';
import type { MediaEntityType } from '@/services/media/media.types';
import { formatFileSize, iconForMime, isImageMime, splitExtension } from '../mediaConstraints';

interface MediaUploadDialogProps {
  file: File;
  entityType: MediaEntityType;
  entityId: string;
  /** Position in the queue, e.g. "1 / 3" — shown when uploading several files. */
  queueLabel?: string | undefined;
  /** Called after a successful upload (advance the queue / close). */
  onUploaded: () => void;
  /** Called when the user skips this file. */
  onSkip: () => void;
}

export function MediaUploadDialog({
  file,
  entityType,
  entityId,
  queueLabel,
  onUploaded,
  onSkip,
}: MediaUploadDialogProps) {
  // The extension is fixed (preserved from the original file); the user edits
  // only the base name.
  const { base: originalBase, ext } = useMemo(() => splitExtension(file.name), [file]);
  const [base, setBase] = useState(originalBase);
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const mutation = useUploadMediaMutation(entityType, entityId);
  const busy = mutation.isPending;

  // Reset the form whenever a new file enters the dialog (queue advance).
  useEffect(() => {
    setBase(originalBase);
    setDescription('');
    setProgress(null);
  }, [file, originalBase]);

  // Local preview for images — no network, revoked on change/unmount.
  const previewUrl = useMemo(
    () => (isImageMime(file.type) ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const Icon = iconForMime(file.type);
  const nameOk = base.trim().length > 0;
  // Final name always keeps the original extension.
  const finalName = `${base.trim()}${ext}`;

  const handleUpload = async () => {
    if (!nameOk) return;
    setProgress(0);
    try {
      await mutation.mutateAsync({
        file,
        filename: finalName,
        description: description.trim(),
        onProgress: setProgress,
      });
      toast.success(`Uploaded ${finalName}`);
      onUploaded();
    } catch (err) {
      // Surface backend 400s verbatim (magic-byte mismatch, etc.).
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
      setProgress(null);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onSkip()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base">
            Upload file{queueLabel ? ` (${queueLabel})` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview / file summary */}
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 text-xs text-muted-foreground">
              <p className="truncate" title={file.name}>
                Original: {file.name}
              </p>
              <p>
                {formatFileSize(file.size)} · {file.type || 'text/plain'}
              </p>
            </div>
          </div>

          {/* Name (extension is fixed/preserved) */}
          <div className="space-y-1.5">
            <Label htmlFor="media-name">Name</Label>
            <div
              className={cn(
                'flex items-center rounded-md border border-border bg-background',
                'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
                !nameOk && 'border-destructive focus-within:ring-destructive',
              )}
            >
              <input
                id="media-name"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                disabled={busy}
                aria-invalid={!nameOk}
                placeholder="A descriptive name"
                className="h-10 min-w-0 flex-1 rounded-l-md bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {ext && (
                <span className="select-none px-3 font-mono text-sm text-muted-foreground" aria-hidden="true">
                  {ext}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The file extension <span className="font-mono">{ext || '(none)'}</span> is kept
              automatically. Saved as <span className="font-mono">{finalName}</span>.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="media-description">Description (optional)</Label>
            <textarea
              id="media-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="e.g. Video showing a fragment of the building's front camera"
              className={cn(
                'flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </div>

          {/* Progress */}
          {progress !== null && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSkip} disabled={busy}>
            {queueLabel ? 'Skip' : 'Cancel'}
          </Button>
          <Button type="button" onClick={handleUpload} disabled={busy || !nameOk}>
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
