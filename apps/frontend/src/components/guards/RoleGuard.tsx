import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { EmptyState } from '../common/EmptyState';
import { Lock } from '@mui/icons-material';

interface RoleGuardProps {
  children: React.ReactNode;
  /** User must have at least one of these roles */
  allowedRoles: string[];
  /** When true, renders an access-denied message instead of redirecting */
  showError?: boolean;
}

/**
 * Client-side role guard. Backend is the authoritative source of truth.
 * This guard only affects UI rendering and routing.
 */
export function RoleGuard({ children, allowedRoles, showError = false }: RoleGuardProps) {
  const { hasRole } = useAuth();

  if (!hasRole(allowedRoles)) {
    if (showError) {
      return (
        <EmptyState
          icon={<Lock sx={{ fontSize: 48 }} />}
          title="Access Denied"
          description="You don't have permission to view this page."
        />
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
