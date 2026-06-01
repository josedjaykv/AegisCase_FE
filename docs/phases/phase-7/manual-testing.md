# Phase 7 — Manual Testing Guide

Step-by-step verification of the Media module (upload + presigned download + per-entity
galleries + ADMIN soft-delete). The backend (including media-service + S3/MinIO) must be up.

**Estimated time:** ~20 minutes.

---

## 0. Prerequisites

- **Node 20+**; **backend running** (`curl http://localhost:3000/health` → ok), with the
  **media-service** reachable and its S3/MinIO bucket configured.
- **Backend contract for preview/viewer:** thumbnails + the in-app viewer work as long as the
  presigned URL serves the object **inline** — which is already the default in the current backend
  (objects are not stored with `Content-Disposition: attachment`), so **no backend change is
  required to preview**. The FE sends `?disposition=inline|attachment`; the backend currently
  **ignores** it. Implementing it (map to S3 `ResponseContentDisposition` + `ResponseContentType`)
  is **optional** and only changes the **Download** button from "open in a new tab" to a **forced
  download with the original filename**. No S3 bucket CORS is needed either way.
- Seeded users for the three roles (ADMIN, DETECTIVE, ANALYST); login working (Phase 1).
- **At least one** case (Phase 3), one evidence item (Phase 5), one task (Phase 6) and one
  involved person (Phase 4) to attach files to.
- `CORS_ORIGIN=http://localhost:5173`.
- A few local test files handy:
  - a small image (`.jpg` or `.png`),
  - a PDF,
  - a `.txt` / `.log` file (no magic bytes),
  - **a file > 50 MB** (e.g. `head -c 60000000 /dev/urandom > big.bin` then rename to `big.pdf`),
  - **a mislabeled file** (e.g. copy a PNG to `fake.jpg` — declared JPEG, actually PNG).

---

## 1. Install & checks

```bash
cd /home/josed/AegisCase_FE
npm install
npm run lint && npm run typecheck && npm run test:run && npm run build
npm run dev          # http://localhost:5173
```

All four checks must pass before testing in the browser.

Sign in as **DETECTIVE** (can upload + download, cannot delete).

---

## 2. Upload — case (Media tab)

Open any case → **Media** tab.

**Expect**: a dashed drag-drop zone ("Drag a file here or click to upload"), and an empty state
("No files yet") below it.

1. Drag the **image** onto the zone (or click → pick it). A **dialog** opens with:
   - a **local preview** of the image (no network yet),
   - a **Name** field prefilled with the original base name; the **extension is fixed** and shown
     as a non-editable suffix (e.g. `.jpg`). Change the base, e.g. `100393` → `Cámara frontal
     edificio`; the helper text confirms it saves as `Cámara frontal edificio.jpg`,
   - an optional **Description** textarea, e.g. *"Video que muestra un fragmento de la cámara
     frontal del edificio"*.
   Click **Upload** → progress bar, then toast **"Uploaded &lt;name&gt;"**. The tile shows a
   **real image thumbnail** (the FE presigns an `inline` URL — `GET /media/:id/download-url?disposition=inline`
   — it does **not** use the public `url` field), the **renamed** filename, and the description as a
   small line under it.
2. Upload the **PDF** → same dialog; appears as a **file icon** tile (PDFs are not thumbnailed).
3. Open DevTools → Network. Upload the `.txt`/`.log` file → the `POST /media` **request payload**
   shows form fields `file` (its `filename` = the name you typed), `entity_type=CASE`,
   `entity_id=<case id>` (snake_case), and `description` (only if you wrote one). It **succeeds**
   (declared `text/plain` automatically).

**Verify the snake_case boundary**: in the Network tab the multipart body uses `entity_type` /
`entity_id`, never camelCase.

**Multiple files:** if you drop several at once, the dialog processes them **one at a time**
(header shows `1 / N`); **Skip** moves to the next without uploading.

> ⚠️ **Backend dependency for description:** persisting/returning `description` needs a backend
> change (new nullable column + DTO field). See
> [`backend-prompt-media-metadata.md`](backend-prompt-media-metadata.md). The **rename** works with
> the current backend if it stores the multipart part filename as `originalFilename`. Until the
> backend ships description support, the field can still be typed but won't appear after reload.

---

## 3. Local pre-checks (no network)

Still on the case Media tab, with the Network tab open:

1. Try the **> 50 MB** file → a toast **"File exceeds the maximum size of 50.0 MB (…)"** and
   **NO `POST /media` request** is fired. (This is the success-criterion: rejected before network.)
2. (Optional) Try a disallowed type (e.g. a `.zip`) → toast "File type … is not allowed", again
   **no network call**.

---

## 4. Magic-byte mismatch (server-side)

Upload the **mislabeled** file (`fake.jpg` that is actually a PNG).

**Expect**: the `POST /media` **is** sent, the backend returns **400**, and a toast surfaces the
server message verbatim, e.g. **"File content (image/png) does not match declared type (image/jpeg)"**.
The file does **not** appear in the gallery.

---

## 5. In-app viewer

Click the **thumbnail/preview area** of a tile (or its hover **eye** overlay). A modal opens.

