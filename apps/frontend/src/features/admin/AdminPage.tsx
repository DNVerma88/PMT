import { useState } from 'react';
import {
  Box, Card, CardContent, Chip, Typography, Tab, Tabs, Stack, Button,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  InputAdornment, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Add, Search, ExpandMore, ManageAccounts, AdminPanelSettings,
  FolderOpen, Settings, Refresh, PersonOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useAdminUsers, useAdminRoles, useCreateAdminUser, useDeleteAdminUser,
  type AdminUser, type RoleWithPermissions,
} from './useAdmin';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', INACTIVE: 'warning', SUSPENDED: 'error',
};

// ── Create User Dialog ────────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: RoleWithPermissions[] }) {
  const create = useCreateAdminUser();
  const [form, setForm] = useState({
    email: '', username: '', password: '', firstName: '', lastName: '', roleIds: [] as string[],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | string[]) => setForm((f) => ({ ...f, [k]: v }));

  const handleClose = () => {
    setForm({ email: '', username: '', password: '', firstName: '', lastName: '', roleIds: [] });
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.email || !form.username || !form.password || !form.firstName || !form.lastName) {
      setError('All fields except role are required.');
      return;
    }
    setSaving(true);
    try {
      await create.mutateAsync(form);
      handleClose();
    } catch (err: any) {
      const msgs = err?.response?.data?.message;
      setError(Array.isArray(msgs) ? msgs.join(', ') : (msgs ?? 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create User</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" gap={2}>
            <TextField label="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} fullWidth required />
            <TextField label="Last Name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} fullWidth required />
          </Stack>
          <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} fullWidth required />
          <TextField
            label="Username" value={form.username}
            onChange={(e) => set('username', e.target.value.toLowerCase())}
            fullWidth required
            helperText="Lowercase letters, numbers, dots, underscores, hyphens"
          />
          <TextField
            label="Password" type="password" value={form.password}
            onChange={(e) => set('password', e.target.value)}
            fullWidth required
            helperText="Min 8 chars — uppercase, lowercase, number, special character"
          />
          <FormControl fullWidth>
            <InputLabel>Roles</InputLabel>
            <Select
              multiple value={form.roleIds} label="Roles"
              onChange={(e) => set('roleIds', e.target.value as string[])}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((id) => {
                    const r = roles.find((x) => x.id === id);
                    return <Chip key={id} label={r?.name ?? id} size="small" />;
                  })}
                </Box>
              )}
            >
              {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete User Dialog ────────────────────────────────────────────────────────
function DeleteUserDialog({ open, user, onClose }: { open: boolean; user: AdminUser | null; onClose: () => void }) {
  const del = useDeleteAdminUser();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await del.mutateAsync(user.id);
      onClose();
    } catch {
      setError('Failed to deactivate user.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate User</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Typography>
          Deactivate <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})?
          They will no longer be able to log in.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
          {deleting ? <CircularProgress size={18} /> : 'Deactivate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── User Management Tab ───────────────────────────────────────────────────────
function UserManagementTab() {
  const [search, setSearch] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const { data: roles } = useAdminRoles();
  const { data: users, isLoading, error, refetch } = useAdminUsers(deferredSearch);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    const t = setTimeout(() => setDeferredSearch(v), 400);
    return () => clearTimeout(t);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <TextField
          size="small"
          placeholder="Search by name, email, username…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ width: 340 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <Stack direction="row" gap={1}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetch()}><Refresh fontSize="small" /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            New User
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load users.</Alert>}

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Roles</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Last Login</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : (users?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No users found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              (users ?? []).map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.firstName} {u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.username}</TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {u.roles.map((r) => <Chip key={r} label={r} size="small" variant="outlined" />)}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.status} size="small" color={STATUS_COLOR[u.status] ?? 'default'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Deactivate user">
                      <span>
                        <IconButton
                          size="small" color="error"
                          disabled={u.status !== 'ACTIVE'}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <PersonOff fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} roles={roles ?? []} />
      <DeleteUserDialog open={Boolean(deleteTarget)} user={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </Box>
  );
}

// ── Roles & Permissions Tab ───────────────────────────────────────────────────
function RolesTab() {
  const { data: roles, isLoading, error } = useAdminRoles();

  if (isLoading) return <Box display="flex" justifyContent="center" pt={3}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load roles.</Alert>;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Roles and permissions are system-managed. Contact your system administrator to modify them.
      </Alert>
      {(roles ?? []).map((role) => (
        <Accordion key={role.id} variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography fontWeight={600}>{role.name}</Typography>
              <Chip label={`${role.permissions.length} permissions`} size="small" color="primary" variant="outlined" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(
              role.permissions.reduce<Record<string, string[]>>((acc, p) => {
                if (!acc[p.resource]) acc[p.resource] = [];
                acc[p.resource].push(p.action);
                return acc;
              }, {})
            ).map(([resource, actions]) => (
              <Box key={resource} mb={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {resource.replace(/_/g, ' ')}
                </Typography>
                <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
                  {actions.map((a) => <Chip key={a} label={a} size="small" />)}
                </Stack>
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        System settings are configured via environment variables. UI-based configuration will be added in a future release.
      </Alert>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Current Configuration</Typography>
        <Stack gap={1.5}>
          {[
            { label: 'Backend Port', value: '3001' },
            { label: 'Database', value: 'PostgreSQL (port 5434)' },
            { label: 'JWT Access Token TTL', value: '15 minutes' },
            { label: 'JWT Refresh Token TTL', value: '7 days' },
            { label: 'Rate Limiting', value: 'Enabled (Throttler)' },
            { label: 'CSRF Protection', value: 'Enabled (double-submit cookie)' },
            { label: 'Audit Logging', value: 'Enabled' },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 220 }}>{label}</Typography>
              <Typography variant="body2" fontFamily="monospace">{value}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
type TabId = 'users' | 'roles' | 'projects' | 'settings';

export function AdminPage() {
  const [tab, setTab] = useState<TabId>('users');
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Administration</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage users, roles, projects, and system configuration.
      </Typography>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            if (v === 'projects') { navigate('/projects'); return; }
            setTab(v as TabId);
          }}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<ManageAccounts fontSize="small" />} iconPosition="start" label="User Management" value="users" />
          <Tab icon={<AdminPanelSettings fontSize="small" />} iconPosition="start" label="Roles & Permissions" value="roles" />
          <Tab icon={<FolderOpen fontSize="small" />} iconPosition="start" label="Projects" value="projects" />
          <Tab icon={<Settings fontSize="small" />} iconPosition="start" label="System Settings" value="settings" />
        </Tabs>
        <CardContent sx={{ pt: 3 }}>
          {tab === 'users' && <UserManagementTab />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'settings' && <SettingsTab />}
        </CardContent>
      </Card>
    </Box>
  );
}
