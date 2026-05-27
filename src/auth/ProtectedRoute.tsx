import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from './permissions';

interface ProtectedRouteProps {
  roles?: readonly Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    toast.error("You don't have permission to view this page");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
