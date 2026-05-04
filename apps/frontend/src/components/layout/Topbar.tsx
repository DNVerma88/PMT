import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  DarkMode,
  FolderOpen,
  LightMode,
  Logout,
  Menu as MenuIcon,
  Person,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../app/store';
import { toggleTheme } from '../../app/uiSlice';
import { logout } from '../../features/auth/authSlice';
import { useAuth } from '../../features/auth/useAuth';
import { setSidebarOpen } from '../../app/uiSlice';
import { useProject } from '../../context/ProjectContext';
import { NotificationBell } from '../notifications/NotificationBell';

export const TOPBAR_HEIGHT = 64;

export function Topbar() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const themeMode = useSelector((s: RootState) => s.ui.themeMode);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isAdmin = hasRole(['SUPER_ADMIN', 'ADMIN']);

  const { projects, activeProject, setActiveProject, isLoading: projectsLoading } = useProject();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleLogout = async () => {
    setAnchorEl(null);
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '?';

  const userDisplayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="default"
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {isMobile && (
          <IconButton
            aria-label="Open sidebar"
            edge="start"
            onClick={() => dispatch(setSidebarOpen(true))}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" component="div" fontWeight={700} color="primary" sx={{ flexGrow: 1 }}>
          {!isMobile ? '' : 'PMT'}
        </Typography>

        {/* Project selector (hidden when only 1 project and non-admin) */}
        {projects.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1, minWidth: 0 }}>
            {!isMobile && <FolderOpen fontSize="small" color="action" />}
            {projectsLoading ? (
              <CircularProgress size={18} />
            ) : (
              <Select
                size="small"
                value={activeProject?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value as string;
                  if (id === '') {
                    setActiveProject(null);
                  } else {
                    const p = projects.find((x) => x.id === id) ?? null;
                    setActiveProject(p);
                  }
                }}
                displayEmpty
                sx={{ minWidth: { xs: 90, sm: 160, md: 180 }, maxWidth: { xs: 130, sm: 220 }, fontSize: 14 }}
                renderValue={(v) => {
                  if (!v) return <em style={{ color: '#999' }}>{isMobile ? 'All' : 'All Projects'}</em>;
                  const p = projects.find((x) => x.id === v);
                  if (!p) return v;
                  // On mobile: show only the code chip to save space
                  return isMobile
                    ? <Chip label={p.code} size="small" sx={{ height: 18, fontSize: 11 }} />
                    : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip label={p.code} size="small" sx={{ height: 18, fontSize: 11 }} />
                        <span>{p.name}</span>
                      </Box>
                    );
                }}
              >
                {isAdmin && (
                  <MenuItem value="">
                    <em>All Projects</em>
                  </MenuItem>
                )}
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Chip label={p.code} size="small" sx={{ mr: 1, height: 18, fontSize: 11 }} />
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>
        )}

        {/* Theme toggle — hidden on xs (moved into user menu) */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Tooltip title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton
              onClick={() => dispatch(toggleTheme())}
              aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {themeMode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <Tooltip title={userDisplayName || 'Account'}>
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="User account menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? 'user-menu' : undefined}
          >
            <Avatar
              sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}
              aria-hidden="true"
            >
              {userInitials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" fontWeight={600}>
              {userDisplayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
            <Person fontSize="small" sx={{ mr: 1.5 }} />
            Profile
          </MenuItem>
          {/* Theme toggle inside menu on mobile */}
          <MenuItem
            onClick={() => { dispatch(toggleTheme()); setAnchorEl(null); }}
            sx={{ display: { sm: 'none' } }}
          >
            {themeMode === 'light' ? <DarkMode fontSize="small" sx={{ mr: 1.5 }} /> : <LightMode fontSize="small" sx={{ mr: 1.5 }} />}
            {themeMode === 'light' ? 'Dark mode' : 'Light mode'}
          </MenuItem>
          <MenuItem onClick={handleLogout} aria-label="Sign out">
            <Logout fontSize="small" sx={{ mr: 1.5 }} />
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
