import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/auth/RoleGate';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { MediaEntityType } from '@/services/media/media.types';
import { MAX_FILE_SIZE } from '@/services/media/media.types';
import { formatFileSize, validateFile } from '../mediaConstraints';
import { MediaUploadDialog } from './MediaUploadDialog';

interface MediaUploadProps {
  entityType: MediaEntityType;
  entityId: string;
}

export function MediaUpload({ entityType, entityId }: MediaUploadProps) {
  const isDesktop = useIsDesktop();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Files queued for the rename/description dialog, processed one at a time.
  const [queue, setQueue] = useState<File[]>([]);

  const enqueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      const check = validateFile(file);
      if (check.ok) valid.push(file);
      else toast.error(`${file.name}: ${check.reason}`);
    }
    if (valid.length) setQueue((q) => [...q, ...valid]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => enqueue(e.target.files);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    enqueue(e.dataTransfer.files);
  };

  const advance = () => setQueue((q) => q.slice(1));

  const current = queue[0];

  return (
    <RoleGate roles={['ADMIN', 'DETECTIVE', 'ANALYST']}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (isDesktop) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={isDesktop ? onDrop : undefined}
        className={cn(
          'flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 p-4 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          dragging && 'border-primary bg-accent',
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {isDesktop ? 'Drag a file here or click to upload' : 'Tap to upload or take a photo'}
        </p>
        <p className="text-xs text-muted-foreground">
          Up to {formatFileSize(MAX_FILE_SIZE)}. PDFs, images, video, audio, Office docs, text.
          You can rename it and add a description next.
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
          // Field intake: open the camera on mobile only.
          {...(!isDesktop ? { capture: 'environment' as const } : {})}
        />
      </div>

      {current && (
        <MediaUploadDialog
          // Key by identity + position so the dialog resets per file.
          key={`${current.name}-${current.size}-${queue.length}`}
          file={current}
          entityType={entityType}
          entityId={entityId}
          queueLabel={queue.length > 1 ? `1 / ${queue.length}` : undefined}
          onUploaded={advance}
          onSkip={advance}
        />
      )}
    </RoleGate>
  );
}
