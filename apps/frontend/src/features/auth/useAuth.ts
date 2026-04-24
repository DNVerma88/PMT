import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import type { CurrentUser } from '../../services/auth.service';

export function useAuth(): {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  error: string | null;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
} {
  const { user, isAuthenticated, isCheckingAuth, isLoggingIn, error } = useSelector(
    (state: RootState) => state.auth,
  );

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => user.roles.includes(r));
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    return user.permissions.includes(permission);
  };

  return { user, isAuthenticated, isCheckingAuth, isLoggingIn, error, hasRole, hasPermission };
}
