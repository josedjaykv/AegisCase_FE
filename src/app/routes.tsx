import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { StyleguidePage } from '@/features/styleguide/StyleguidePage';
import { UserListPage } from '@/features/users/pages/UserListPage';
import { UserNewPage } from '@/features/users/pages/UserNewPage';
import { UserDetailPage } from '@/features/users/pages/UserDetailPage';
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
