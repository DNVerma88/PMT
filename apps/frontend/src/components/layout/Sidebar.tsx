import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountTree,
  AdminPanelSettings,
  Assessment,
  Article,
  BeachAccess,
  ChevronLeft,
  ChevronRight,
  Dashboard,
  DashboardCustomize,
  DonutSmall,
  Download,
  FolderOpen,
  Groups,
  Hub,
  NotificationsNone,
  RocketLaunch,
  ViewList,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../app/store';
import { toggleSidebar, setSidebarOpen } from '../../app/uiSlice';
import { useAuth } from '../../features/auth/useAuth';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[]; // If set, only these roles can see this item
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
  { label: 'Portfolio', path: '/portfolio', icon: <DashboardCustomize /> },
  { label: 'Roadmap', path: '/roadmap', icon: <AccountTree /> },
  { label: 'Release Cadence', path: '/release-cadence', icon: <RocketLaunch /> },
  { label: 'Productivity', path: '/productivity', icon: <Assessment /> },
  { label: 'Headcount', path: '/headcount', icon: <Groups /> },
  { label: 'Saved Views', path: '/saved-views', icon: <ViewList /> },
  { label: 'Sprint Metrics', path: '/sprint-metrics', icon: <DonutSmall /> },
  { label: 'Leaves', path: '/leaves', icon: <BeachAccess /> },
  { label: 'WSR', path: '/wsr', icon: <Article /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsNone /> },
  { label: 'Exports', path: '/exports', icon: <Download /> },
  { label: 'Integrations', path: '/integrations', icon: <Hub /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Projects', path: '/projects', icon: <FolderOpen />, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Admin', path: '/admin', icon: <AdminPanelSettings />, roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen);
  const { hasRole } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const width = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  const drawerContent = (
    <Box
      sx={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          px: sidebarOpen ? 2 : 1,
          py: 2,
          minHeight: 64,
        }}
      >
        {sidebarOpen && (
          <Typography variant="h6" fontWeight={700} color="primary" noWrap>
            PMT
          </Typography>
        )}
        <Tooltip title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <IconButton
            onClick={() => dispatch(toggleSidebar())}
            size="small"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      {/* Main navigation */}
      <List component="nav" aria-label="Main navigation" sx={{ flexGrow: 1, px: 0.5, pt: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip
                title={!sidebarOpen ? item.label : ''}
                placement="right"
                disableHoverListener={sidebarOpen}
              >
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  selected={isActive}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  sx={{
                    borderRadius: 1.5,
                    px: sidebarOpen ? 1.5 : 1,
                    py: 1,
                    justifyContent: sidebarOpen ? 'initial' : 'center',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: sidebarOpen ? 36 : 'auto',
                      color: isActive ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {sidebarOpen && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Admin section */}
      {ADMIN_ITEMS.some((item) => !item.roles || hasRole(item.roles)) && (
        <>
          <Divider />
          <List component="nav" aria-label="Admin navigation" sx={{ px: 0.5, py: 1 }}>
            {ADMIN_ITEMS.map((item) => {
              if (item.roles && !hasRole(item.roles)) return null;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip
                    title={!sidebarOpen ? item.label : ''}
                    placement="right"
                    disableHoverListener={sidebarOpen}
                  >
                    <ListItemButton
                      component={NavLink}
                      to={item.path}
                      selected={isActive}
                      aria-label={item.label}
                      sx={{
                        borderRadius: 1.5,
                        px: sidebarOpen ? 1.5 : 1,
                        py: 1,
                        justifyContent: sidebarOpen ? 'initial' : 'center',
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: sidebarOpen ? 36 : 'auto',
                          color: isActive ? 'inherit' : 'text.secondary',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {sidebarOpen && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => dispatch(setSidebarOpen(false))}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          transition: 'width 0.25s ease',
          overflowX: 'hidden',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
