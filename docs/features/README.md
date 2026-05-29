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
