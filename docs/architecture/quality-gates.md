# Success Metrics & Quality Gates

> Originally §11 of CLAUDE.md. Load this doc before declaring a phase complete, or when reviewing PRs for compliance.

| Metric | Target |
|---|---|
| Lighthouse Performance (login + dashboard) | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Initial JS bundle (gzipped) per route | ≤ 350 KB |
| TanStack Query cache hit rate on warm navigation | ≥ 60% |
| Unit/integration coverage | ≥ 70% global, ≥ 90% in `services/`, `auth/` |
| Axe-core violations in CI | 0 (critical + serious) |
| Sentry error rate (post-launch) | < 0.5 % of sessions |
| Polling budget (steady-state, single tab) | ≤ 60 req/60s (well under gateway 100/60s) |

## Hard checklist before V1 ship

- [ ] All three roles complete a smoke run: login → dashboard → case lifecycle → logout.
- [ ] `GET /evidence/:id` is never invoked without explicit user confirmation.
- [ ] Token refresh works transparently and does not loop on Keycloak 503.
- [ ] Closed-case modification attempts surface "A closed case cannot be modified" inline.
- [ ] Analyst cannot send `CANCELLED`; UI removes the option.
- [ ] Media upload rejects > 50 MB before hitting the network.
- [ ] Presigned download URL is fetched lazily and opens directly (no proxy).
- [ ] Audit queries use snake_case at the network boundary; UI shows camelCase only.
- [ ] All entity detail pages render the audit tab populated for that entity.
- [ ] Rate-limit (`429`) is handled with back-off; no crash.
- [ ] Every screen verified on mobile (`375 × 812`), tablet (`768 × 1024`), and desktop (`1440 × 900`).
- [ ] Kanban board: drag-and-drop on desktop, tap-to-change-status on mobile; analyst restrictions visible and enforced; keyboard navigation works.
