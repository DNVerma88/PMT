import { useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { dismissNotification, setSessionExpiring, type Notification } from '../../app/uiSlice';
import type { RootState } from '../../app/store';
import { logout } from '../../features/auth/authSlice';

/**
 * Renders MUI Snackbar alerts for queued notifications and a persistent
 * session-expiring warning banner.
 * Mount this once inside <App /> so it is always in the tree.
 */
export function GlobalNotifications() {
  const dispatch = useAppDispatch();
  const notifications = useSelector((s: RootState) => s.ui.notifications);
  const sessionExpiring = useSelector((s: RootState) => s.ui.sessionExpiring);

  const current: Notification | undefined = notifications[0];

  const handleClose = (_: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    if (current) dispatch(dismissNotification(current.id));
  };

  const handleRefresh = () => {
    dispatch(setSessionExpiring(false));
    // Re-check auth to trigger a silent refresh via /auth/refresh
    window.location.reload();
  };

  const handleLogout = () => {
    dispatch(setSessionExpiring(false));
    dispatch(logout());
  };

  return (
    <>
      {/* Queued toast notifications */}
      {current && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleClose}
            severity={current.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {current.message}
          </Alert>
        </Snackbar>
      )}

      {/* Session-expiry warning — persistent until dismissed */}
      {sessionExpiring && (
        <Snackbar
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity="warning"
            variant="filled"
            action={
              <>
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Stay logged in
                </Button>
                <Button color="inherit" size="small" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            }
          >
            Your session expires soon. Would you like to stay logged in?
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
