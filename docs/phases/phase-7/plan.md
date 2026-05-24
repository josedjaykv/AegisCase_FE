# Phase 7 — Media

**Status:** ⬜ Not started
**Duration estimate:** 4–6 days
**Dependencies:** Phases 3–6 (galleries embed in their detail pages)

## Objective

Upload + presigned-URL download + per-entity galleries.

## Deliverables

`MediaUpload` (drag-drop, progress, size/MIME pre-check), `MediaGallery` embedded in case/evidence/task/involved detail pages, presigned-URL download flow, ADMIN soft-delete.

## Backend integrations

- `POST /media` (multipart, snake_case form fields)
- `GET /media/entity/:entityType/:entityId` (raw array, no pagination envelope)
- `GET /media/:id`
- `GET /media/:id/download-url`
- `DELETE /media/:id` (ADMIN only, soft-delete)

## Success criteria

Files > 50 MB rejected before upload; presigned URL opens directly (no proxy); soft-delete removes from gallery; subsequent re-fetch shows 404.

## Required reading before starting

- `CLAUDE.md` (always — note the **always-on guardrail** about snake_case media form fields)
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §5 `<MediaUpload>` component
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — §6 field-casing translation (multipart needs snake_case)
- [`docs/architecture/workflows.md`](../../architecture/workflows.md) — Media upload / download flow
- [`docs/design-system.md`](../../design-system.md) — gallery thumbnails, Archived pill treatment for soft-deleted items, mobile camera input
- `BACKEND_INVESTIGATION_REPORT.md` §3.9, §5.8 — media entity, multipart contract, MIME magic-byte verification, presigned URL lifetime

## Implementation notes

- Multipart form fields are `file`, `entity_type`, `entity_id` (snake_case **only here** — the rest of the app is camelCase). Build the FormData manually.
- Local pre-check before upload: file size ≤ `MAX_FILE_SIZE` (50 MB by default), declared MIME in allowlist. Reject before hitting the network.
- Backend re-verifies MIME via magic bytes — if a file with declared `image/jpeg` is actually PNG, the upload 400s with "File content (X) does not match declared type (Y)". Surface that toast.
- For text-like files with no magic bytes, declare `text/plain` explicitly or the upload is rejected.
- Download: never proxy through `/media/:id` for the actual file bytes. Always call `GET /media/:id/download-url` and use the presigned `url` in an `<a href>` or `window.location = url`. URLs expire after 1 hour — re-fetch on demand.
- Soft-delete (ADMIN only) flips `deleted=true`; the S3 object stays but subsequent reads 404.
- Mobile-only: file input supports `capture="environment"` for evidence-from-the-scene capture.
- Galleries are embedded in case / evidence / task / involved-person detail pages — design as a reusable `<MediaGallery entityType entityId/>` component.
