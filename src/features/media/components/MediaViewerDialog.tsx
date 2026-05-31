import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { useMediaInlineUrlQuery } from '@/services/media/media.queries';
import type { Media } from '@/services/media/media.types';
import { formatFileSize, iconForMime, mediaKind } from '../mediaConstraints';

interface MediaViewerDialogProps {
  media: Media;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Routed through the gallery so the custody gate applies to downloads too. */
  onDownload: (media: Media) => Promise<void>;
}

export function MediaViewerDialog({ media, open, onOpenChange, onDownload }: MediaViewerDialogProps) {
  const kind = mediaKind(media.mimeType);
  // Only presign for types we actually render inline; Office/other never need it.
  const previewable =
    kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf' || kind === 'text';
  const urlQuery = useMediaInlineUrlQuery(media.id, open && previewable);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(media);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[95vw] max-w-4xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate text-base" title={media.originalFilename ?? undefined}>
            {media.originalFilename ?? 'File'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(media.fileSize)} · {media.mimeType ?? 'unknown type'} ·{' '}
            {formatDateTime(media.createdAt)}
          </p>
          {media.description?.trim() && (
            <p className="whitespace-pre-wrap text-sm text-foreground">{media.description}</p>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
          <ViewerBody
            media={media}
            url={urlQuery.data?.url}
            isLoading={previewable && urlQuery.isLoading}
            isError={previewable && urlQuery.isError}
            onDownload={handleDownload}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Opening…' : 'Download'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewerBody({
  media,
  url,
  isLoading,
  isError,
  onDownload,
}: {
  media: Media;
  url: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onDownload: () => void;
}) {
  const kind = mediaKind(media.mimeType);
  const Icon = iconForMime(media.mimeType);
  const name = media.originalFilename ?? 'this file';

  if (kind === 'office' || kind === 'other') {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Preview not available</p>
          <p className="text-xs text-muted-foreground">
            This file type can’t be previewed in the browser. Download it to open in its app.
          </p>
        </div>
        <Button size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download {name}
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="p-6 text-sm text-destructive">
        Failed to load a preview link. Try downloading the file instead.
      </div>
    );
  }

  if (isLoading || !url) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  switch (kind) {
    case 'image':
      return (
        <img
          src={url}
          alt={media.originalFilename ?? 'media'}
          className="max-h-full max-w-full object-contain"
        />
      );
    case 'video':
      // User-uploaded evidence has no caption track available.
      // eslint-disable-next-line jsx-a11y/media-has-caption
      return <video src={url} controls className="max-h-full max-w-full" />;
    case 'audio':
      return (
        <div className="w-full max-w-md p-6">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={url} controls className="w-full" />
        </div>
      );
    case 'pdf':
    case 'text':
      return <iframe src={url} title={name} className="h-full w-full bg-background" />;
    default:
      return null;
  }
}
