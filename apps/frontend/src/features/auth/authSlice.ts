import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';
import type { CurrentUser } from '../../services/auth.service';
import type { AppDispatch } from '../../app/store';
import { setSessionExpiring } from '../../app/uiSlice';

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  /** True while the initial /auth/me check is in progress */
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,
  error: null,
};

// ── Session expiry timer ───────────────────────────────────────────────────────

let sessionWarnTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse the exp claim from a JWT access_token cookie (it is httpOnly so we cannot
 * read it directly). Instead we rely on the exp embedded in the user payload
 * returned by /auth/me, which includes a standard `exp` field when the API is
 * set up to return it.  If not available, fall back to a fixed 14-minute window
 * (the access token is 15 min; warn 60s before).
 */
function scheduleSessionWarning(dispatch: AppDispatch, user: CurrentUser) {
  if (sessionWarnTimer) clearTimeout(sessionWarnTimer);

  // Try to get exp from user object if the API surfaces it
  const exp = (user as unknown as { exp?: number })?.exp;
  const nowMs = Date.now();
  const warnBeforeMs = 90_000; // warn 90 seconds before expiry

  const expiresAtMs = exp ? exp * 1000 : nowMs + 14 * 60 * 1000;
  const delayMs = expiresAtMs - nowMs - warnBeforeMs;

  if (delayMs > 0) {
    sessionWarnTimer = setTimeout(() => {
      dispatch(setSessionExpiring(true));
    }, delayMs);
  }
}

// ── Async thunks ──────────────────────────────────────────────────────────────

/** Called on app startup to validate the existing session cookie. */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await authService.getCsrfToken(); // Also bootstraps the CSRF cookie
      const user = await authService.getMe();
      scheduleSessionWarning(dispatch as AppDispatch, user);
      return user;
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const login = createAsyncThunk(
  'auth/login',
  async (
    credentials: { email: string; password: string },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const user = await authService.login(credentials);
      // Login rotates the csrf_token cookie — re-sync in-memory token to match
      await authService.getCsrfToken();
      scheduleSessionWarning(dispatch as AppDispatch, user);
      return user;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      return rejectWithValue(typeof message === 'string' ? message : JSON.stringify(message));
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  if (sessionWarnTimer) {
    clearTimeout(sessionWarnTimer);
    sessionWarnTimer = null;
  }
  try {
    await authService.logout();
  } catch {
    return rejectWithValue('Logout failed');
  }
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUser(state, action: PayloadAction<CurrentUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
  },
  extraReducers: (builder) => {
    // checkAuthStatus
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isCheckingAuth = false;
        state.user = null;
        state.isAuthenticated = false;
      });

    // login
    builder
      .addCase(login.pending, (state) => {
        state.isLoggingIn = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoggingIn = false;
        state.error = (action.payload as string) ?? 'Login failed';
      });

    // logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if server-side logout fails, clear client state
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export const authReducer = authSlice.reducer;
