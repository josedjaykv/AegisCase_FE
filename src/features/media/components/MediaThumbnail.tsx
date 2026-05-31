import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaInlineUrlQuery } from '@/services/media/media.queries';
import type { Media } from '@/services/media/media.types';
import { iconForMime, isImageMime } from '../mediaConstraints';

/**
 * Tile preview. For images we presign an inline URL and render a real thumbnail
 * (the public `media.url` is not directly readable — §3.9). Everything else
 * renders a type icon.
 */
export function MediaThumbnail({ media }: { media: Media }) {
  const isImage = isImageMime(media.mimeType);
  const [failed, setFailed] = useState(false);
  const urlQuery = useMediaInlineUrlQuery(media.id, isImage && !failed);
  const Icon = iconForMime(media.mimeType);

  if (!isImage || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        {failed ? <ImageOff className="h-8 w-8" aria-hidden="true" /> : <Icon className="h-8 w-8" aria-hidden="true" />}
      </div>
    );
  }

  if (urlQuery.isLoading || !urlQuery.data) {
    return <Skeleton className="h-full w-full rounded-none" />;
  }

  return (
    <img
      src={urlQuery.data.url}
      alt={media.originalFilename ?? 'media preview'}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
