import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaApi, type UploadOptions } from './media.api';
import { mediaQueryKeys } from './media.queryKeys';
import type { Media, MediaEntityType, UploadMediaInput } from './media.types';

const ONE_MIN = 1000 * 60;
const FIVE_MIN = ONE_MIN * 5;
// Presigned URLs live 1 h; refresh well before that so a tab open for a while
// never renders a dead URL.
const FIFTY_MIN = ONE_MIN * 50;

/** Per-entity gallery. Raw Media[] (no envelope). staleTime 1 min per api-integration.md §3. */
export function useEntityMediaQuery(
  entityType: MediaEntityType,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: mediaQueryKeys.entity(entityType, entityId ?? ''),
    queryFn: () => mediaApi.listByEntity(entityType, entityId as string),
    enabled: !!entityId,
    staleTime: ONE_MIN,
    gcTime: FIVE_MIN,
  });
}

export function useUploadMediaMutation(entityType: MediaEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      file: File;
      filename?: string;
      description?: string;
      onProgress?: UploadOptions['onProgress'];
    }) => {
      const input: UploadMediaInput = {
        file: vars.file,
        entityType,
        entityId,
        ...(vars.filename ? { filename: vars.filename } : {}),
        ...(vars.description ? { description: vars.description } : {}),
      };
      return mediaApi.upload(input, { onProgress: vars.onProgress });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaQueryKeys.entity(entityType, entityId) });
    },
  });
}

export function useDeleteMediaMutation(entityType: MediaEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => mediaApi.remove(mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaQueryKeys.entity(entityType, entityId) });
    },
  });
}

/**
 * A presigned URL for **inline rendering** (in-app viewer / image thumbnail).
 * Cached for 50 min (under the 1 h expiry) so panning around the gallery does
 * not re-presign on every render. Enable only when the URL is actually needed.
 */
export function useMediaInlineUrlQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...mediaQueryKeys.all, 'url', 'inline', id] as const,
    queryFn: () => mediaApi.getDownloadUrl(id, 'inline'),
    enabled,
    staleTime: FIFTY_MIN,
    gcTime: FIFTY_MIN + FIVE_MIN,
  });
}

/**
 * Fetch a fresh presigned URL with `attachment` disposition and open it directly
 * (no proxy through the API). Re-fetched on every call because the URL expires
 * after 1 hour and we always want the latest force-download link.
 */
export async function fetchAndOpenDownloadUrl(media: Pick<Media, 'id'>): Promise<void> {
  const { url } = await mediaApi.getDownloadUrl(media.id, 'attachment');
  window.open(url, '_blank', 'noopener,noreferrer');
}
