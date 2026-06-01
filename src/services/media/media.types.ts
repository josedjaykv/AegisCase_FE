export const MEDIA_ENTITY_TYPES = [
  'CASE',
  'TASK',
  'EVIDENCE',
  'INVOLVED_PERSON',
  'USER',
] as const;
export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];

/**
 * Media entity as persisted/read by the backend (camelCase on read).
 * See BACKEND_INVESTIGATION_REPORT.md §3.9. NOTE: the upload DTO uses
 * snake_case form fields — that translation lives ONLY in media.api.ts.
 */
export interface Media {
  id: string;
  /** Public-style S3 URL. NOT a usable download token unless the bucket is public —
   * use GET /media/:id/download-url for the actual download. */
  url: string;
  entityType: MediaEntityType;
  entityId: string;
  uploadedByUserId: string;
  /** Display name. Defaults to the uploaded file name but the user may rename it at upload time. */
  originalFilename?: string | null;
  /** Free-text note the uploader added (e.g. "Front camera of the building"). Backend-backed. */
  description?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  s3Key: string;
  deleted: boolean;
  createdAt: string;
}

export interface UploadMediaInput {
  file: File;
  entityType: MediaEntityType;
  entityId: string;
  /** Display name to store. Defaults to `file.name` when omitted. */
  filename?: string;
  /** Optional free-text description. */
  description?: string;
}

export interface DownloadUrlResponse {
  url: string;
  /** Lifetime in seconds (backend returns 3600). */
  expiresIn: number;
}

/**
 * How the presigned URL should serve the object:
 * - `inline`     → render in the in-app viewer / as a thumbnail
 * - `attachment` → force a download
 * Sent as the `disposition` query param on GET /media/:id/download-url.
 */
export type MediaDisposition = 'inline' | 'attachment';

/** Soft cap (default 50 MB). Files above this are rejected locally before upload. */
export const MAX_FILE_SIZE = 52_428_800;
/** Hard cap enforced by multer (100 MB). */
export const MEDIA_HARD_CAP = 104_857_600;

/**
 * Declared-MIME allowlist (default backend config, §3.9). The server re-verifies
 * via magic bytes, so this is a fast-fail UX hint, not a security boundary.
 */
export const MEDIA_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'audio/mpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
] as const;
