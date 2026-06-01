# Feature 007 — Evidence media gated by chain of custody

**Status:** ✅ Shipped
**Date:** 2026-05-30
**Phase:** 7 (Media)
**Scope:** Frontend + backend (`PATCH /evidence/:id/take-custody` implemented backend-side)

## Summary

For **evidence** media files, **downloading requires holding custody**. **Viewing/previewing stays
open** (Option C — "view = log, download = custody"). When a non-custodian clicks **Download** (on a
gallery tile or inside the in-app viewer), a confirmation appears explaining that custody will be
transferred to them and recorded; on confirm, the app takes custody (writing a chain-of-custody row)
and then downloads. Custodians — and **all non-evidence entities** (CASE/TASK/INVOLVED_PERSON) —
download directly with no prompt.

## Motivation (why)

The evidence *record* (`GET /evidence/:id`) was already custody-protected via `EvidenceViewDialog`,
but the evidence **files** (the actual content — scene photos, videos) were freely viewable and
downloadable by anyone with `evidence.read`, leaving no trace. The file is the most sensitive part,
so it was paradoxically the least protected. This closes that gap and aligns media access with how
chain of custody works for the record.

> This is a **traceability + accountability** layer, not DRM: since viewing already serves the
> bytes, the goal is the *record* of who deliberately took the file, not preventing copies.

## Backend changes

- **`PATCH /evidence/:id/take-custody`** (shipped) — all three roles; the caller self-assigns
  custody and the backend writes a chain-of-custody row with a fixed reason (e.g. "Accessed evidence
  file"). Idempotent when the caller already holds custody. Returns the updated `Evidence`.
- **Download enforcement (server-authoritative):** `GET /media/:id/download-url?disposition=attachment`
  should 403 for non-custodians of evidence media (FE gating is UX only, not security).
- **View-access audit:** logging *views* of evidence media is deferred to Phase 8 (Audit).

Full backend contract + acceptance criteria:
[`../phases/phase-7/backend-prompt-evidence-media-custody.md`](../phases/phase-7/backend-prompt-evidence-media-custody.md).

## Frontend changes

| File | Change |
|------|--------|
| `services/evidence/evidence.api.ts` | New `takeCustody(id)` → `PATCH /evidence/:id/take-custody`. |
| `services/evidence/evidence.queries.ts` | New `useTakeCustodyMutation(id)` — seeds the detail cache and invalidates chain + lists so the gate flips immediately. |
| `features/media/components/MediaGallery.tsx` | New optional `custodyGate` prop (`{ isCustodian, takeCustody }`). All downloads route through one `requestDownload`; non-custodians get a `<ConfirmDialog>` ("Take custody to download?") → `takeCustody()` → download. |
| `features/media/components/MediaViewerDialog.tsx` | Download button no longer downloads itself — it calls the `onDownload` provided by the gallery, so the custody gate applies in the viewer too. |
| `features/evidence/pages/EvidenceDetailPage.tsx` | Wires the gate: `isCustodian = currentCustodianId === user.sub`; passes `takeCustody` from the mutation. |

## Behavior / rules

- Gate applies **only** when `MediaGallery` receives a `custodyGate` — i.e. only on the evidence
  detail page. CASE/TASK/INVOLVED galleries are unaffected.
- **View** is never gated (Option C). Thumbnails and the in-app viewer open normally.
- **Download** by a non-custodian → confirm → take custody (chain-of-custody row) → download.
- **Download** by the custodian → straight to the file, no prompt.
- After taking custody, `isCustodian` flips immediately (cache seeded), so further downloads are
  direct.

## How to test

`docs/phases/phase-7/manual-testing.md` §7b: on an evidence whose custodian is someone else, view a
file (works), then Download → confirm → custody row added + file downloads → second Download is
direct.

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- The FE gate is UX/traceability only; **download protection is real only once the backend 403s**
  non-custodians on `disposition=attachment` (Change 2 of the backend prompt). Until then a
  determined user could still presign directly.
- Viewing is intentionally ungated, so the bytes are reachable by anyone with `evidence.read`; the
  *audit* of views lands in Phase 8.
