import type { AxiosProgressEvent } from 'axios';
import { httpClient } from '@/services/http/client';
import type {
  DownloadUrlResponse,
  Media,
  MediaDisposition,
  MediaEntityType,
  UploadMediaInput,
} from './media.types';

export interface UploadOptions {
  /** 0–100 progress, driven by the multipart upload. */
  onProgress?: ((percent: number) => void) | undefined;
}

export const mediaApi = {
  /**
   * POST /media (multipart/form-data).
   *
   * ⚠️ Field-casing boundary: the form fields are snake_case (`entity_type`,
   * `entity_id`) — the ONLY place in the app that uses snake_case for media.
   * Built as a manual FormData so axios sets the multipart boundary itself.
   *
   * Files whose browser-reported MIME is empty (no magic bytes the browser can
   * detect, e.g. .txt/.log) are declared `text/plain`, the only MIME the backend
   * accepts for magic-byte-less content (§5.8 validation rule 3).
   */
  async upload(input: UploadMediaInput, options: UploadOptions = {}): Promise<Media> {
    const declaredType = input.file.type || 'text/plain';
    // Re-wrap so the declared type is always set (some files arrive with type '').
    const file =
      input.file.type === declaredType
        ? input.file
        : new File([input.file], input.file.name, { type: declaredType });

    // The chosen display name is sent as the multipart part filename, so the
    // backend stores it as `originalFilename` (multer's `file.originalname`).
    const filename = input.filename?.trim() || input.file.name;

    const form = new FormData();
    form.append('file', file, filename);
    form.append('entity_type', input.entityType);
    form.append('entity_id', input.entityId);
    if (input.description?.trim()) {
      form.append('description', input.description.trim());
    }

    const { data } = await httpClient.post<Media>('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (options.onProgress && e.total) {
          options.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  /** Raw Media[] (no pagination envelope), already filtered to deleted=false. */
  async listByEntity(entityType: MediaEntityType, entityId: string): Promise<Media[]> {
    const { data } = await httpClient.get<Media[]>(
      `/media/entity/${entityType}/${entityId}`,
    );
    return data;
  },

  /**
   * Presigned URL valid for 1 hour.
   * `disposition` lets the caller request inline rendering (in-app viewer /
   * thumbnails) vs. a forced download — the backend maps it to the S3
   * `ResponseContentDisposition`. Omitted → backend default (inline).
   */
  async getDownloadUrl(
    id: string,
    disposition?: MediaDisposition,
  ): Promise<DownloadUrlResponse> {
    const { data } = await httpClient.get<DownloadUrlResponse>(
      `/media/${id}/download-url`,
      disposition ? { params: { disposition } } : undefined,
    );
    return data;
  },

  /** Soft-delete (ADMIN only). 204; the S3 object stays but reads 404 afterwards. */
  async remove(id: string): Promise<void> {
    await httpClient.delete(`/media/${id}`);
  },
};
