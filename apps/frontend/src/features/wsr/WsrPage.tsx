import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Switch, Stack,
  Alert, CircularProgress, Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, FormControlLabel, Tooltip,
  IconButton,
} from '@mui/material';
import {
  Settings, Refresh, Save, Add, Delete,
} from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import wsrService, {
  type WsrConfig, type StateConfig, type LeaveTypeConfig, type UpsertConfigPayload,
} from '../../services/wsr.service';
import { useProject } from '../../context/ProjectContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

// ─── Inline text area (click-to-edit with auto-save) ─────────────────────────

function InlineNote({
  label, value: initialValue, onSave, disabled,
}: { label: string; value?: string; onSave: (v: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent value changes (e.g., after a reload)
  useEffect(() => { if (!editing) setValue(initialValue ?? ''); }, [initialValue, editing]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(e.target.value), 1500);
  };

  const handleBlur = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onSave(value);
    setEditing(false);
  };

  return (
    <Box sx={{ position: 'relative', minHeight: 60 }}>
      {!editing ? (
        <Box
          onClick={() => !disabled && setEditing(true)}
          sx={{ cursor: disabled ? 'default' : 'text', p: 1, borderRadius: 1, '&:hover': { bgcolor: disabled ? undefined : 'action.hover' } }}
        >
          {value ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              {disabled ? '—' : `Click to add ${label}…`}
            </Typography>
          )}
        </Box>
      ) : (
        <TextField
          autoFocus multiline minRows={3} fullWidth size="small" value={value}
          onChange={handleChange} onBlur={handleBlur}
          InputProps={{
            endAdornment: (
              <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); handleBlur(); }}><Save fontSize="small" /></IconButton>
            ),
          }}
        />
      )}
    </Box>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ title, counts, stateConfigs }: { title: string; counts: Record<string, number>; stateConfigs: StateConfig[] }) {
  const data = stateConfigs
    .filter((sc) => (counts[sc.key] ?? 0) > 0)
    .map((sc) => ({ value: counts[sc.key] ?? 0, name: sc.label, itemStyle: { color: sc.color } }));

  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
        <Typography variant="body2">{title}: No data</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} color="text.secondary">{title}</Typography>
      <ReactECharts
        option={{
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          series: [{
            type: 'pie', radius: ['35%', '65%'],
            data,
            label: { fontSize: 10 },
            emphasis: { label: { show: true, fontWeight: 'bold' } },
          }],
        }}
        style={{ height: 200 }}
      />
    </Box>
  );
}

// ─── WSR Config Dialog ────────────────────────────────────────────────────────

