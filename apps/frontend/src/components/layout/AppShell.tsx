import { Box, BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from '@mui/material';
import { Dashboard, AccountTree, RocketLaunch, Assessment, Groups } from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar, TOPBAR_HEIGHT } from './Topbar';
import { ErrorBoundary } from '../common/ErrorBoundary';

const BOTTOM_NAV_HEIGHT = 56;

const BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard',  path: '/dashboard',       icon: <Dashboard /> },
  { label: 'Roadmap',    path: '/roadmap',          icon: <AccountTree /> },
  { label: 'Releases',   path: '/release-cadence',  icon: <RocketLaunch /> },
  { label: 'Productivity', path: '/productivity',   icon: <Assessment /> },
  { label: 'Headcount',  path: '/headcount',        icon: <Groups /> },
];

export function AppShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active bottom nav index
  const activeIndex = BOTTOM_NAV_ITEMS.findIndex((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <Topbar />

        <Box
          sx={{
            flexGrow: 1,
            mt: `${TOPBAR_HEIGHT}px`,
            // Extra bottom padding on mobile so content isn't hidden behind bottom nav
            pb: { xs: `${BOTTOM_NAV_HEIGHT + 8}px`, md: 0 },
            p: { xs: 2, md: 3 },
            overflowY: 'auto',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>

      {/* ── Mobile bottom navigation ── */}
      {isMobile && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            // Respect iOS safe-area (notch/home indicator)
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={activeIndex === -1 ? false : activeIndex}
            onChange={(_, newIndex) => navigate(BOTTOM_NAV_ITEMS[newIndex].path)}
            sx={{ height: BOTTOM_NAV_HEIGHT }}
          >
            {BOTTOM_NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                sx={{ minWidth: 0, px: 0.5, '& .MuiBottomNavigationAction-label': { fontSize: 10 } }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

