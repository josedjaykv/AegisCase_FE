# Business Workflows → Screens

> Originally §7 of CLAUDE.md. Load this doc to map a backend workflow onto the corresponding route(s) and component tree before starting a feature.

Each workflow from `BACKEND_INVESTIGATION_REPORT.md` §6 maps to a route and a small component tree.

| Workflow | Screens | Components |
|---|---|---|
| Login / refresh | `/login` | `LoginForm`, `AuthProvider` |
| Investigation lifecycle | `/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit` | `CaseList`, `CaseForm`, `CaseDetail`, `CaseStatusPicker`, `ArchiveButton` |
| Team management | `/cases/:id/team` | `TeamMemberList`, `AddTeamMemberDialog` |
| Involved persons | `/involved`, `/involved/:id`, `/cases/:id/involved` | `InvolvedList`, `InvolvedForm`, `LinkToCaseDialog` |
| Evidence + COC | `/cases/:id/evidence`, `/evidence/:id`, `/evidence/:id/chain` | `EvidenceList`, `EvidenceViewDialog`, `EvidenceForm`, `TransferCustodyDialog`, `CustodyChainTimeline` |
| Task lifecycle | `/tasks`, `/tasks/:id`, `/cases/:id/tasks` | `TaskBoard`, `TaskForm`, `TaskStatusPicker`, `OverdueBadge` |
| Media | embedded in case/evidence/task/involved pages + `/media/upload` | `MediaUpload`, `MediaGallery`, `MediaDownloadLink` |
| Audit | `/audit`, `/cases/:id/audit`, `/audit/user/:id` | `AuditFilters`, `AuditFeed`, `AuditTimeline` |
| User admin | `/users`, `/users/new`, `/users/:id` | `UserList`, `UserForm` (ADMIN-only) |

## Critical UX flows

- **Creating a case** → form → on success, redirect to `/cases/:id` with team-builder prompt.
- **Viewing evidence detail** → list → click → `EvidenceViewDialog` ("This will record you as the current custodian. Continue?") → on confirm, fetch `GET /evidence/:id` → render detail.
- **Transferring custody** → from detail → `TransferCustodyDialog` selects new custodian and reason → invalidates evidence + COC queries.
- **Uploading media** → from any entity detail → drag-and-drop → local size/MIME hint → multipart upload with progress → on success, append to gallery (TanStack Query optimistic update).
- **Browsing audit** → top-level audit page with filters; per-entity tab on every entity detail showing chronological timeline.
