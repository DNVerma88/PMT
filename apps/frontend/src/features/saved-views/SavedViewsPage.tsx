import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, CardActions,
  Chip, Alert, Stack, IconButton, Tooltip, Select, MenuItem,
  FormControl, InputLabel, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Switch, FormControlLabel,
} from '@mui/material';
import {
  ViewList, ContentCopy, Delete, Lock, Public, Add,
  AccountTree, Assessment, Groups, RocketLaunch, Star,
} from '@mui/icons-material';
import { useSavedViews, useCreateSavedView, useDeleteSavedView, useCloneSavedView } from './useSavedViews';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuth } from '../auth/useAuth';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  roadmap: <AccountTree fontSize="small" />,
  productivity: <Assessment fontSize="small" />,
  headcount: <Groups fontSize="small" />,
  release_cadence: <RocketLaunch fontSize="small" />,
};

const MODULE_LABELS: Record<string, string> = {
  roadmap: 'Roadmap',
  productivity: 'Productivity',
  headcount: 'Headcount',
  release_cadence: 'Release Cadence',
};

const MODULE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  roadmap: 'primary',
  productivity: 'secondary',
  headcount: 'success',
  release_cadence: 'warning',
};

function ViewCard({ view, onDelete, onClone }: { view: any; onDelete: () => void; onClone: () => void }) {
  const { user } = useAuth();
  const isOwner = view.owner?.id === user?.id || view.ownerId === user?.id;

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={MODULE_ICONS[view.module] ?? <ViewList fontSize="small" />}
        title={
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{view.name}</Typography>
            {view.isDefault && <Star sx={{ fontSize: 14, color: 'warning.main' }} />}
          </Stack>
        }
        subheader={
          <Stack direction="row" gap={0.5} mt={0.5} flexWrap="wrap">
            <Chip
              label={MODULE_LABELS[view.module] ?? view.module}
              size="small"
              color={MODULE_COLORS[view.module] ?? 'default'}
              icon={MODULE_ICONS[view.module] as any}
              variant="outlined"
            />
            <Chip
              label={view.chartType?.replace('_', ' ')}
              size="small"
              variant="outlined"
            />
          </Stack>
        }
        action={
          <Tooltip title={view.isPublic ? 'Public' : 'Private'}>
            <Box sx={{ mt: 1, mr: 1 }}>
              {view.isPublic ? <Public fontSize="small" color="action" /> : <Lock fontSize="small" color="action" />}
            </Box>
          </Tooltip>
        }
      />
      {view.description && (
        <CardContent sx={{ pt: 0, pb: 0 }}>
          <Typography variant="caption" color="text.secondary">{view.description}</Typography>
        </CardContent>
      )}
      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {view.owner ? `${view.owner.firstName} ${view.owner.lastName}` : 'Unknown'}
          {' · '}
          {new Date(view.updatedAt ?? view.createdAt).toLocaleDateString()}
        </Typography>
        <Stack direction="row">
          <Tooltip title="Clone">
            <IconButton size="small" onClick={onClone}><ContentCopy fontSize="small" /></IconButton>
          </Tooltip>
          {isOwner && (
            <Tooltip title="Delete">
              <IconButton size="small" onClick={onDelete} color="error"><Delete fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}

const CHART_TYPES = ['BAR', 'LINE', 'PIE', 'DONUT', 'GANTT', 'SCATTER', 'WATERFALL', 'STACKED_BAR', 'TABLE'];

function CreateSavedViewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateSavedView();
  const [form, setForm] = useState({
    name: '',
    description: '',
    module: 'roadmap',
    chartType: 'BAR',
    isPublic: false,
    isDefault: false,
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name) {
      setError('Name is required.');
      return;
    }
    try {
      await mutation.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        module: form.module,
        chartType: form.chartType,
        config: {},
        isPublic: form.isPublic,
        isDefault: form.isDefault,
      });
      setForm({ name: '', description: '', module: 'roadmap', chartType: 'BAR', isPublic: false, isDefault: false });
      setError('');
      onClose();
    } catch {
      setError('Failed to create view. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Saved View</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="View Name" value={form.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
        <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} multiline rows={2} fullWidth />
        <FormControl fullWidth>
          <InputLabel>Module</InputLabel>
          <Select label="Module" value={form.module} onChange={(e) => set('module', e.target.value)}>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Chart Type</InputLabel>
          <Select label="Chart Type" value={form.chartType} onChange={(e) => set('chartType', e.target.value)}>
            {CHART_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" gap={2}>
          <FormControlLabel
            control={<Switch checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />}
            label="Public"
          />
          <FormControlLabel
            control={<Switch checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />}
            label="Set as Default"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create View'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function SavedViewsPage() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: views, isLoading, error } = useSavedViews(moduleFilter || undefined);
  const deleteMutation = useDeleteSavedView();
  const cloneMutation = useCloneSavedView();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>Saved Views</Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip icon={<ViewList />} label={`${views?.length ?? 0} Views`} color="primary" variant="outlined" />
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>New View</Button>
        </Stack>
      </Stack>

      <Stack direction="row" gap={2} mb={3} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by module</InputLabel>
          <Select value={moduleFilter} label="Filter by module" onChange={(e) => setModuleFilter(e.target.value)}>
            <MenuItem value="">All modules</MenuItem>
            {Object.entries(MODULE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load saved views</Alert>}

      {!views?.length ? (
        <EmptyState
          icon={<ViewList sx={{ fontSize: 56 }} />}
          title="No saved views yet"
          description="Create a named view configuration to quickly access your favourite dashboard setup."
          action={{ label: 'New View', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <Grid container spacing={2}>
          {views.map((view: any) => (
            <Grid item xs={12} sm={6} md={4} key={view.id}>
              <ViewCard
                view={view}
                onDelete={() => deleteMutation.mutate(view.id)}
                onClone={() => cloneMutation.mutate(view.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateSavedViewDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
