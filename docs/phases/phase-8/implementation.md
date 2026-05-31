# Phase 8 — Implementation Report

**Status:** ✅ Completed
**Dependencies satisfied:** Phases 3–7 (the entities whose events audit records; detail pages host the timelines).

Phase 8 delivers the **Audit module**: a searchable global `/audit` page with filters, per-entity
activity timelines embedded in every detail page, and a polling `<AuditFeed>` dashboard widget.
Audit is **read-only** (no HTTP write endpoint exists) and, by product decision, **ADMIN-only on the
FE** (`audit.read: ['ADMIN']`).

> **Visibility:** audit is high-volume and reserved for ADMIN. Every audit surface is gated to ADMIN
> — the `/audit` route (`ProtectedRoute roles={['ADMIN']}`), the sidebar item, the per-entity
> tab/cards (`RoleGate roles={['ADMIN']}`), and the dashboard feed. The backend controller still
> permits all three roles (`@Roles(ADMIN, DETECTIVE, ANALYST)`), so this is **UX gating, not
> security** — DETECTIVE/ANALYST simply never see the surfaces. If audit should ever be exposed to
> more roles again, widen `audit.read` in `src/auth/permissions.ts` and the `RoleGate`/route guards.

---

## Surfaces

| Surface | Route / location | Source |
|---|---|---|
| Global audit search | `/audit` (sidebar; **ADMIN only**) | `GET /audit` (filtered) |
| Case activity | `/cases/:id` → **Audit** tab | `GET /audit/entity/Case/:id` |
| Evidence activity | `/evidence/:id` → **Activity** card | `GET /audit/entity/Evidence/:id` |
| Task activity | `/tasks/:id` → **Activity** card | `GET /audit/entity/Task/:id` |
| Involved activity | `/involved/:id` → **Activity** card | `GET /audit/entity/InvolvedPerson/:id` |
| Dashboard feed | `/` → **Recent activity** widget | `GET /audit?limit=10` polled 30 s |

The `/audit` sidebar item existed since the shell was built but had **no route** (it fell through to
the dashboard); this phase adds it.

## Backend integrations (`BACKEND_INVESTIGATION_REPORT.md` §3.10, §5.9, §6.5, §7)

| Endpoint | Hook | Notes |
|---|---|---|
| `GET /audit` | `useAuditListQuery(query)` | snake_case params via `toAuditParams`; `staleTime 0`, `keepPreviousData` |
| `GET /audit` (limit 10) | `useAuditFeedQuery()` | dashboard widget; `refetchInterval 30s`, not in background |
| `GET /audit/entity/:type/:id` | `useEntityAuditQuery(type, id)` | chronological ASC, no pagination; polls 60 s on detail focus |
| `GET /audit/:id` | `useAuditDetailQuery(id)` | single record (the table reuses the cached row instead) |

By-user queries reuse `GET /audit` with the `user_id` filter — no separate route needed.

## Field-casing boundary (guardrail)

`services/audit/audit.api.ts` is the **only** place audit snake_case lives. `toAuditParams` maps the
camelCase `AuditQuery` → `entity_type`, `entity_id`, `user_id`, `from_date`, `to_date`, `action`
(+ `page`, `limit`). The rest of the app is camelCase. Template: api-integration.md §6.

## Key data facts handled

- **`entityType` is PascalCase singular** on the wire (`Case | Evidence | Task | InvolvedPerson |
  Media`) — **not** the media enums. The per-entity panels pass these exact strings; `auditCatalog`
  maps them to labels and to FE detail routes (`entityLink`).
- **`userId === "system"`** (e.g. `TASK_OVERDUE`) renders as **"System"** with a `Cog` icon via
  `<ActorLabel>`, never a UUID. Real users resolve to names via `useDisplayNames`; unknown subs fall
  back to a short `font-mono` id.
- **Media-row gotcha:** in a `Media` audit row, `entityType="Media"` while
  `eventPayload.payload.entity_type` is the *referenced* entity. We display the row's own
  `entityType` and surface the full payload in the detail dialog — no implicit reinterpretation.
- **Action catalog** drives the action filter and badges (`auditCatalog.ts`): friendly labels,
  semantic tones (create=success, transfer=warning, overdue=destructive, …), and icons.

## File map

### `src/services/audit/`
- `audit.types.ts` — `AUDIT_ENTITY_TYPES`, `AUDIT_ACTIONS`, `AuditRecord`, `AuditQuery`, responses.
- `audit.api.ts` — `auditApi.{list, listByEntity, getById}` + `toAuditParams` (snake_case mapper).
- `audit.queryKeys.ts` — `all/lists/list/feed/entity/detail`.
- `audit.queries.ts` — `useAuditListQuery`, `useEntityAuditQuery`, `useAuditFeedQuery`, `useAuditDetailQuery`.

### `src/features/audit/`
- `auditCatalog.ts` — `ACTION_LABEL/TONE`, `actionIcon`, `ENTITY_TYPE_LABEL`, `isSystemActor`, `entityLink`.
- `components/ActorLabel.tsx` — actor → name / "System" / short id.
- `components/AuditActionBadge.tsx` — toned badge + icon for an action.
- `components/AuditTimeline.tsx` — vertical chronological timeline with expandable `font-mono` JSON.
- `components/EntityAuditPanel.tsx` — reusable per-entity wrapper (used by all four detail pages).
- `components/AuditFilters.tsx` — URL-driven filter bar (entityType/action selects, userId/entityId
  text debounced, from/to date inputs, Clear).
- `components/AuditTable.tsx` — desktop `DataTable` + mobile card list; row → detail dialog.
- `components/AuditDetailDialog.tsx` — full record inspector (state diff + envelope as JSON).
- `components/AuditFeed.tsx` — dashboard widget, polls 30 s.
- `pages/AuditPage.tsx` — List archetype: filters + table + pagination, all deep-linkable via URL.

### Wiring (edits)
- `app/routes.tsx` — `/audit` route (all roles).
- `cases/pages/CaseDetailPage.tsx` — filled the Audit tab (removed the Phase-8 placeholder).
- `evidence|tasks|involved` detail pages — added an **Activity** card.
- `dashboard/DashboardPage.tsx` — added `<AuditFeed/>`.

## Deviation from the plan (agreed)

The plan suggested the dashboard feed poll with `from_date=<lastSeen>` and **merge by `eventId`**.
We implemented a **simple latest-N refetch** every 30 s instead: a fresh snapshot of the most recent
rows is inherently deduped and always reflects current state, with less code and no stale-merge bugs.
The visible result (a deduped recent feed) is identical for a "recent activity" widget.

## Visual / design-system

- `/audit` follows the **List** archetype; rows render compact (`text-sm`) — the audit-specific
  default per design-system §5. A global density toggle is not part of this phase.
- IDs and JSON use `font-mono` (§3); state/payload blocks scroll with `.scrollbar-thin`.
- Action badges use semantic tokens only (§2-style mapping); per-entity timelines use a left rail.
- Verified at 375 / 768 / 1440; the audit list collapses to cards on `< md`.

## Dependencies

None added.
