import { useEffect, useMemo, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Snackbar, Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { router } from './router';
import { createAppTheme } from './theme';
import type { RootState } from './store';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { checkAuthStatus } from '../features/auth/authSlice';
import { ProjectProvider } from '../context/ProjectContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { GlobalNotifications } from '../components/common/GlobalNotifications';

// ── PWA update / offline-ready banners ───────────────────────────────────────
function PwaBanners() {
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const onUpdate  = () => setUpdateReady(true);
    const onOffline = () => setOfflineReady(true);
    window.addEventListener('pwa:update-available', onUpdate);
    window.addEventListener('pwa:offline-ready',   onOffline);
    return () => {
      window.removeEventListener('pwa:update-available', onUpdate);
      window.removeEventListener('pwa:offline-ready',   onOffline);
    };
  }, []);

  return (
    <>
      <Snackbar
        open={updateReady}
        message="A new version of PMT is available."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <Button color="primary" size="small" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        }
      />
      <Snackbar
        open={offlineReady && !updateReady}
        autoHideDuration={4000}
        onClose={() => setOfflineReady(false)}
        message="PMT is ready to work offline."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}

export function App() {
  const dispatch = useAppDispatch();
  const themeMode = useSelector((state: RootState) => state.ui.themeMode);
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  // Check session on app mount (validate httpOnly cookie via /auth/me)
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <ProjectProvider>
          <RouterProvider router={router} />
          <GlobalNotifications />
          <PwaBanners />
        </ProjectProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

