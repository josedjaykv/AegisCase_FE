# Phase 9 — Polling-driven real-time approximation & polish

**Status:** ⬜ Not started
**Duration estimate:** 3–4 days
**Dependencies:** Phases 1–8

## Objective

Coordinate polling, optimistic updates, tab-visibility pause; toast on newly-overdue tasks; E2E suite.

## Deliverables

- `useVisibility` hook gating polling.
- Optimistic UI on task status changes.
- Playwright E2E covering the 3 critical flows (login, evidence view-dialog, task lifecycle).
- Sentry integration.

## Backend integrations

None new.

## Success criteria

Tab in background does not poll; rate-limit budget stays under 100/60s in normal usage; E2E green in CI.

## Required reading before starting

- `CLAUDE.md` (always)
- [`docs/architecture/api-integration.md`](../../architecture/api-integration.md) — §5 polling strategy table; `refetchIntervalInBackground: false`
- [`docs/architecture/quality-gates.md`](../../architecture/quality-gates.md) — polling budget ≤ 60 req/60s, Sentry error rate < 0.5 %
- [`docs/architecture/architecture.md`](../../architecture/architecture.md) — §3 error handling for E2E expectations
- `BACKEND_INVESTIGATION_REPORT.md` §12.7 (rate limits) and §16 (testing checklist — match the E2E coverage)

## Implementation notes

- `useVisibility` reads `document.visibilityState`; pause all polling queries when hidden, resume on visible.
- Optimistic updates on task status: mutate cache → call API → revert + toast on failure.
- Playwright suite: 3 flows at minimum — happy-path login (all 3 roles), evidence view dialog (read-only path vs. confirm-and-mutate path), task lifecycle (create → in_progress → completed).
- Sentry init: lazy (`import('@sentry/browser')` only when `VITE_SENTRY_DSN` is set); strip JWT and PII from breadcrumbs.
- New-overdue toast: compare task IDs in the latest poll's `OVERDUE` column against the previous snapshot; toast for ones not previously overdue.
