import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { StyleguidePage } from '@/features/styleguide/StyleguidePage';
import { UserListPage } from '@/features/users/pages/UserListPage';
import { UserNewPage } from '@/features/users/pages/UserNewPage';
import { UserDetailPage } from '@/features/users/pages/UserDetailPage';
import { CaseListPage } from '@/features/cases/pages/CaseListPage';
import { CaseNewPage } from '@/features/cases/pages/CaseNewPage';
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage';
import { CaseEditPage } from '@/features/cases/pages/CaseEditPage';
import { CaseTeamPage } from '@/features/cases/pages/CaseTeamPage';
import { InvolvedListPage } from '@/features/involved/pages/InvolvedListPage';
import { InvolvedNewPage } from '@/features/involved/pages/InvolvedNewPage';
import { InvolvedDetailPage } from '@/features/involved/pages/InvolvedDetailPage';
import { InvolvedEditPage } from '@/features/involved/pages/InvolvedEditPage';
import { env } from '@/lib/env';

export function AppRoutes() {
  return (
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