**Expect**, by file type:
- **Image** → rendered full-size, fit-to-modal.
- **PDF** → the browser's native PDF viewer inside an `<iframe>` (scroll/zoom work).
- **TXT/log** → the text shown inside an `<iframe>`.
- **Video (mp4)** → an inline `<video>` player with controls.
- **Audio (mp3)** → an inline `<audio>` player.
- **DOCX / XLSX / DOC / XLS** → a **"Preview not available"** card with a **Download** button
  (browsers can't render Office files and we don't send them to a third party).

The modal always has a **Download** button. The header shows filename, size, MIME and date.
Network: opening fires `GET /media/:id/download-url?disposition=inline`; the presigned URL is
**cached ~50 min**, so re-opening the same file does not re-presign.

---

## 6. Download (presigned URL, force-download)

Click **Download** on a tile (or inside the viewer), Network tab open.

**Expect**:
- A `GET /media/:id/download-url?disposition=attachment` request fires, returning
  `{ url, expiresIn: 3600 }`.
- The browser hits the **S3 presigned URL** directly (host is the S3/MinIO bucket, query has
  `X-Amz-…`), **not** a proxy through `localhost:3000/media/:id`, and the file **downloads**
  (because S3 returns `Content-Disposition: attachment`).
- Each Download **re-fetches** a fresh `attachment` URL (URLs expire after 1 h).

---

## 7. Galleries on the other three entities

Repeat a single upload + download on each:

- **Evidence** → `/evidence/:id` → **Media** card (below the chain of custody). It loads
  **without** the "View & take custody" side effect — uploading/downloading here must **not**
  add a chain-of-custody row.
- **Task** → `/tasks/:id` → **Media** card.
- **Involved person** → `/involved/:id` → **Media** card.

Each `POST /media` carries the correct `entity_type` (`EVIDENCE` / `TASK` / `INVOLVED_PERSON`)
and `entity_id`.

---

## 7b. Evidence download gated by custody (Option C)

> `PATCH /evidence/:id/take-custody` is **implemented backend-side**, so the confirm step works
> end-to-end. The server-side **403 on `attachment` for non-custodians** (real enforcement) and
> view-access auditing are tracked in
> [`backend-prompt-evidence-media-custody.md`](backend-prompt-evidence-media-custody.md). See also
> [Feature 007](../../features/feature-007-evidence-media-custody-gate.md).

On an evidence whose **current custodian is someone else** (not you):

1. **View** a media file (open the viewer) → works normally (viewing is not gated).
2. Click **Download** (tile or viewer) → a dialog appears: **"Take custody to download?"** —
   "you are not the current custodian… custody must be transferred to you… recorded in the chain of
   custody."
3. **Confirm** → `PATCH /evidence/:id/take-custody` fires (toast "Custody transferred to you"), the
   **chain of custody** gains a new row (reason set by backend, e.g. "Accessed evidence file"), and
   the file downloads.
4. Now that you hold custody, clicking **Download** again goes **straight to the file** (no dialog).

If you **already are** the custodian, Download never shows the dialog.

---

## 8. Role gating

- **Sign in as ANALYST**: can **upload** and **download** on all four galleries (matches
  `media.upload`). The **Delete** trash button is **not rendered**.
- **Sign in as ADMIN**: each tile shows a trash **Delete** button.
  - Click it → a destructive confirm dialog. Confirm → toast **"File deleted"**, the tile
    **disappears** from the gallery.
  - Verify the soft-delete: `curl -H 'Authorization: Bearer <admin token>'
    http://localhost:3000/media/<deleted id>` → **404**. (The S3 object stays, but reads 404.)

---

## 9. Read-only states

- Open an **archived** or **CLOSED** case → **Media** tab: the upload zone is **hidden**; existing
  tiles still render and remain downloadable.
- Same for **archived evidence** and a **COMPLETED/CANCELLED task**.

---

## 10. Responsive + camera

Use DevTools device toolbar:

- **375 × 812 (mobile)**: gallery is a 2-column grid; the upload control reads **"Tap to upload
  or take a photo"** and the file input offers the **camera** (`capture="environment"`).
- **768 × 1024 (tablet)**: 3-column grid.
- **1440 × 900 (desktop)**: 4-column grid; drag-and-drop highlights the zone on drag-over.

---

## Success criteria (from the plan)

- [ ] Files > 50 MB are rejected **before** upload (no network call).
- [ ] Presigned URL opens the file directly (no proxy through `/media/:id`).
- [ ] Soft-delete (ADMIN) removes the item from the gallery.
- [ ] Subsequent `GET /media/:id` re-fetch returns **404**.
- [ ] Declared-vs-actual MIME mismatch surfaces the backend message verbatim.
- [ ] `.txt`/no-magic-byte files upload (declared `text/plain`).
- [ ] Galleries render on case / evidence / task / involved detail pages.
- [ ] Image tiles show a **real thumbnail** (presigned `inline` URL, not the public `url`).
- [ ] In-app viewer renders image / PDF / TXT / video / audio inline; Office files show the
      download fallback.
