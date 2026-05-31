# Phase 7 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phases 3–6 (case / evidence / task / involved detail pages host the galleries).

Phase 7 delivers the **Media module**: a reusable `<MediaGallery>` (with embedded drag-drop
`<MediaUpload>`) wired into the four entity detail pages, presigned-URL downloads, and ADMIN
soft-delete. Scope is **embedded galleries only** — no standalone `/media/upload` route (per the
plan's Deliverables contract).

---

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §3.9, §5.8)

| Endpoint | API fn / hook | Notes |
|---|---|---|
| `POST /media` (multipart) | `mediaApi.upload` / `useUploadMediaMutation` | **snake_case** form fields `file`, `entity_type`, `entity_id`; `onUploadProgress` → progress bar |
| `GET /media/entity/:type/:id` | `mediaApi.listByEntity` / `useEntityMediaQuery` | **raw `Media[]`** (no envelope); `staleTime` 1 min, `gcTime` 5 min |
| `GET /media/:id/download-url` | `mediaApi.getDownloadUrl(id, disposition?)` | `?disposition=inline` for thumbnails/viewer (cached 50 min), `?disposition=attachment` for downloads (fetched per click) |
| `DELETE /media/:id` | `mediaApi.remove` / `useDeleteMediaMutation` | ADMIN only; soft-delete (`deleted=true`) |

`GET /media/:id` is intentionally **not** wired — the gallery reads via the by-entity list and
downloads via the presigned URL, so the single-GET is never needed.

> 📘 **Para entender los conceptos** (S3, URL presignada, inline vs attachment, Content-Type,
> CORS) en lenguaje sencillo, ver [`preview-explained.md`](preview-explained.md).

### Backend contract added for preview / in-app viewer

`GET /media/:id/download-url` now accepts a **`disposition`** query param:

