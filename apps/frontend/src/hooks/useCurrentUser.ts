import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import type { CurrentUser } from '../services/auth.service';

/** Returns the currently authenticated user or null */
export function useCurrentUser(): CurrentUser | null {
  return useSelector((state: RootState) => state.auth.user);
}
