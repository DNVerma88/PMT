import { useAuth } from '../features/auth/useAuth';

/**
 * Client-side permission check hook.
 * Backend is always the authoritative source of truth.
 *
 * @param permission - Permission string in 'resource:action' format
 * @returns true if the current user has the permission
 *
 * @example
 * const canCreate = usePermission('release_plans:create');
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Check multiple permissions at once.
 * @param permissions - Array of 'resource:action' strings
 * @param mode - 'all' requires all permissions; 'any' requires at least one
 */
export function usePermissions(
  permissions: string[],
  mode: 'all' | 'any' = 'all',
): boolean {
  const { hasPermission } = useAuth();

  if (mode === 'any') {
    return permissions.some((p) => hasPermission(p));
  }
  return permissions.every((p) => hasPermission(p));
}