| `disposition` | S3 `ResponseContentDisposition` | Used by |
|---|---|---|
| `inline` (default) | `inline` (+ `ResponseContentType` = the object's MIME) | thumbnails, in-app viewer |
| `attachment` | `attachment; filename="<original>"` | Download buttons |

This is what lets `<img>` / `<video>` / `<audio>` / `<iframe>` render the file **in the browser**
instead of forcing a download. **No S3 bucket CORS is required**, because every renderer uses an
HTML tag (`src=`) — the app never `fetch()`es the bytes. The public `media.url` field is **not**
used for rendering (it is not directly readable per §3.9); thumbnails/viewer always presign first.

> **Deployment note:** the current backend already serves objects **inline by default** (they are
> not stored with `attachment` disposition), so preview/viewer work **without** any backend change
> — the `?disposition` param is sent but currently ignored. Implementing `?disposition` is
> **optional**: it only upgrades the **Download** button from "open inline in a new tab" to a
> **forced download with the original filename**. There is no FE-only way to force a download
> (that would require cross-origin `fetch()` of the bytes → S3 bucket CORS), so forced-download
> remains a backend-only enhancement.

## Field-casing boundary (guardrail)

The only place in the app that emits snake_case for media is `services/media/media.api.ts`:
`upload()` builds a manual `FormData` with `file` / `entity_type` / `entity_id`. The rest of the
app — types, hooks, components — is camelCase end-to-end (`entityType`, `entityId`).

## File map

### `src/services/media/` (only HTTP layer for media)

- `media.types.ts` — `Media`, `MediaEntityType`, `UploadMediaInput`, `DownloadUrlResponse`, and the
  single-source constants `MAX_FILE_SIZE` (50 MB), `MEDIA_HARD_CAP` (100 MB), `MEDIA_ALLOWED_MIME_TYPES`.
- `media.api.ts` — `mediaApi.{upload, listByEntity, getDownloadUrl, remove}` + `UploadOptions`.
- `media.queryKeys.ts` — `all`, `entity(type, id)`.
- `media.queries.ts` — `useEntityMediaQuery`, `useUploadMediaMutation`, `useDeleteMediaMutation`,
  `useMediaInlineUrlQuery` (presigned `inline` URL, cached 50 min for thumbnails/viewer), and the
  plain async helper `fetchAndOpenDownloadUrl` (presigns `attachment` per click).

### `src/features/media/`

- `mediaConstraints.ts` — pure helpers: `validateFile` (size + allowlist + hard-cap),
  `effectiveMimeType` (empty `file.type` → `text/plain`), `formatFileSize`, `isImageMime`,
  `mediaKind` (image/video/audio/pdf/text/office/other), `canPreviewInApp`, `iconForMime`.
- `components/MediaUpload.tsx` — drag-drop zone (native DnD, desktop only) + click/tap input
  with `capture="environment"` on `< md`. Selected/dropped files are locally pre-checked and
  **queued**; each opens `<MediaUploadDialog>` in turn. Gated to ADMIN/DETECTIVE/ANALYST
  (`media.upload`).
- `components/MediaUploadDialog.tsx` — per-file upload form: editable **base name** with the
  **original extension preserved** (shown as a fixed suffix; `splitExtension` separates them and the
  final name is `base + ext`, sent as the multipart part filename → stored as `originalFilename`),
  optional **description** textarea, a **local image preview** (`URL.createObjectURL`, revoked on
  unmount), and a progress bar. Backend 400s surfaced verbatim. Skip/Cancel advances the queue.
- `components/MediaGallery.tsx` — `({ entityType, entityId, readOnly })`. Responsive thumbnail grid.
  Each tile: a clickable preview area (opens the in-app viewer), filename, size, date, **Download**,
  ADMIN **Delete**. Loading → skeletons, empty → `<EmptyState>`, error → alert. Embeds
  `<MediaUpload>` unless `readOnly`. Owns the `<MediaViewerDialog>` open state.
- `components/MediaThumbnail.tsx` — real preview for image tiles: presigns an `inline` URL
  (`useMediaInlineUrlQuery`) and renders `<img>`; non-images and load failures render a type icon.
- `components/MediaViewerDialog.tsx` — in-app viewer modal. Renders by `mediaKind`:
  image → `<img>`, video → `<video controls>`, audio → `<audio controls>`, pdf/text → `<iframe>`
  (browser-native). **Office/other** → a "Preview not available — download to open" fallback. Always
  offers a **Download** button. Presigns an `inline` URL only when open and previewable.
- `components/MediaDeleteButton.tsx` — ADMIN-only (`media.delete`), `<ConfirmDialog>` double-confirm,
  `useDeleteMediaMutation`. Mirrors `EvidenceArchiveButton`.

### Detail-page wiring (edits)

| Page | entityType | entityId | readOnly when |
|---|---|---|---|
| `cases/pages/CaseDetailPage.tsx` | `CASE` | `c.id` | `archived` or `status === CLOSED` |
| `evidence/pages/EvidenceDetailPage.tsx` | `EVIDENCE` | route `id` | `e?.archived` |
| `tasks/pages/TaskDetailPage.tsx` | `TASK` | `t.id` | `isTerminal(t.status)` |
| `involved/pages/InvolvedDetailPage.tsx` | `INVOLVED_PERSON` | `p.id` | — |

The case page gained a real **Media** tab (removed from `PLACEHOLDER_TABS`; only `audit` remains a
placeholder for Phase 8). The other three pages render a **Media** `<Card>` below their existing
content. The evidence gallery keys off the route `id`, so it loads **without** triggering the
side-effecting `GET /evidence/:id`.

## Guardrails honored

- **Local pre-check before network:** `validateFile` rejects > 50 MB (and > 100 MB hard cap) and
  any declared MIME outside the allowlist — no POST is issued for those.
- **Magic-byte mismatch:** caught server-side; the backend 400 message
  ("File content (X) does not match declared type (Y)", "File type X is not allowed", …) is shown
  verbatim in a toast.
- **No-magic-byte files:** `effectiveMimeType`/`upload` declare `text/plain` when `file.type` is empty.
- **Download never proxies bytes** through the API: a fresh presigned URL is fetched per click and
  opened in a new tab; it is never cached (1 h lifetime).
- **Soft-delete** is ADMIN-only with a destructive double-confirm; on success the tile leaves the
  gallery (query invalidation) and subsequent reads 404.
- **Mobile camera** intake via `capture="environment"` on `< md` only.

## Visual / design-system

- Thumbnail tiles use `rounded-lg` cards + `shadow-sm` (design-system §4); icons `lucide-react`
  stroke-only (§6); upload progress bar uses `--primary`, delete uses `--destructive`.
- Grid is `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`; verified at 375 / 768 / 1440.
- No raw hex/HSL; all colors via semantic tokens.

## Evidence media gated by chain of custody (Option C)

For **EVIDENCE** media only, downloading a file requires holding custody (viewing stays open):

- `MediaGallery` accepts an optional `custodyGate` (`{ isCustodian, takeCustody }`). All downloads
  route through one `requestDownload`: if `custodyGate && !isCustodian`, it opens a `<ConfirmDialog>`
  ("Take custody to download?"); on confirm it calls `takeCustody()` then downloads. Custodians (and
  every non-evidence entity, which passes no gate) download directly.
- `EvidenceDetailPage` wires it: `isCustodian = currentCustodianId === user.sub`, and `takeCustody`
  uses `useTakeCustodyMutation` → `PATCH /evidence/:id/take-custody` (`services/evidence`), which
  seeds the detail cache + invalidates chain/lists so the gate flips immediately.
- The viewer's Download button routes through the same gate (it receives `onDownload` from the
  gallery instead of downloading itself).

This is a **UX + traceability** layer. `PATCH /evidence/:id/take-custody` is **implemented
backend-side**; the real download enforcement (a **403 on `download-url?disposition=attachment`** for
non-custodians) and view-access logging are tracked in
[`backend-prompt-evidence-media-custody.md`](backend-prompt-evidence-media-custody.md) (the latter
deferred to Phase 8 / Audit). Full write-up:
[Feature 007](../../features/feature-007-evidence-media-custody-gate.md).

## Custom name + description on upload

The upload dialog lets the user rename the file and add a free-text description before uploading:

- **Name** is sent as the multipart part filename (`form.append('file', blob, chosenName)`), so the
  backend stores it as `originalFilename` without any new field — works with the current backend
  **iff** it uses `file.originalname`.
- **Description** is sent as a multipart `description` field **only when non-empty**, and **requires
  a backend change** (new nullable `description` column + DTO field + returned on reads). Until the
  backend ships it, uploads still work (no description sent) but the description is dropped.

The exact backend contract + acceptance criteria are in
[`backend-prompt-media-metadata.md`](backend-prompt-media-metadata.md). Description is rendered in
the viewer header and as a truncated line on the gallery tile when present.

## Dependencies

None added. Drag-and-drop is hand-rolled with native DnD events; no upload library was introduced
(tech-stack.md lists none, so none was assumed).

## Deviations

None. Scope matches the plan's Deliverables exactly (embedded galleries only).
