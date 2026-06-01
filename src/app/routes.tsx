import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { env } from '@/lib/env';
import { RouteFallback } from './RouteFallback';

/**
 * Lazily load a page by its **named** export, code-splitting each feature into
 * its own chunk. The shell + LoginPage stay eager (first paint / unauthenticated
 * landing); everything else is fetched on demand. See docs/phases/phase-10.
 */
function lazyPage<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })));
}

const StyleguidePage = lazyPage(() => import('@/features/styleguide/StyleguidePage'), 'StyleguidePage');
const DashboardPage = lazyPage(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage');

const UserListPage = lazyPage(() => import('@/features/users/pages/UserListPage'), 'UserListPage');
const UserNewPage = lazyPage(() => import('@/features/users/pages/UserNewPage'), 'UserNewPage');
const UserDetailPage = lazyPage(() => import('@/features/users/pages/UserDetailPage'), 'UserDetailPage');

const CaseListPage = lazyPage(() => import('@/features/cases/pages/CaseListPage'), 'CaseListPage');
const CaseNewPage = lazyPage(() => import('@/features/cases/pages/CaseNewPage'), 'CaseNewPage');
const CaseDetailPage = lazyPage(() => import('@/features/cases/pages/CaseDetailPage'), 'CaseDetailPage');
const CaseEditPage = lazyPage(() => import('@/features/cases/pages/CaseEditPage'), 'CaseEditPage');
const CaseTeamPage = lazyPage(() => import('@/features/cases/pages/CaseTeamPage'), 'CaseTeamPage');

const InvolvedListPage = lazyPage(() => import('@/features/involved/pages/InvolvedListPage'), 'InvolvedListPage');
const InvolvedNewPage = lazyPage(() => import('@/features/involved/pages/InvolvedNewPage'), 'InvolvedNewPage');
const InvolvedDetailPage = lazyPage(() => import('@/features/involved/pages/InvolvedDetailPage'), 'InvolvedDetailPage');
const InvolvedEditPage = lazyPage(() => import('@/features/involved/pages/InvolvedEditPage'), 'InvolvedEditPage');

const EvidenceListPage = lazyPage(() => import('@/features/evidence/pages/EvidenceListPage'), 'EvidenceListPage');
const CaseEvidenceListPage = lazyPage(() => import('@/features/evidence/pages/CaseEvidenceListPage'), 'CaseEvidenceListPage');
const EvidenceNewPage = lazyPage(() => import('@/features/evidence/pages/EvidenceNewPage'), 'EvidenceNewPage');
const EvidenceDetailPage = lazyPage(() => import('@/features/evidence/pages/EvidenceDetailPage'), 'EvidenceDetailPage');
const EvidenceEditPage = lazyPage(() => import('@/features/evidence/pages/EvidenceEditPage'), 'EvidenceEditPage');
const EvidenceChainPage = lazyPage(() => import('@/features/evidence/pages/EvidenceChainPage'), 'EvidenceChainPage');

const TasksPage = lazyPage(() => import('@/features/tasks/pages/TasksPage'), 'TasksPage');
const CaseTasksPage = lazyPage(() => import('@/features/tasks/pages/CaseTasksPage'), 'CaseTasksPage');
const TaskNewPage = lazyPage(() => import('@/features/tasks/pages/TaskNewPage'), 'TaskNewPage');
const TaskDetailPage = lazyPage(() => import('@/features/tasks/pages/TaskDetailPage'), 'TaskDetailPage');
const TaskEditPage = lazyPage(() => import('@/features/tasks/pages/TaskEditPage'), 'TaskEditPage');

const AuditPage = lazyPage(() => import('@/features/audit/pages/AuditPage'), 'AuditPage');

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            {env.isDev && <Route path="/styleguide" element={<StyleguidePage />} />}

            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/new" element={<UserNewPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
            </Route>

            {/* Cases: read for all authed roles; create/edit gated to ADMIN+DETECTIVE */}
            <Route path="/cases" element={<CaseListPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/cases/:id/team" element={<CaseTeamPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'DETECTIVE']} />}>
              <Route path="/cases/new" element={<CaseNewPage />} />
              <Route path="/cases/:id/edit" element={<CaseEditPage />} />
            </Route>

            {/* Involved persons: read for all authed roles; create/edit gated to ADMIN+DETECTIVE */}
            <Route path="/involved" element={<InvolvedListPage />} />
            <Route path="/involved/:id" element={<InvolvedDetailPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'DETECTIVE']} />}>
              <Route path="/involved/new" element={<InvolvedNewPage />} />
              <Route path="/involved/:id/edit" element={<InvolvedEditPage />} />
            </Route>

            {/* Evidence: read for all authed roles; register/edit gated to ADMIN+DETECTIVE */}
            <Route path="/evidence" element={<EvidenceListPage />} />
            <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
            <Route path="/evidence/:id/chain" element={<EvidenceChainPage />} />
            <Route path="/cases/:id/evidence" element={<CaseEvidenceListPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'DETECTIVE']} />}>
              <Route path="/cases/:id/evidence/new" element={<EvidenceNewPage />} />
              <Route path="/evidence/:id/edit" element={<EvidenceEditPage />} />
            </Route>

            {/* Tasks: read + status/update for all (analyst-own enforced in UI + server);
                create gated to ADMIN+DETECTIVE. Edit route open (server enforces own-task). */}
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/tasks/:id/edit" element={<TaskEditPage />} />
            <Route path="/cases/:id/tasks" element={<CaseTasksPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'DETECTIVE']} />}>
              <Route path="/tasks/new" element={<TaskNewPage />} />
              <Route path="/cases/:id/tasks/new" element={<TaskNewPage />} />
            </Route>

            {/* Audit: ADMIN-only (high-volume; FE-restricted) */}
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/audit" element={<AuditPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
