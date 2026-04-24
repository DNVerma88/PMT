import { useState } from 'react';
import {
  Box, Typography, Stack, Button, Card, CardContent, CardHeader,
  CardActions, Chip, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel,
  FormControl, IconButton, Tooltip, Table, TableBody, TableCell,
  TableHead, TableRow, Paper,
} from '@mui/material';
import {
  Add, Edit, Delete, PersonAdd, PersonRemove, FolderOpen, Check,
} from '@mui/icons-material';
import {
  useAllProjects, useAllUsers, useCreateProject, useUpdateProject,
  useDeleteProject, useAddProjectMember, useRemoveProjectMember, useUpdateMemberRole,
} from './useProjects';
import { useProject } from '../../context/ProjectContext';
import type { Project, ProjectMember } from '../../services/projects.service';

const MEMBER_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'];

// ── Create / Edit Project Dialog ─────────────────────────────────────────────
function ProjectFormDialog({
  open, project, onClose,
}: {
  open: boolean;
  project?: Project;
  onClose: () => void;
}) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [form, setForm] = useState({
    name: project?.name ?? '',
    code: project?.code ?? '',
    description: project?.description ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync form when project prop changes
  useState(() => {
    setForm({ name: project?.name ?? '', code: project?.code ?? '', description: project?.description ?? '' });
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleClose = () => {
    setError('');
    setForm({ name: '', code: '', description: '' });
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required.');
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, data: { name: form.name, code: form.code, description: form.description || undefined } });
      } else {
        await createProject.mutateAsync({ name: form.name, code: form.code, description: form.description || undefined });
      }
      handleClose();
    } catch (err: any) {
      const msgs = err?.response?.data?.message;
      setError(Array.isArray(msgs) ? msgs.join(', ') : (msgs ?? 'Failed to save project.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{project ? 'Edit Project' : 'Create Project'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Project Name" value={form.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
          <TextField
            label="Project Code"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            required fullWidth
            helperText="2–20 uppercase letters, digits, underscores or hyphens (e.g. PMT, MY-PROJECT)"
          />
          <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} multiline rows={3} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={18} /> : project ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Project Dialog ─────────────────────────────────────────────────────
function DeleteProjectDialog({ open, project, onClose }: { open: boolean; project: Project | null; onClose: () => void }) {
  const deleteProject = useDeleteProject();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject.mutateAsync(project.id);
      onClose();
    } catch {
      setError('Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Project</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Typography>
          Are you sure you want to delete <strong>{project?.name}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
          {deleting ? <CircularProgress size={18} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add Member Dialog ─────────────────────────────────────────────────────────
function AddMemberDialog({ open, project, onClose }: { open: boolean; project: Project | null; onClose: () => void }) {
  const { data: allUsers } = useAllUsers();
  const addMember = useAddProjectMember();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const existingIds = new Set((project?.members ?? []).map((m) => m.userId));
  const availableUsers = (Array.isArray(allUsers) ? allUsers : []).filter((u) => !existingIds.has(u.id));

  const handleClose = () => {
    setUserId('');
    setRole('MEMBER');
    setError('');
    onClose();
  };

  const handleAdd = async () => {
    if (!userId || !project) return;
    setSaving(true);
    try {
      await addMember.mutateAsync({ projectId: project.id, userId, role });
      handleClose();
    } catch (err: any) {
      const msgs = err?.response?.data?.message;
      setError(Array.isArray(msgs) ? msgs.join(', ') : (msgs ?? 'Failed to add member.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Member to {project?.name}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl fullWidth>
            <InputLabel>User</InputLabel>
            <Select value={userId} label="User" onChange={(e) => setUserId(e.target.value as string)}>
              {availableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value as string)}>
              {MEMBER_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={saving || !userId}>
          {saving ? <CircularProgress size={18} /> : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const removeMember = useRemoveProjectMember();
  const updateRole = useUpdateMemberRole();
  const { activeProject, setActiveProject } = useProject();

  const isActive = activeProject?.id === project.id;

  const handleRemoveMember = async (userId: string) => {
    await removeMember.mutateAsync({ projectId: project.id, userId });
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await updateRole.mutateAsync({ projectId: project.id, userId, role });
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2, border: isActive ? '2px solid' : undefined, borderColor: isActive ? 'primary.main' : undefined }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" gap={1}>
              <Chip label={project.code} size="small" color="primary" variant="outlined" />
              <Typography fontWeight={600}>{project.name}</Typography>
              {isActive && <Chip label="Active" size="small" color="success" icon={<Check fontSize="small" />} />}
            </Stack>
          }
          subheader={project.description || 'No description'}
          action={
            <Stack direction="row" gap={0.5}>
              <Tooltip title="Set as active project">
                <IconButton size="small" onClick={() => setActiveProject(isActive ? null : project)} color={isActive ? 'primary' : 'default'}>
                  <FolderOpen fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit project">
                <IconButton size="small" onClick={() => setEditOpen(true)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete project">
                <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" gap={2} mb={1} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Members: {project._count?.members ?? project.members?.length ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Release Plans: {project._count?.releasePlans ?? 0}
            </Typography>
            <Chip
              label={project.isActive ? 'Active' : 'Inactive'}
              size="small"
              color={project.isActive ? 'success' : 'default'}
              variant="outlined"
            />
          </Stack>

          {/* Members table */}
          {(project.members?.length ?? 0) > 0 && (
            <Paper variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(project.members ?? []).map((m: ProjectMember) => (
                    <TableRow key={m.userId}>
                      <TableCell>{m.user.firstName} {m.user.lastName}</TableCell>
                      <TableCell>{m.user.email}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as string)}
                          sx={{ fontSize: 13 }}
                        >
                          {MEMBER_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remove member">
                          <IconButton size="small" color="error" onClick={() => handleRemoveMember(m.userId)}>
                            <PersonRemove fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
        <CardActions sx={{ px: 2, pb: 1.5 }}>
          <Button size="small" startIcon={<PersonAdd />} onClick={() => setAddMemberOpen(true)}>
            Add Member
          </Button>
        </CardActions>
      </Card>

      <ProjectFormDialog open={editOpen} project={project} onClose={() => setEditOpen(false)} />
      <DeleteProjectDialog open={deleteOpen} project={project} onClose={() => setDeleteOpen(false)} />
      <AddMemberDialog open={addMemberOpen} project={project} onClose={() => setAddMemberOpen(false)} />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ProjectsPage() {
  const { data: projects, isLoading, error } = useAllProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>Projects</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          New Project
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load projects.</Alert>}

      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : (projects?.length ?? 0) === 0 ? (
        <Alert severity="info">No projects yet. Create your first project above.</Alert>
      ) : (
        <Box>
          {(projects ?? []).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </Box>
      )}

      <ProjectFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
