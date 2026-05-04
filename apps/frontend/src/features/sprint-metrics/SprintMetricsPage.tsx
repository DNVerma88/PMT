import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert,
  CircularProgress, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import { Add, Edit, Delete, DonutSmall } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import sprintMetricsService, { type CreateSnapshotPayload, type SprintSnapshot } from '../../services/sprint-metrics.service';
import wsrService, { type StateConfig } from '../../services/wsr.service';
import { useProject } from '../../context/ProjectContext';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ title, counts, stateConfigs }: { title: string; counts: Record<string, number>; stateConfigs: StateConfig[] }) {
  const data = stateConfigs
    .filter((sc) => counts[sc.key] !== undefined)
    .map((sc) => ({ value: counts[sc.key], name: sc.label, itemStyle: { color: sc.color } }));

  // include any counts not in stateConfigs (unrecognised keys)
  for (const [key, val] of Object.entries(counts)) {
    if (!stateConfigs.find((sc) => sc.key === key)) {
      data.push({ value: val, name: key, itemStyle: { color: '#9e9e9e' } });
    }
  }

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data,
      label: { show: false },
      emphasis: { label: { show: true, fontWeight: 'bold' } },
    }],
  };

  return (
    <Card variant="outlined">
      <CardHeader title={<Typography variant="subtitle1" fontWeight={600}>{title}</Typography>} sx={{ pb: 0 }} />
      <CardContent sx={{ pt: 1 }}>
        {data.length === 0
          ? <Typography variant="body2" color="text.secondary">No data</Typography>
          : <ReactECharts option={option} style={{ height: 220 }} />}
      </CardContent>
    </Card>
  );
}

// ─── Snapshot form dialog ─────────────────────────────────────────────────────

