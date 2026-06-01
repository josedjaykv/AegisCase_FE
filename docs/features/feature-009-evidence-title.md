# Feature 009 — Evidence title field

**Status:** ✅ Shipped (FE + backend)
**Date:** 2026-05-30
**Phase:** 5 (Evidence)
**Scope:** Frontend + backend (both delivered)

## Summary

Evidence registration/editing now has a short **Title** in addition to the existing **Description**
and all the other fields (type, custodian, …). This separates a concise label from the long body —
e.g. **Title:** `Testimonio de Juanito`, **Description:** the full written testimony.

`title` is **required** on the FE create/edit form. It is shown as the heading in the evidence
list, the mobile cards and the detail page, with a **fallback to `description`** for evidence
created before this field existed.

## Motivation (why)

Previously the only free-text field was `description`, which doubled as the heading everywhere. That
forced long content and short labels into one field — unworkable for things like a full testimony,
where you want a scannable title (“Testimonio de Juanito”) and a separate long body.

## Backend changes (delivered)

`evidence-service` added a nullable `title varchar(200)` column (migration
`002-evidence-add-title.sql`), `title?` whitelisted in `CreateEvidenceDto`/`UpdateEvidenceDto`
(`@IsOptional() @IsString() @MaxLength(200)`), persisted, returned on every read, and included in
the `evidence.added` event payload / `EVIDENCE_ADDED` audit `newState`. `title` is **optional on the
backend** (normalized to `null` when omitted) and **required on the FE**. Full contract:
[`../phases/phase-5/backend-prompt-evidence-title.md`](../phases/phase-5/backend-prompt-evidence-title.md).

Because `title` lands in the `EVIDENCE_ADDED` audit `newState`, it also shows up automatically in the
Audit timelines (Phase 8) when you expand a record's details.

## Frontend changes

| File | Change |
|------|--------|
| `services/evidence/evidence.types.ts` | `title?` on `Evidence`; `title` on `CreateEvidenceInput`; `title?` on `UpdateEvidenceInput`. |
| `services/evidence/evidence.schemas.ts` | `title: min(1).max(200)` added to create + update schemas (required). |
| `features/evidence/components/EvidenceForm.tsx` | New **Title** input (above Type); included in create/update payloads; added to the 400-fieldError mapping. |
| `features/evidence/pages/EvidenceDetailPage.tsx` | Heading uses `title` (fallback `description`); description now rendered as its own block. |
| `features/evidence/components/EvidenceList.tsx` | "Description" column → **"Title"** (`title` with `description` fallback). |
| `features/evidence/components/EvidenceCard.tsx` | Mobile heading uses `title` (fallback `description`). |

## Design notes

- **Title required on FE, nullable on backend** — keeps data quality high for new entries while
  staying backward-compatible with existing rows (which render their `description` as the heading).
- Description stays a multiline textarea (holds the long testimony); title is a single-line input
  capped at 200 chars.

## How to test

`docs/phases/phase-5/manual-testing.md` (evidence) + quick check:
1. Register evidence → a **Title** field is required; set Title `Testimonio de Juanito` and a long
   Description → save. `POST /evidence` body includes `title`.
2. The list/cards/detail show the **title** as the heading; the detail shows the description below.
3. Edit evidence → title prefilled and editable.
4. An older evidence with no title still shows its description as the heading (fallback).

Local gates: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` — all green.

## Known limitations

- None outstanding. Evidence created before this feature has `title = null` and renders its
  `description` as the heading (fallback).
