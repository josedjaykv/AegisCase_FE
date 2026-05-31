# Features

Per-feature documentation. Each new capability we add gets one self-contained file here, numbered sequentially, regardless of which phase it lands in.

## Convention

- **Filename:** `feature-NNN-short-slug.md` (zero-padded 3-digit id, e.g. `feature-002-team-role-management.md`).
- **One file per feature.** Keep it self-contained: motivation, backend changes (if any) + why, frontend changes + why, behavior/rules, how to test, and links to related docs.
- **Numbers are permanent.** Once assigned, a feature id never changes or gets reused.
- **Relationship to phase docs:** the `docs/phases/phase-N/` docs describe the planned scope of a phase. These feature docs describe individual capabilities (often added on top of a shipped phase, sometimes spanning FE + BE). When a feature extends a phase, cross-link both ways.
- For bug fixes, use `docs/fix/` instead.

## Index

| ID | Feature | Status | Phase | Doc |
|----|---------|--------|-------|-----|
| 002 | Team member role management (edit role in a case team) | ✅ Shipped | 3 | [feature-002-team-role-management.md](./feature-002-team-role-management.md) |
| 003 | Cases list: card layout on mobile | ✅ Shipped | 3 | [feature-003-cases-mobile-cards.md](./feature-003-cases-mobile-cards.md) |
| 004 | Case ↔ involved-person link management (roster, edit, unlink, hide-linked) | ✅ Shipped | 4 | [feature-004-case-involved-link-management.md](./feature-004-case-involved-link-management.md) |
| 005 | Collapsible sidebar, themed scrollbars & full-height Kanban | ✅ Shipped | 6 | [feature-005-sidebar-collapse-and-themed-scroll.md](./feature-005-sidebar-collapse-and-themed-scroll.md) |
| 006 | Tasks board: case & assignee filters + create-with-case | ✅ Shipped | 6 | [feature-006-tasks-board-filters-and-global-create.md](./feature-006-tasks-board-filters-and-global-create.md) |
| 007 | Evidence media gated by chain of custody (download = take custody) | ✅ Shipped | 7 | [feature-007-evidence-media-custody-gate.md](./feature-007-evidence-media-custody-gate.md) |
| 008 | Image viewer inspection tools (zoom / rotate / pan / brightness-contrast) | ✅ Shipped | 7 | [feature-008-image-viewer-tools.md](./feature-008-image-viewer-tools.md) |
| 009 | Evidence title field (short label + description) | ✅ Shipped | 5 | [feature-009-evidence-title.md](./feature-009-evidence-title.md) |
| 010 | Editing evidence requires custody (take custody to edit) | ✅ Shipped (FE) · ⏳ backend | 5 | [feature-010-evidence-edit-requires-custody.md](./feature-010-evidence-edit-requires-custody.md) |
| 011 | Read-only evidence summary on reload / deep-link | ✅ Shipped (FE) · ⏳ backend | 5 | [feature-011-evidence-readonly-summary.md](./feature-011-evidence-readonly-summary.md) |