function ConfigDialog({ open, onClose, config, projectId }: { open: boolean; onClose: () => void; config: WsrConfig; projectId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UpsertConfigPayload>({ ...config });

  useEffect(() => { setForm({ ...config }); }, [config]);

  const saveMut = useMutation({
    mutationFn: (p: UpsertConfigPayload) => wsrService.upsertConfig(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wsr-config', projectId] }); qc.invalidateQueries({ queryKey: ['wsr-report'] }); onClose(); },
  });

  const resetMut = useMutation({
    mutationFn: () => wsrService.resetConfig(projectId),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['wsr-config', projectId] }); setForm({ ...data }); },
  });

  type BoolKey = keyof Pick<UpsertConfigPayload, 'showStaffing' | 'showProductivity' | 'showRoadmap' | 'showDonePlanned' | 'showAchieved' | 'showLeaves' | 'showAppreciation' | 'showRisk'>;

  const SECTION_VISIBILITY: { key: BoolKey; titleKey: keyof UpsertConfigPayload }[] = [
    { key: 'showStaffing', titleKey: 'titleStaffing' },
    { key: 'showProductivity', titleKey: 'titleProductivity' },
    { key: 'showRoadmap', titleKey: 'titleRoadmap' },
    { key: 'showDonePlanned', titleKey: 'titleDonePlanned' },
    { key: 'showAchieved', titleKey: 'titleAchieved' },
    { key: 'showLeaves', titleKey: 'titleLeaves' },
    { key: 'showAppreciation', titleKey: 'titleAppreciation' },
    { key: 'showRisk', titleKey: 'titleRisk' },
  ];

  const updateStateConfig = (
    field: 'storyStateConfig' | 'bugStateConfig',
    idx: number,
    patch: Partial<StateConfig>,
  ) => {
    setForm((f) => ({
      ...f,
      [field]: (f[field] ?? []).map((sc: StateConfig, i: number) => (i === idx ? { ...sc, ...patch } : sc)),
    }));
  };

  const addStateConfig = (field: 'storyStateConfig' | 'bugStateConfig') => {
    setForm((f) => ({
      ...f,
      [field]: [...(f[field] ?? []), { key: `state_${Date.now()}`, label: 'New State', color: '#9e9e9e' }],
    }));
  };

  const removeStateConfig = (field: 'storyStateConfig' | 'bugStateConfig', idx: number) => {
    setForm((f) => ({ ...f, [field]: (f[field] ?? []).filter((_: StateConfig, i: number) => i !== idx) }));
  };

  const updateLeaveType = (idx: number, patch: Partial<LeaveTypeConfig>) => {
    setForm((f) => ({
      ...f,
      leaveTypeConfig: (f.leaveTypeConfig ?? []).map((lt: LeaveTypeConfig, i: number) => (i === idx ? { ...lt, ...patch } : lt)),
    }));
  };

  const addLeaveType = () => {
    setForm((f) => ({
      ...f,
      leaveTypeConfig: [...(f.leaveTypeConfig ?? []), { key: `leave_${Date.now()}`, label: 'New Type' }],
    }));
  };

  const removeLeaveType = (idx: number) => {
    setForm((f) => ({ ...f, leaveTypeConfig: (f.leaveTypeConfig ?? []).filter((_: LeaveTypeConfig, i: number) => i !== idx) }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        WSR Configuration
        <Tooltip title="Reset to defaults">
          <IconButton sx={{ ml: 1 }} size="small" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Report meta */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>Report Info</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label="Report Title" value={form.reportTitle ?? ''} onChange={(e) => setForm((f) => ({ ...f, reportTitle: e.target.value }))} size="small" fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Client Name" value={form.clientName ?? ''} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} size="small" fullWidth /></Grid>
              <Grid item xs={6}><TextField label="Vendor Name" value={form.vendorName ?? ''} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} size="small" fullWidth /></Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Section visibility & titles */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>Sections</Typography>
            <Stack spacing={1.5}>
              {SECTION_VISIBILITY.map(({ key, titleKey }) => (
                <Stack key={key} direction="row" spacing={2} alignItems="center">
                  <FormControlLabel
                    sx={{ minWidth: 130 }}
                    control={
                      <Switch checked={!!form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} size="small" />
                    }
                    label={key.replace('show', '')}
                  />
                  <TextField
                    label="Title" size="small" sx={{ flex: 1 }}
                    value={String(form[titleKey] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [titleKey]: e.target.value }))}
                    disabled={!form[key]}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Story states */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">User Story States</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => addStateConfig('storyStateConfig')}>Add</Button>
            </Stack>
            {(form.storyStateConfig ?? []).map((sc: StateConfig, i: number) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center" mb={1}>
                <TextField label="Key" value={sc.key} size="small" sx={{ width: 120 }} onChange={(e) => updateStateConfig('storyStateConfig', i, { key: e.target.value })} />
                <TextField label="Label" value={sc.label} size="small" sx={{ flex: 1 }} onChange={(e) => updateStateConfig('storyStateConfig', i, { label: e.target.value })} />
                <input type="color" value={sc.color} onChange={(e) => updateStateConfig('storyStateConfig', i, { color: e.target.value })} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
                <IconButton size="small" color="error" onClick={() => removeStateConfig('storyStateConfig', i)}><Delete fontSize="small" /></IconButton>
              </Stack>
            ))}
          </Box>

          <Divider />

          {/* Bug states */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">Bug States</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => addStateConfig('bugStateConfig')}>Add</Button>
            </Stack>
            {(form.bugStateConfig ?? []).map((sc: StateConfig, i: number) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center" mb={1}>
                <TextField label="Key" value={sc.key} size="small" sx={{ width: 120 }} onChange={(e) => updateStateConfig('bugStateConfig', i, { key: e.target.value })} />
                <TextField label="Label" value={sc.label} size="small" sx={{ flex: 1 }} onChange={(e) => updateStateConfig('bugStateConfig', i, { label: e.target.value })} />
                <input type="color" value={sc.color} onChange={(e) => updateStateConfig('bugStateConfig', i, { color: e.target.value })} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
                <IconButton size="small" color="error" onClick={() => removeStateConfig('bugStateConfig', i)}><Delete fontSize="small" /></IconButton>
              </Stack>
            ))}
          </Box>

          <Divider />

          {/* Leave types */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">Leave Types</Typography>
              <Button size="small" startIcon={<Add />} onClick={addLeaveType}>Add</Button>
            </Stack>
            {(form.leaveTypeConfig ?? []).map((lt: LeaveTypeConfig, i: number) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center" mb={1}>
                <TextField label="Key" value={lt.key} size="small" sx={{ width: 140 }} onChange={(e) => updateLeaveType(i, { key: e.target.value })} />
                <TextField label="Label" value={lt.label} size="small" sx={{ flex: 1 }} onChange={(e) => updateLeaveType(i, { label: e.target.value })} />
                <IconButton size="small" color="error" onClick={() => removeLeaveType(i)}><Delete fontSize="small" /></IconButton>
              </Stack>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          {saveMut.isPending ? <CircularProgress size={18} /> : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Helper: get Monday of a given date ──────────────────────────────────────

function toMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ─── Main WSR page ────────────────────────────────────────────────────────────

export function WsrPage() {
  const { activeProject } = useProject();
  const qc = useQueryClient();

  const [weekOf, setWeekOf] = useState(() => toISODate(toMonday(new Date())));
  const [configOpen, setConfigOpen] = useState(false);

  // Pending note patches (for debounced auto-save)
  const pendingNotes = useRef<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: config } = useQuery({
    queryKey: ['wsr-config', activeProject?.id],
    queryFn: () => wsrService.getConfig(activeProject!.id),
    enabled: !!activeProject,
  });

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['wsr-report', activeProject?.id, weekOf],
    queryFn: () => wsrService.assembleReport(activeProject!.id, new Date(weekOf).toISOString()),
    enabled: !!activeProject,
  });

  const notesMut = useMutation({
    mutationFn: (patch: Record<string, string>) =>
      wsrService.upsertNotes({
        projectId: activeProject!.id,
        weekOf: new Date(weekOf).toISOString(),
        ...patch,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wsr-report'] }),
  });

  const scheduleNoteSave = useCallback(
    (field: string, value: string) => {
      pendingNotes.current[field] = value;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        notesMut.mutate({ ...pendingNotes.current });
        pendingNotes.current = {};
      }, 1200);
    },
    [notesMut],
  );

  const notes = report?.notes;
  const cfg = config ?? report?.config;

  if (!activeProject) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState icon={<Settings />} title="No project selected" description="Please select a project from the project switcher." />
      </Box>
    );
  }

  const sectionOrder: string[] = cfg?.sectionOrder ?? ['staffing', 'productivity', 'roadmap', 'donePlanned', 'achieved', 'leaves', 'appreciation', 'risk'];

  const storyConfigs = cfg?.storyStateConfig ?? [{ key: 'active', label: 'Active', color: '#1976d2' }, { key: 'in_review', label: 'In Review', color: '#f57c00' }, { key: 'closed', label: 'Closed', color: '#388e3c' }];
  const bugConfigs = cfg?.bugStateConfig ?? [{ key: 'active', label: 'Active', color: '#d32f2f' }, { key: 'closed', label: 'Closed', color: '#388e3c' }];
  const leaveTypeConfigs = cfg?.leaveTypeConfig ?? [{ key: 'PLANNED', label: 'Planned' }, { key: 'UNPLANNED', label: 'Unplanned' }, { key: 'SICK', label: 'Sick' }];
  const leaveTypeLabel = (key: string) => leaveTypeConfigs.find((lt) => lt.key === key)?.label ?? key;

  const sections = report?.sections;

  // ── Section renderers ──────────────────────────────────────────────────────

  const renderSection = (key: string) => {
    switch (key) {
      case 'staffing': {
        if (!cfg?.showStaffing) return null;
        const rows = (sections?.staffing ?? []) as Array<{ id: string; period?: string; role?: string; team?: { name: string }; openingCount?: number; addedCount?: number; removedCount?: number; closingCount?: number }>;
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleStaffing ?? 'Staffing'}</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                {rows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No headcount data for selected range.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Period</TableCell><TableCell>Team</TableCell><TableCell>Role</TableCell>
                        <TableCell align="right">Open</TableCell><TableCell align="right">+</TableCell>
                        <TableCell align="right">−</TableCell><TableCell align="right">Close</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {rows.slice(0, 10).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.period ? new Date(r.period).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '—'}</TableCell>
                            <TableCell>{r.team?.name ?? '—'}</TableCell>
                            <TableCell>{r.role ?? '—'}</TableCell>
                            <TableCell align="right">{r.openingCount}</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>{r.addedCount}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>{r.removedCount}</TableCell>
                            <TableCell align="right"><b>{r.closingCount}</b></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'productivity': {
        if (!cfg?.showProductivity) return null;
        const snap = sections?.productivity as (null | { sprintName?: string; snapshotDate?: string; storyStateCounts: Record<string, number>; bugStateCounts: Record<string, number> });
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleProductivity ?? 'Sprint Productivity'}</Typography>} />
              <CardContent>
                {!snap ? (
                  <Typography variant="body2" color="text.secondary">No sprint snapshot available.</Typography>
                ) : (
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        {snap.sprintName ?? 'Latest sprint'} · {snap.snapshotDate ? new Date(snap.snapshotDate).toLocaleDateString() : ''}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <DonutChart title="Stories" counts={snap.storyStateCounts} stateConfigs={storyConfigs} />
                    </Grid>
                    <Grid item xs={6}>
                      <DonutChart title="Bugs" counts={snap.bugStateCounts} stateConfigs={bugConfigs} />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'roadmap': {
        if (!cfg?.showRoadmap) return null;
        const rm = sections?.roadmap as { features: Array<{ id: string; name: string; status: string; progress?: number }>; releases: Array<{ id: string; name: string; version?: string; status: string; plannedStart?: string; plannedEnd?: string }> };
        return (
          <Grid item xs={12} key={key}>
            <Card variant="outlined">
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleRoadmap ?? 'Roadmap'}</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Releases</Typography>
                {!rm?.releases?.length ? (
                  <Typography variant="body2" color="text.secondary">No releases found.</Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {rm.releases.map((r) => (
                      <Chip
                        key={r.id}
                        label={`${r.name}${r.version ? ` v${r.version}` : ''} · ${r.status}`}
                        size="small"
                        color={r.status === 'RELEASED' ? 'success' : r.status === 'AT_RISK' ? 'error' : 'default'}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'donePlanned': {
        if (!cfg?.showDonePlanned) return null;
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleDonePlanned ?? 'Done and Planned Work'}</Typography>} />
              <CardContent>
                <InlineNote label="Done and Planned" value={notes?.noteDonePlanned ?? ''} onSave={(v) => scheduleNoteSave('noteDonePlanned', v)} />
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'achieved': {
        if (!cfg?.showAchieved) return null;
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleAchieved ?? 'Achieved So Far'}</Typography>} />
              <CardContent>
                <InlineNote label="Achieved So Far" value={notes?.noteAchieved ?? ''} onSave={(v) => scheduleNoteSave('noteAchieved', v)} />
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'leaves': {
        if (!cfg?.showLeaves) return null;
        const leaves = (sections?.leaves ?? []) as Array<{ id: string; leaveType: string; startDate: string; endDate: string; halfDay: boolean; user?: { firstName: string; lastName: string } }>;
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleLeaves ?? 'Leaves'}</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                {!leaves.length ? (
                  <Typography variant="body2" color="text.secondary">No leaves this week.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>From</TableCell><TableCell>To</TableCell><TableCell>Half</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {leaves.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.user ? `${l.user.firstName} ${l.user.lastName}` : '—'}</TableCell>
                            <TableCell><Chip label={leaveTypeLabel(l.leaveType)} size="small" /></TableCell>
                            <TableCell>{new Date(l.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(l.endDate).toLocaleDateString()}</TableCell>
                            <TableCell>{l.halfDay ? 'Yes' : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'appreciation': {
        if (!cfg?.showAppreciation) return null;
        return (
          <Grid item xs={12} md={6} key={key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleAppreciation ?? 'Appreciation / Escalation'}</Typography>} />
              <CardContent>
                <InlineNote label="Appreciation / Escalation" value={notes?.noteAppreciation ?? ''} onSave={(v) => scheduleNoteSave('noteAppreciation', v)} />
              </CardContent>
            </Card>
          </Grid>
        );
      }

      case 'risk': {
        if (!cfg?.showRisk) return null;
        const risks = (sections?.risks ?? []) as Array<{ id: string; name: string; status: string; version?: string }>;
        return (
          <Grid item xs={12} key={key}>
            <Card variant="outlined">
              <CardHeader title={<Typography variant="subtitle1" fontWeight={700}>{cfg?.titleRisk ?? 'Risk / Concern'}</Typography>} />
              <CardContent>
                {risks.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>AT RISK / DELAYED releases</Typography>
                    <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                      {risks.map((r) => (
                        <Chip key={r.id} label={`${r.name}${r.version ? ` v${r.version}` : ''}`} size="small" color="error" />
                      ))}
                    </Stack>
                  </Box>
                )}
                <InlineNote label="Risk / Concern" value={notes?.noteRiskConcern ?? ''} onSave={(v) => scheduleNoteSave('noteRiskConcern', v)} />
              </CardContent>
            </Card>
          </Grid>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {cfg?.reportTitle ?? 'Weekly Status Report'}
          </Typography>
          {(cfg?.clientName || cfg?.vendorName) && (
            <Typography variant="body2" color="text.secondary">
              {cfg.clientName && `Client: ${cfg.clientName}`}{cfg.clientName && cfg.vendorName && ' · '}{cfg.vendorName && `Vendor: ${cfg.vendorName}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Week of" type="date" value={weekOf} size="small" sx={{ width: 160 }}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => setWeekOf(toISODate(toMonday(new Date(e.target.value))))}
          />
          <Tooltip title="Configure WSR">
            <IconButton onClick={() => setConfigOpen(true)} disabled={!cfg}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Body */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <Alert severity="error">{String(error)}</Alert>
      ) : (
        <Grid container spacing={3}>
          {sectionOrder.map((key) => renderSection(key))}
        </Grid>
      )}

      {cfg && (
        <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} config={cfg} projectId={activeProject.id} />
      )}
    </Box>
  );
}
