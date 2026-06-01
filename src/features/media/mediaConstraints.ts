import {
  File as FileIcon,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  MAX_FILE_SIZE,
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_HARD_CAP,
} from '@/services/media/media.types';

const ALLOWED = new Set<string>(MEDIA_ALLOWED_MIME_TYPES);

/**
 * The MIME we will declare to the backend. The browser reports an empty string
 * for files with no recognizable type (e.g. .log) — those must be declared
 * `text/plain` or the upload is rejected (§5.8 validation rule 3).
 */
export function effectiveMimeType(file: File): string {
  return file.type || 'text/plain';
}

export type FileValidation = { ok: true } | { ok: false; reason: string };

/**
 * Local pre-check, mirrors the backend's size + allowlist rules so we never hit
 * the network with a file that will obviously fail. The server still re-verifies
 * via magic bytes (that mismatch can only be caught server-side).
 */
export function validateFile(file: File): FileValidation {
  if (file.size > MEDIA_HARD_CAP) {
    return { ok: false, reason: `File exceeds the 100 MB hard cap (${formatFileSize(file.size)}).` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      reason: `File exceeds the maximum size of ${formatFileSize(MAX_FILE_SIZE)} (${formatFileSize(file.size)}).`,
    };
  }
  const mime = effectiveMimeType(file);
  if (!ALLOWED.has(mime)) {
    return { ok: false, reason: `File type "${mime}" is not allowed.` };
  }
  return { ok: true };
}

/**
 * Split a filename into its editable base and its extension (incl. the dot).
 * A leading dot (dotfiles like `.gitignore`) is treated as having no extension.
 * e.g. `100393.jpg` → `{ base: '100393', ext: '.jpg' }`.
 */
export function splitExtension(name: string): { base: string; ext: string } {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

const KB = 1024;
const MB = KB * 1024;

/** Human-readable byte size, e.g. "1.4 MB", "320 KB", "512 B". */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
}

export function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

const OFFICE_MIME_TYPES = new Set<string>([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/**
 * Coarse rendering category for a MIME type. Drives both the tile icon and how
 * the in-app viewer renders the file.
 */
export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'office' | 'other';

export function mediaKind(mime: string | null | undefined): MediaKind {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/plain') return 'text';
  if (OFFICE_MIME_TYPES.has(mime)) return 'office';
  return 'other';
}

/**
 * Whether the browser can render this type inline without an external service.
 * Office docs (docx/xls/…) are intentionally excluded — they fall back to a
 * download action in the viewer.
 */
export function canPreviewInApp(mime: string | null | undefined): boolean {
  const kind = mediaKind(mime);
  return kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf' || kind === 'text';
}

/** Tile / viewer icon for non-image media (images render a real thumbnail). */
export function iconForMime(mime: string | null | undefined): LucideIcon {
  switch (mediaKind(mime)) {
    case 'image':
      return ImageIcon;
    case 'video':
      return FileVideo;
    case 'audio':
      return FileAudio;
    case 'pdf':
    case 'text':
      return FileText;
    case 'office':
      return mime === 'application/vnd.ms-excel' ||
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ? FileSpreadsheet
        : FileText;
    default:
      return FileIcon;
  }
}
