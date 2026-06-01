import { useState } from 'react';
import { Download, Eye, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/EmptyState';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { formatDateTime } from '@/lib/date';
import { isNormalizedApiError } from '@/services/http/errors';
import {
  fetchAndOpenDownloadUrl,
  useEntityMediaQuery,
} from '@/services/media/media.queries';
import type { Media, MediaEntityType } from '@/services/media/media.types';
import { formatFileSize } from '../mediaConstraints';
import { MediaUpload } from './MediaUpload';
import { MediaDeleteButton } from './MediaDeleteButton';
import { MediaThumbnail } from './MediaThumbnail';
import { MediaViewerDialog } from './MediaViewerDialog';

/**
 * For EVIDENCE media: downloading requires holding custody. When the caller is
 * not the custodian, a download asks them to take custody first (which writes a
 * chain-of-custody record). Viewing stays open (Option C).
 */
export interface MediaCustodyGate {
  isCustodian: boolean;
  /** Take custody of the parent evidence. Resolves once custody is held. */
  takeCustody: () => Promise<void>;
}

interface MediaGalleryProps {
  entityType: MediaEntityType;
  entityId: string | undefined;
  /** Hide the uploader when the parent entity is archived/closed/terminal. */
  readOnly?: boolean | undefined;
  /** Only passed for EVIDENCE — gates downloads behind custody. */
  custodyGate?: MediaCustodyGate | undefined;
}

export function MediaGallery({ entityType, entityId, readOnly, custodyGate }: MediaGalleryProps) {
  const query = useEntityMediaQuery(entityType, entityId);
  const items = query.data ?? [];
  const [viewing, setViewing] = useState<Media | null>(null);
  const [pendingDownload, setPendingDownload] = useState<Media | null>(null);

  /** Single entry point for downloads — applies the custody gate when present. */
  const requestDownload = async (media: Media) => {
    if (custodyGate && !custodyGate.isCustodian) {
      setPendingDownload(media);
      return;
    }
    await fetchAndOpenDownloadUrl(media);
  };

  const confirmCustodyDownload = async () => {
    if (!pendingDownload) return;
    try {
      await custodyGate!.takeCustody();
      toast.success('Custody transferred to you');
      await fetchAndOpenDownloadUrl(pendingDownload);
      setPendingDownload(null);
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
      throw err; // keep the dialog open on failure
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && entityId && <MediaUpload entityType={entityType} entityId={entityId} />}

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Failed to load media.
        </div>
      ) : query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Paperclip}
          title="No files yet"
          description={readOnly ? undefined : 'Upload a file to attach it to this record.'}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <MediaTile
              key={m.id}
              media={m}
              entityType={entityType}
              entityId={entityId ?? ''}
              onView={() => setViewing(m)}
              onDownload={() => requestDownload(m)}
            />
          ))}
        </ul>
      )}

      {viewing && (
        <MediaViewerDialog
          media={viewing}
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
          onDownload={requestDownload}
        />
      )}

      {pendingDownload && (
        <ConfirmDialog
          open={!!pendingDownload}
          onOpenChange={(open) => !open && setPendingDownload(null)}
          title="Take custody to download?"
          description="You are not the current custodian of this evidence. To download this file, custody must be transferred to you — this will be recorded in the chain of custody. Continue?"
          confirmLabel="Take custody & download"
          onConfirm={confirmCustodyDownload}
        />
      )}
    </div>
  );
}

function MediaTile({
  media,
  entityType,
  entityId,
  onView,
  onDownload,
}: {
  media: Media;
  entityType: MediaEntityType;
  entityId: string;
  onView: () => void;
  onDownload: () => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onView}
        aria-label={`Open ${media.originalFilename ?? 'file'}`}
        className="group relative flex aspect-video items-center justify-center overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <MediaThumbnail media={media} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white group-focus-visible:bg-black/40 group-focus-visible:text-white">
          <Eye className="h-6 w-6" aria-hidden="true" />
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-medium text-foreground"
            title={media.originalFilename ?? undefined}
          >
            {media.originalFilename ?? 'Untitled file'}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(media.fileSize)} · {formatDateTime(media.createdAt)}
          </p>
          {media.description?.trim() && (
            <p
              className="truncate text-xs text-muted-foreground"
              title={media.description}
            >
              {media.description}
            </p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-1">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Opening…' : 'Download'}
          </Button>
          <MediaDeleteButton media={media} entityType={entityType} entityId={entityId} />
        </div>
      </div>
    </li>
  );
}
