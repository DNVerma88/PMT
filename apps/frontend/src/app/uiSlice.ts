import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'light' | 'dark';
type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
}

interface UiState {
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  notifications: Notification[];
  sessionExpiring: boolean;
}

const initialState: UiState = {
  themeMode: (localStorage.getItem('themeMode') as ThemeMode) ?? 'light',
  sidebarOpen: true,
  notifications: [],
  sessionExpiring: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', state.themeMode);
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
      localStorage.setItem('themeMode', state.themeMode);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    showNotification(
      state,
      action: PayloadAction<{ message: string; severity?: NotificationSeverity }>,
    ) {
      state.notifications.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message: action.payload.message,
        severity: action.payload.severity ?? 'info',
      });
      // Keep at most 5 queued notifications
      if (state.notifications.length > 5) {
        state.notifications.shift();
      }
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    setSessionExpiring(state, action: PayloadAction<boolean>) {
      state.sessionExpiring = action.payload;
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  showNotification,
  dismissNotification,
  setSessionExpiring,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