function SnapshotDialog({
  open, onClose, storyConfigs, bugConfigs, initial,
}: {
  open: boolean;
  onClose: () => void;
  storyConfigs: StateConfig[];
  bugConfigs: StateConfig[];
  initial?: SprintSnapshot | null;
}) {
  const { activeProject } = useProject();
  const qc = useQueryClient();

  const [sprintName, setSprintName] = useState(initial?.sprintName ?? '');
  const [snapshotDate, setSnapshotDate] = useState(
    initial?.snapshotDate ? initial.snapshotDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [bugAtStart, setBugAtStart] = useState(String(initial?.bugCountAtSprintStart ?? ''));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [storyCounts, setStoryCounts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const sc of storyConfigs) m[sc.key] = String(initial?.storyStateCounts?.[sc.key] ?? '');
    return m;
  });
  const [bugCounts, setBugCounts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const sc of bugConfigs) m[sc.key] = String(initial?.bugStateCounts?.[sc.key] ?? '');
    return m;
  });

  const createMut = useMutation({
    mutationFn: (p: CreateSnapshotPayload) => sprintMetricsService.create(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sprint-snapshots'] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (p: Partial<CreateSnapshotPayload>) => sprintMetricsService.update(initial!.id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sprint-snapshots'] }); onClose(); },
  });

  const handleSave = () => {
    const payload: CreateSnapshotPayload = {
      projectId: activeProject?.id,
      snapshotDate: new Date(snapshotDate).toISOString(),
      sprintName: sprintName || undefined,
      storyStateCounts: Object.fromEntries(Object.entries(storyCounts).map(([k, v]) => [k, Number(v) || 0])),
      bugStateCounts: Object.fromEntries(Object.entries(bugCounts).map(([k, v]) => [k, Number(v) || 0])),
      bugCountAtSprintStart: bugAtStart ? Number(bugAtStart) : undefined,
      notes: notes || undefined,
    };
    if (initial) updateMut.mutate(payload); else createMut.mutate(payload);
  };

  const busy = createMut.isPending || updateMut.isPending;
  const err = createMut.error || updateMut.error;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Snapshot' : 'Log Sprint Snapshot'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {err && <Alert severity="error">{String(err)}</Alert>}
          <TextField label="Sprint Name" value={sprintName} onChange={(e) => setSprintName(e.target.value)} size="small" />
          <TextField label="Snapshot Date" type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Typography variant="subtitle2">User Story Counts</Typography>
          {storyConfigs.map((sc) => (
            <TextField key={sc.key} label={sc.label} type="number" value={storyCounts[sc.key] ?? ''} size="small"
              onChange={(e) => setStoryCounts((prev) => ({ ...prev, [sc.key]: e.target.value }))} />
          ))}
          <Typography variant="subtitle2">Bug Counts</Typography>
          {bugConfigs.map((sc) => (
            <TextField key={sc.key} label={sc.label} type="number" value={bugCounts[sc.key] ?? ''} size="small"
              onChange={(e) => setBugCounts((prev) => ({ ...prev, [sc.key]: e.target.value }))} />
          ))}
          <TextField label="Bugs at Sprint Start" type="number" value={bugAtStart} onChange={(e) => setBugAtStart(e.target.value)} size="small" />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} size="small" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={busy}>
          {busy ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SprintMetricsPage() {
  const { activeProject } = useProject();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SprintSnapshot | null>(null);
  const [page] = useState(1);

  const { data: config } = useQuery({
    queryKey: ['wsr-config', activeProject?.id],
    queryFn: () => wsrService.getConfig(activeProject!.id),
    enabled: !!activeProject,
  });

  const { data: latest } = useQuery({
    queryKey: ['sprint-snapshot-latest', activeProject?.id],
    queryFn: () => sprintMetricsService.getLatest(activeProject?.id),
    enabled: !!activeProject,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ['sprint-snapshots', activeProject?.id, page],
    queryFn: () => sprintMetricsService.getAll({ projectId: activeProject?.id, page, limit: 20 }),
    enabled: !!activeProject,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sprintMetricsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-snapshots'] }),
  });

  const storyConfigs = config?.storyStateConfig ?? [
    { key: 'active', label: 'Active', color: '#1976d2' },
    { key: 'in_review', label: 'In Review', color: '#f57c00' },
    { key: 'closed', label: 'Closed', color: '#388e3c' },
  ];
  const bugConfigs = config?.bugStateConfig ?? [
    { key: 'active', label: 'Active', color: '#d32f2f' },
    { key: 'closed', label: 'Closed', color: '#388e3c' },
  ];

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (s: SprintSnapshot) => { setEditing(s); setDialogOpen(true); };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Sprint Metrics</Typography>
          <Typography variant="body2" color="text.secondary">
            {activeProject?.name ?? 'Select a project'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd} disabled={!activeProject}>
          Log Snapshot
        </Button>
      </Stack>

      {/* Charts row */}
      {latest && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <DonutChart title="User Stories by State" counts={latest.storyStateCounts as Record<string, number>} stateConfigs={storyConfigs} />
          </Grid>
          <Grid item xs={12} md={6}>
            <DonutChart title="Bugs by State" counts={latest.bugStateCounts as Record<string, number>} stateConfigs={bugConfigs} />
          </Grid>
        </Grid>
      )}

      {/* Snapshot table */}
      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1" fontWeight={600}><DonutSmall sx={{ verticalAlign: 'middle', mr: 1 }} />Snapshot History</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          {isLoading ? <LoadingSpinner /> : !list?.data?.length ? (
            <EmptyState icon={<DonutSmall />} title="No snapshots yet" description="Log your first sprint snapshot." />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Sprint</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Stories (active/review/closed)</TableCell>
                    <TableCell>Bugs (active/closed)</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.data.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.sprintName ?? '—'}</TableCell>
                      <TableCell>{new Date(s.snapshotDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {storyConfigs.map((sc) => {
                          const cnt = (s.storyStateCounts as Record<string, number>)[sc.key];
                          if (!cnt && cnt !== 0) return null;
                          return <Chip key={sc.key} label={`${sc.label}: ${cnt}`} size="small" sx={{ mr: 0.5, bgcolor: sc.color, color: '#fff' }} />;
                        })}
                      </TableCell>
                      <TableCell>
                        {bugConfigs.map((bc) => {
                          const cnt = (s.bugStateCounts as Record<string, number>)[bc.key];
                          if (!cnt && cnt !== 0) return null;
                          return <Chip key={bc.key} label={`${bc.label}: ${cnt}`} size="small" sx={{ mr: 0.5, bgcolor: bc.color, color: '#fff' }} />;
                        })}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(s)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => deleteMut.mutate(s.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <SnapshotDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        storyConfigs={storyConfigs}
        bugConfigs={bugConfigs}
        initial={editing}
      />
    </Box>
  );
}
