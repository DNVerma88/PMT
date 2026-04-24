import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx-js-style';
import { useProject } from '../../context/ProjectContext';
import {
  Box,
  Typography,
  Tab,
  Tabs,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Tooltip,
  Button,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { RocketLaunch, CalendarMonth, Flag, Add, Timeline as TimelineIcon, FileDownload, Edit, Delete, PlaylistAdd, DragIndicator } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import {
  useReleasePlans,
  useSprintCalendars,
  useCreateReleasePlan,
  useUpdateReleasePlan,
  useDeleteReleasePlan,
  useCreateSprintCalendar,
  useExtendSprintCalendar,
  useCreateMilestone,
  useUpdateMilestone,
} from './useReleaseCadence';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type TabId = 'releases' | 'sprints' | 'milestones' | 'timeline';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9e9e9e',
  PLANNED: '#2196f3',
  IN_PROGRESS: '#ff9800',
  COMPLETED: '#4caf50',
  CANCELLED: '#f44336',
  DELAYED: '#e91e63',
  AT_RISK: '#ff5722',
};

const MILESTONE_LABELS: Record<string, string> = {
  BACKLOG_GROOMING:   'Backlog Grooming',
  SPRINT_PLANNING:    'Sprint Planning',
  BACKLOG_READINESS:  'Backlog Readiness',
  DEVELOPMENT_START:  'Dev Start',
  DEVELOPMENT_END:    'Dev End',
  CODE_FREEZE:        'Code Freeze',
  REGRESSION_START:   'Reg Start',
  REGRESSION_END:     'Reg End',
  GO_NO_GO:           'Go/No-Go',
  PRODUCTION_LIVE:    'Prod Live',
  POST_RELEASE_REVIEW:'Post-Release Review',
};

const RELEASE_STATUSES = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED', 'AT_RISK'];
const MILESTONE_TYPES = Object.keys(MILESTONE_LABELS);

// ── Create Release Plan Dialog ────────────────────────────────────────────────
function CreateReleasePlanDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const createPlan = useCreateReleasePlan();
  const createMilestone = useCreateMilestone();

  const [form, setForm] = useState({
    name: '',
    version: '',
    type: 'MINOR',
    status: 'DRAFT',
    plannedStart: '',
    plannedEnd: '',
  });
  // Key milestone dates — all optional
  const [milestones, setMilestones] = useState({
    BACKLOG_GROOMING:    '',
    SPRINT_PLANNING:     '',
    BACKLOG_READINESS:   '',
    DEVELOPMENT_START:   '',
    CODE_FREEZE:         '',
    REGRESSION_START:    '',
    REGRESSION_END:      '',
    GO_NO_GO:            '',
    PRODUCTION_LIVE:     '',
    POST_RELEASE_REVIEW: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setMs = (k: string, v: string) => setMilestones((m) => ({ ...m, [k]: v }));

  const handleClose = () => {
    setForm({ name: '', version: '', type: 'MINOR', status: 'DRAFT', plannedStart: '', plannedEnd: '' });
    setMilestones({ BACKLOG_GROOMING: '', SPRINT_PLANNING: '', BACKLOG_READINESS: '', DEVELOPMENT_START: '', CODE_FREEZE: '', REGRESSION_START: '', REGRESSION_END: '', GO_NO_GO: '', PRODUCTION_LIVE: '', POST_RELEASE_REVIEW: '' });
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.name || !form.version || !form.plannedStart || !form.plannedEnd) {
      setError('Name, version, planned start, and planned end are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        version: form.version,
        type: form.type,
        status: form.status,
        plannedStart: form.plannedStart,
        plannedEnd: form.plannedEnd,
      };
      if (projectId) payload.projectId = projectId;
      const plan = await createPlan.mutateAsync(payload as any);
      // Create any milestone dates the user filled in
      const msEntries = Object.entries(milestones).filter(([, date]) => !!date);
      await Promise.all(
        msEntries.map(([type, plannedDate]) =>
          createMilestone.mutateAsync({ releasePlanId: plan.id, type, plannedDate }),
        ),
      );
      handleClose();
    } catch (err: any) {
      const msgs = err?.response?.data?.message;
      if (Array.isArray(msgs)) {
        setError(msgs.join(', '));
      } else if (typeof msgs === 'string') {
        setError(msgs);
      } else {
        setError('Failed to create release plan. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>New Release Plan</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Core fields ── */}
        <TextField label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
        <TextField label="Version (e.g. v2.0)" value={form.version} onChange={(e) => set('version', e.target.value)} required fullWidth />
        <Stack direction="row" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <MenuItem value="MAJOR">MAJOR</MenuItem>
              <MenuItem value="MINOR">MINOR</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {RELEASE_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Planned Start" type="date" value={form.plannedStart} onChange={(e) => set('plannedStart', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth required />
          <TextField label="Planned End" type="date" value={form.plannedEnd} onChange={(e) => set('plannedEnd', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth required />
        </Stack>

        {/* ── Cadence milestone dates ── */}
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Pre-Development <Typography component="span" variant="caption">(optional)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Backlog Grooming" type="date" value={milestones.BACKLOG_GROOMING} onChange={(e) => setMs('BACKLOG_GROOMING', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Sprint Planning" type="date" value={milestones.SPRINT_PLANNING} onChange={(e) => setMs('SPRINT_PLANNING', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Backlog Readiness" type="date" value={milestones.BACKLOG_READINESS} onChange={(e) => setMs('BACKLOG_READINESS', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <Box sx={{ flex: 1 }} />
        </Stack>
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Cadence Dates <Typography component="span" variant="caption">(optional — auto-creates milestones)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Dev Start" type="date" value={milestones.DEVELOPMENT_START} onChange={(e) => setMs('DEVELOPMENT_START', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Code Freeze" type="date" value={milestones.CODE_FREEZE} onChange={(e) => setMs('CODE_FREEZE', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Regression Start" type="date" value={milestones.REGRESSION_START} onChange={(e) => setMs('REGRESSION_START', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Regression End" type="date" value={milestones.REGRESSION_END} onChange={(e) => setMs('REGRESSION_END', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Go / No-Go" type="date" value={milestones.GO_NO_GO} onChange={(e) => setMs('GO_NO_GO', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Prod Rollout (Live)" type="date" value={milestones.PRODUCTION_LIVE} onChange={(e) => setMs('PRODUCTION_LIVE', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Post-Release <Typography component="span" variant="caption">(optional)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Post-Release Review" type="date" value={milestones.POST_RELEASE_REVIEW} onChange={(e) => setMs('POST_RELEASE_REVIEW', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <Box sx={{ flex: 1 }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Phase bar visual ─────────────────────────────────────────────────────────
// Shows a horizontal bar split into coloured phase segments given day-offsets
function PhaseBar({
  sprintLength,
  codeFreezeOffset,
  regressionOffset,
  regressionEndOffset,
  goNoGoOffset,
}: {
  sprintLength: number;
  codeFreezeOffset: number | null;
  regressionOffset: number | null;
  regressionEndOffset: number | null;
  goNoGoOffset: number | null;
}) {
  if (!sprintLength || sprintLength < 1) return null;
  // Build segments
  const segments: { label: string; color: string; days: number }[] = [];
  let cursor = 1;

  const push = (label: string, color: string, endDay: number | null, fallback: number) => {
    const end = endDay ?? fallback;
    if (end >= cursor) {
      segments.push({ label, color, days: end - cursor + 1 });
      cursor = end + 1;
    }
  };

  push('Development', '#1976d2', codeFreezeOffset ? codeFreezeOffset - 1 : null, sprintLength);
  if (codeFreezeOffset) {
    push('Code Freeze', '#e53935', regressionOffset ? regressionOffset - 1 : null, codeFreezeOffset);
  }
  if (regressionOffset) {
    push('Regression', '#fb8c00', regressionEndOffset ?? null, sprintLength);
  }
  if (goNoGoOffset && cursor <= sprintLength) {
    // back-fill any gap
    if (goNoGoOffset > cursor) {
      segments.push({ label: 'Regression', color: '#fb8c00', days: goNoGoOffset - cursor });
      cursor = goNoGoOffset;
    }
    segments.push({ label: 'Go/No-Go', color: '#8e24aa', days: sprintLength - goNoGoOffset + 1 });
    cursor = sprintLength + 1;
  }
  if (cursor <= sprintLength) {
    segments.push({ label: 'Dev', color: '#1976d2', days: sprintLength - cursor + 1 });
  }

  return (
    <Stack gap={0.5}>
      <Box sx={{ display: 'flex', height: 20, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {segments.map((seg, i) => (
          <Tooltip key={i} title={`${seg.label}: ${seg.days} day${seg.days !== 1 ? 's' : ''}`}>
            <Box
              sx={{
                flex: seg.days,
                bgcolor: seg.color,
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              {seg.days >= 3 && (
                <Typography variant="caption" sx={{ color: '#fff', fontSize: 9, fontWeight: 700, px: 0.3 }} noWrap>
                  {seg.label}
                </Typography>
              )}
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">Day 1</Typography>
        <Typography variant="caption" color="text.secondary">Day {sprintLength}</Typography>
      </Stack>
    </Stack>
  );
}

// Helper: compute the actual dates for each phase of a given sprint
function computeSprintPhases(sprint: any, cal: any) {
  const startMs = new Date(sprint.startDate).getTime();
  const endMs   = new Date(sprint.endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    return { phases: [] as { label: string; color: string; start: Date; end: Date; isMilestone?: boolean }[], cf: null, rs: null, re: null, gng: null, gl: new Date() };
  }
  const base  = startMs;
  const dayMs = 86_400_000;
  const day   = (n: number) => new Date(base + (n - 1) * dayMs);
  const totalDays = Math.round((endMs - base) / dayMs) + 1;

  const cf  = cal.codeFreezeOffset    ? day(cal.codeFreezeOffset)    : null;
  const rs  = cal.regressionOffset    ? day(cal.regressionOffset)    : null;
  const re  = cal.regressionEndOffset ? day(cal.regressionEndOffset) : null;
  const gng = cal.goNoGoOffset        ? day(cal.goNoGoOffset)        : null;
  const gl  = day(totalDays);

  const phases: { label: string; color: string; start: Date; end: Date; isMilestone?: boolean }[] = [];

  if (cf) {
    phases.push({ label: 'Development', color: '#1976d2', start: new Date(base), end: new Date(cf.getTime() - dayMs) });
    phases.push({ label: 'Code Freeze', color: '#e53935', start: cf, end: rs ? new Date(rs.getTime() - dayMs) : cf, isMilestone: true });
    if (rs) {
      phases.push({ label: 'Regression', color: '#fb8c00', start: rs, end: re ?? (gng ? new Date(gng.getTime() - dayMs) : new Date(gl.getTime() - dayMs)) });
    }
    if (gng) {
      phases.push({ label: 'Go/No-Go', color: '#8e24aa', start: gng, end: new Date(gl.getTime() - dayMs) });
    }
  } else {
    // No phase template — entire sprint is Development
    phases.push({ label: 'Development', color: '#1976d2', start: new Date(base), end: new Date(endMs) });
  }
  phases.push({ label: 'Go Live', color: '#1e88e5', start: gl, end: gl, isMilestone: true });

  return { phases, cf, rs, re, gng, gl };
}

// ── Create Sprint Calendar Dialog ─────────────────────────────────────────────
function CreateSprintCalendarDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mutation = useCreateSprintCalendar();
  const [form, setForm] = useState({ name: '', startDate: '', firstSprintEnd: '', sprintCount: '6' });
  const [usePhaseTemplate, setUsePhaseTemplate] = useState(false);
  const [offsets, setOffsets] = useState({ codeFreezeOffset: '', regressionOffset: '', regressionEndOffset: '', goNoGoOffset: '' });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ name: string; start: string; end: string }[]>([]);

  // Derived sprint length in days
  const sprintLength = (() => {
    if (!form.startDate || !form.firstSprintEnd) return 0;
    const ms = new Date(form.firstSprintEnd).getTime() - new Date(form.startDate).getTime();
    return ms >= 0 ? Math.round(ms / 86_400_000) + 1 : 0;
  })();

  const setForm_ = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(updated);
    if (updated.startDate && updated.firstSprintEnd && Number(updated.sprintCount) > 0) {
      const s = new Date(updated.startDate);
      const e = new Date(updated.firstSprintEnd);
      const intervalMs = e.getTime() - s.getTime();
      const intervalDays = Math.round(intervalMs / 86_400_000) + 1;
      if (intervalDays > 0) {
        const count = Math.min(Number(updated.sprintCount), 6);
        setPreview(
          Array.from({ length: count }, (_, i) => {
            const ss = new Date(s); ss.setDate(s.getDate() + i * intervalDays);
            const se = new Date(e); se.setDate(e.getDate() + i * intervalDays);
            return { name: `Sprint ${i + 1}`, start: ss.toLocaleDateString(), end: se.toLocaleDateString() };
          }),
        );
      }
    } else {
      setPreview([]);
    }
  };

  const setOff = (k: string, v: string) => setOffsets((o) => ({ ...o, [k]: v }));

  const handleClose = () => {
    setForm({ name: '', startDate: '', firstSprintEnd: '', sprintCount: '6' });
    setOffsets({ codeFreezeOffset: '', regressionOffset: '', regressionEndOffset: '', goNoGoOffset: '' });
    setUsePhaseTemplate(false);
    setPreview([]);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.firstSprintEnd) {
      setError('Name, Sprint 1 start date, and Sprint 1 end date are required.');
      return;
    }
    if (new Date(form.firstSprintEnd) < new Date(form.startDate)) {
      setError('Sprint 1 end date must be on or after Sprint 1 start date.');
      return;
    }
    // Validate offsets are within sprint length
    if (usePhaseTemplate) {
      const cf = Number(offsets.codeFreezeOffset) || 0;
      const rs = Number(offsets.regressionOffset) || 0;
      const re = Number(offsets.regressionEndOffset) || 0;
      const gng = Number(offsets.goNoGoOffset) || 0;
      if (cf && (cf < 1 || cf > sprintLength)) { setError(`Code Freeze day must be between 1 and ${sprintLength}.`); return; }
      if (rs && (rs < 1 || rs > sprintLength)) { setError(`Regression Start day must be between 1 and ${sprintLength}.`); return; }
      if (re && (re < 1 || re > sprintLength)) { setError(`Regression End day must be between 1 and ${sprintLength}.`); return; }
      if (gng && (gng < 1 || gng > sprintLength)) { setError(`Go/No-Go day must be between 1 and ${sprintLength}.`); return; }
    }
    try {
      await mutation.mutateAsync({
        name: form.name,
        startDate: form.startDate,
        firstSprintEnd: form.firstSprintEnd,
        sprintCount: Number(form.sprintCount),
        ...(projectId ? { projectId } : {}),
        ...(usePhaseTemplate ? {
          codeFreezeOffset:    offsets.codeFreezeOffset    ? Number(offsets.codeFreezeOffset)    : undefined,
          regressionOffset:    offsets.regressionOffset    ? Number(offsets.regressionOffset)    : undefined,
          regressionEndOffset: offsets.regressionEndOffset ? Number(offsets.regressionEndOffset) : undefined,
          goNoGoOffset:        offsets.goNoGoOffset        ? Number(offsets.goNoGoOffset)        : undefined,
        } : {}),
      });
      handleClose();
    } catch {
      setError('Failed to create sprint calendar. Please try again.');
    }
  };

  // Compute live milestone dates for Sprint 1 from offsets
  const sprint1MilestoneDates = (() => {
    if (!form.startDate || !sprintLength) return null;
    const base = new Date(form.startDate).getTime();
    const dayMs = 86_400_000;
    const fmt = (d: Date) => d.toLocaleDateString();
    const day = (n: number) => fmt(new Date(base + (n - 1) * dayMs));
    return {
      cf:  offsets.codeFreezeOffset    ? day(Number(offsets.codeFreezeOffset))    : null,
      rs:  offsets.regressionOffset    ? day(Number(offsets.regressionOffset))    : null,
      re:  offsets.regressionEndOffset ? day(Number(offsets.regressionEndOffset)) : null,
      gng: offsets.goNoGoOffset        ? day(Number(offsets.goNoGoOffset))        : null,
      gl:  day(sprintLength),
    };
  })();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>New Sprint Calendar</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField label="Calendar Name" value={form.name} onChange={(e) => setForm_('name', e.target.value)} required fullWidth />
        <Divider />
        <Typography variant="subtitle2" color="text.secondary">
          Define Sprint 1 — all subsequent sprints use the same duration
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Sprint 1 Start" type="date" value={form.startDate} onChange={(e) => setForm_('startDate', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth required />
          <TextField label="Sprint 1 End" type="date" value={form.firstSprintEnd} onChange={(e) => setForm_('firstSprintEnd', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth required />
        </Stack>
        {sprintLength > 0 && (
          <Typography variant="caption" color="text.secondary">Sprint length: <b>{sprintLength} calendar day{sprintLength !== 1 ? 's' : ''}</b></Typography>
        )}
        <TextField label="Number of Sprints" type="number" value={form.sprintCount} onChange={(e) => setForm_('sprintCount', e.target.value)} inputProps={{ min: 1, max: 104 }} fullWidth />

        {/* ── Phase Template ── */}
        <Divider />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2">Repeating Phase Template</Typography>
            <Typography variant="caption" color="text.secondary">
              Every sprint follows the same phase pattern (e.g. weekly releases, sprint-as-release)
            </Typography>
          </Box>
          <Button
            size="small"
            variant={usePhaseTemplate ? 'contained' : 'outlined'}
            onClick={() => setUsePhaseTemplate((v) => !v)}
          >
            {usePhaseTemplate ? 'Enabled' : 'Enable'}
          </Button>
        </Stack>

        {usePhaseTemplate && (
          <>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Enter the <b>day number</b> within the sprint (1 = first day).
              {sprintLength > 0 && ` Sprint has ${sprintLength} days. Go Live is always day ${sprintLength}.`}
            </Alert>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <TextField
                label="Code Freeze — Day #"
                type="number"
                value={offsets.codeFreezeOffset}
                onChange={(e) => setOff('codeFreezeOffset', e.target.value)}
                inputProps={{ min: 1, max: sprintLength || 999 }}
                helperText={sprint1MilestoneDates?.cf ? `Sprint 1: ${sprint1MilestoneDates.cf}` : ''}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <TextField
                label="Regression Start — Day #"
                type="number"
                value={offsets.regressionOffset}
                onChange={(e) => setOff('regressionOffset', e.target.value)}
                inputProps={{ min: 1, max: sprintLength || 999 }}
                helperText={sprint1MilestoneDates?.rs ? `Sprint 1: ${sprint1MilestoneDates.rs}` : ''}
                sx={{ flex: 1, minWidth: 160 }}
              />
            </Stack>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <TextField
                label="Regression End — Day #"
                type="number"
                value={offsets.regressionEndOffset}
                onChange={(e) => setOff('regressionEndOffset', e.target.value)}
                inputProps={{ min: 1, max: sprintLength || 999 }}
                helperText={sprint1MilestoneDates?.re ? `Sprint 1: ${sprint1MilestoneDates.re}` : ''}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <TextField
                label="Go/No-Go — Day #"
                type="number"
                value={offsets.goNoGoOffset}
                onChange={(e) => setOff('goNoGoOffset', e.target.value)}
                inputProps={{ min: 1, max: sprintLength || 999 }}
                helperText={sprint1MilestoneDates?.gng ? `Sprint 1: ${sprint1MilestoneDates.gng}` : ''}
                sx={{ flex: 1, minWidth: 160 }}
              />
            </Stack>
            {sprintLength > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">Phase preview (Sprint 1)</Typography>
                <PhaseBar
                  sprintLength={sprintLength}
                  codeFreezeOffset={offsets.codeFreezeOffset ? Number(offsets.codeFreezeOffset) : null}
                  regressionOffset={offsets.regressionOffset ? Number(offsets.regressionOffset) : null}
                  regressionEndOffset={offsets.regressionEndOffset ? Number(offsets.regressionEndOffset) : null}
                  goNoGoOffset={offsets.goNoGoOffset ? Number(offsets.goNoGoOffset) : null}
                />
                {sprint1MilestoneDates && (
                  <Stack gap={0.5}>
                    {sprint1MilestoneDates.cf  && <Typography variant="caption">🔴 Code Freeze: <b>{sprint1MilestoneDates.cf}</b></Typography>}
                    {sprint1MilestoneDates.rs  && <Typography variant="caption">🟠 Regression Start: <b>{sprint1MilestoneDates.rs}</b></Typography>}
                    {sprint1MilestoneDates.re  && <Typography variant="caption">🟠 Regression End: <b>{sprint1MilestoneDates.re}</b></Typography>}
                    {sprint1MilestoneDates.gng && <Typography variant="caption">🟣 Go/No-Go: <b>{sprint1MilestoneDates.gng}</b></Typography>}
                    <Typography variant="caption">🔵 Go Live: <b>{sprint1MilestoneDates.gl}</b> (last day)</Typography>
                  </Stack>
                )}
              </>
            )}
          </>
        )}

        {/* Sprint date preview */}
        {preview.length > 0 && (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary">Sprint schedule preview (first {preview.length})</Typography>
            <Stack gap={0.5}>
              {preview.map((p) => (
                <Stack key={p.name} direction="row" gap={1}>
                  <Typography variant="caption" sx={{ width: 70, fontWeight: 600 }}>{p.name}</Typography>
                  <Typography variant="caption">{p.start} → {p.end}</Typography>
                </Stack>
              ))}
              {Number(form.sprintCount) > 6 && (
                <Typography variant="caption" color="text.secondary">… and {Number(form.sprintCount) - 6} more</Typography>
              )}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Create Milestone Dialog ───────────────────────────────────────────────────
function CreateMilestoneDialog({ open, onClose, plans }: { open: boolean; onClose: () => void; plans: any[] }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mutation = useCreateMilestone();
  const [form, setForm] = useState({ releasePlanId: '', type: 'CODE_FREEZE', plannedDate: '' });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.releasePlanId || !form.plannedDate) {
      setError('Release plan and planned date are required.');
      return;
    }
    try {
      await mutation.mutateAsync(form);
      setForm({ releasePlanId: '', type: 'CODE_FREEZE', plannedDate: '' });
      setError('');
      onClose();
    } catch {
      setError('Failed to create milestone. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>New Milestone</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl fullWidth required>
          <InputLabel>Release Plan</InputLabel>
          <Select label="Release Plan" value={form.releasePlanId} onChange={(e) => set('releasePlanId', e.target.value)}>
            {plans.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.version} — {p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Milestone Type</InputLabel>
          <Select label="Milestone Type" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {MILESTONE_TYPES.map((t) => <MenuItem key={t} value={t}>{MILESTONE_LABELS[t]}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Planned Date" type="date" value={form.plannedDate} onChange={(e) => set('plannedDate', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Release Plan Dialog ──────────────────────────────────────────────────
const EMPTY_MILESTONES = {
  BACKLOG_GROOMING:    '',
  SPRINT_PLANNING:     '',
  BACKLOG_READINESS:   '',
  DEVELOPMENT_START:   '',
  CODE_FREEZE:         '',
  REGRESSION_START:    '',
  REGRESSION_END:      '',
  GO_NO_GO:            '',
  PRODUCTION_LIVE:     '',
  POST_RELEASE_REVIEW: '',
};

function planToMilestoneForm(plan: any): typeof EMPTY_MILESTONES {
  const base = { ...EMPTY_MILESTONES };
  (plan?.milestones ?? []).forEach((m: any) => {
    if (m.type in base) {
      (base as any)[m.type] = m.plannedDate ? m.plannedDate.slice(0, 10) : '';
    }
  });
  return base;
}

function EditReleasePlanDialog({ open, plan, onClose }: { open: boolean; plan: any; onClose: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const updatePlan      = useUpdateReleasePlan();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();

  const [form, setForm] = useState({
    name:         plan?.name         ?? '',
    version:      plan?.version      ?? '',
    type:         plan?.type         ?? 'MINOR',
    status:       plan?.status       ?? 'DRAFT',
    plannedStart: plan?.plannedStart ? plan.plannedStart.slice(0, 10) : '',
    plannedEnd:   plan?.plannedEnd   ? plan.plannedEnd.slice(0, 10)   : '',
  });
  const [milestones, setMilestones] = useState<typeof EMPTY_MILESTONES>(planToMilestoneForm(plan));
  const [error, setError] = useState('');

  // Re-sync when dialog opens for a different plan
  useState(() => {
    if (open) {
      setForm({
        name:         plan?.name         ?? '',
        version:      plan?.version      ?? '',
        type:         plan?.type         ?? 'MINOR',
        status:       plan?.status       ?? 'DRAFT',
        plannedStart: plan?.plannedStart ? plan.plannedStart.slice(0, 10) : '',
        plannedEnd:   plan?.plannedEnd   ? plan.plannedEnd.slice(0, 10)   : '',
      });
      setMilestones(planToMilestoneForm(plan));
      setError('');
    }
  });

  const set  = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setMs = (k: string, v: string) => setMilestones((m) => ({ ...m, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.version) { setError('Name and version are required.'); return; }
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: {
          name:         form.name,
          version:      form.version,
          type:         form.type,
          status:       form.status,
          plannedStart: form.plannedStart || undefined,
          plannedEnd:   form.plannedEnd   || undefined,
        },
      });

      // Upsert milestones: update existing, create new ones
      const existingByType: Record<string, any> = {};
      (plan?.milestones ?? []).forEach((m: any) => { existingByType[m.type] = m; });

      await Promise.all(
        Object.entries(milestones).map(([type, date]) => {
          if (!date) return Promise.resolve(); // blank = leave as-is / skip
          const existing = existingByType[type];
          if (existing) {
            return updateMilestone.mutateAsync({ id: existing.id, data: { plannedDate: date } });
          } else {
            return createMilestone.mutateAsync({ releasePlanId: plan.id, type, plannedDate: date });
          }
        }),
      );

      setError('');
      onClose();
    } catch {
      setError('Failed to update release plan.');
    }
  };

  const saving = updatePlan.isPending || createMilestone.isPending || updateMilestone.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Edit Release Plan</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" gap={2}>
          <TextField label="Version" value={form.version} onChange={(e) => set('version', e.target.value)} required fullWidth />
          <TextField label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <MenuItem value="MAJOR">MAJOR</MenuItem>
              <MenuItem value="MINOR">MINOR</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {RELEASE_STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Planned Start" type="date" value={form.plannedStart} onChange={(e) => set('plannedStart', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Planned End"   type="date" value={form.plannedEnd}   onChange={(e) => set('plannedEnd',   e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>

        {/* ── Pre-Development milestones ── */}
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Pre-Development <Typography component="span" variant="caption">(optional)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Backlog Grooming"  type="date" value={milestones.BACKLOG_GROOMING}  onChange={(e) => setMs('BACKLOG_GROOMING',  e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Sprint Planning"   type="date" value={milestones.SPRINT_PLANNING}   onChange={(e) => setMs('SPRINT_PLANNING',   e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Backlog Readiness" type="date" value={milestones.BACKLOG_READINESS} onChange={(e) => setMs('BACKLOG_READINESS', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <Box sx={{ flex: 1 }} />
        </Stack>

        {/* ── Cadence milestones ── */}
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Cadence Dates <Typography component="span" variant="caption">(optional)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Dev Start"         type="date" value={milestones.DEVELOPMENT_START} onChange={(e) => setMs('DEVELOPMENT_START', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Code Freeze"       type="date" value={milestones.CODE_FREEZE}       onChange={(e) => setMs('CODE_FREEZE',       e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Regression Start"  type="date" value={milestones.REGRESSION_START}  onChange={(e) => setMs('REGRESSION_START',  e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Regression End"    type="date" value={milestones.REGRESSION_END}    onChange={(e) => setMs('REGRESSION_END',    e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>
        <Stack direction="row" gap={2}>
          <TextField label="Go / No-Go"        type="date" value={milestones.GO_NO_GO}          onChange={(e) => setMs('GO_NO_GO',          e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Prod Live"         type="date" value={milestones.PRODUCTION_LIVE}   onChange={(e) => setMs('PRODUCTION_LIVE',   e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Stack>

        {/* ── Post-Release ── */}
        <Divider />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1 }}>
          Post-Release <Typography component="span" variant="caption">(optional)</Typography>
        </Typography>
        <Stack direction="row" gap={2}>
          <TextField label="Post-Release Review" type="date" value={milestones.POST_RELEASE_REVIEW} onChange={(e) => setMs('POST_RELEASE_REVIEW', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <Box sx={{ flex: 1 }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Release Plan Confirmation ─────────────────────────────────────────
function DeleteReleasePlanDialog({ open, plan, onClose }: { open: boolean; plan: any; onClose: () => void }) {
  const deletePlan = useDeleteReleasePlan();
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync(plan.id);
      setError('');
      onClose();
    } catch {
      setError('Failed to delete release plan.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Release Plan?</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Typography>
          Are you sure you want to delete <b>{plan?.version} — {plan?.name}</b>?
          All associated milestones will also be removed. This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={deletePlan.isPending}>
          {deletePlan.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReleasePlanCard({ plan }: { plan: any }) {
  const updatePlan = useUpdateReleasePlan();
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setStatusAnchor(null);
    if (newStatus === plan.status) return;
    setStatusUpdating(true);
    try {
      await updatePlan.mutateAsync({ id: plan.id, data: { status: newStatus } });
    } finally {
      setStatusUpdating(false);
    }
  };

  const pct = plan.milestones?.length
    ? Math.round(
        (plan.milestones.filter((m: any) => m.status === 'COMPLETED').length /
          plan.milestones.length) *
          100,
      )
    : 0;

  const statusColor = STATUS_COLORS[plan.status] ?? '#9e9e9e';

  return (
    <>
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight={700}>
              {plan.version} — {plan.name}
            </Typography>
            <Chip
              label={plan.type}
              size="small"
              color={plan.type === 'MAJOR' ? 'primary' : 'default'}
              variant="outlined"
            />
          </Stack>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {plan.project?.name} ·{' '}
            {new Date(plan.plannedStart).toLocaleDateString()} →{' '}
            {new Date(plan.plannedEnd).toLocaleDateString()}
          </Typography>
        }
        action={
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5, mr: 1 }}>
            {/* Status button — uses Menu to avoid Select-inside-Typography crash */}
            <Tooltip title="Change status">
              <Button
                size="small"
                variant="outlined"
                disabled={statusUpdating}
                onClick={(e) => setStatusAnchor(e.currentTarget)}
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 700,
                  color: statusColor,
                  borderColor: statusColor,
                  bgcolor: statusColor + '22',
                  '&:hover': { borderColor: statusColor, bgcolor: statusColor + '33' },
                  minWidth: 110,
                  textTransform: 'none',
                  px: 1,
                }}
              >
                {plan.status.replace(/_/g, ' ')}
              </Button>
            </Tooltip>
            <Menu
              anchorEl={statusAnchor}
              open={Boolean(statusAnchor)}
              onClose={() => setStatusAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {RELEASE_STATUSES.map((s) => (
                <MenuItem
                  key={s}
                  selected={s === plan.status}
                  onClick={() => handleStatusChange(s)}
                  sx={{ fontSize: 12, color: STATUS_COLORS[s], fontWeight: s === plan.status ? 700 : 400 }}
                >
                  {s.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Menu>

            {/* Edit */}
            <Tooltip title="Edit release plan">
              <IconButton size="small" onClick={() => setEditOpen(true)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Delete */}
            <Tooltip title="Delete release plan">
              <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Progress ring */}
            {plan.milestones?.length > 0 && (
              <Tooltip title={`${pct}% milestones complete`}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={pct}
                    size={36}
                    color={pct === 100 ? 'success' : 'primary'}
                  />
                  <Box
                    sx={{
                      top: 0, left: 0, bottom: 0, right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" fontSize={9} fontWeight={700}>
                      {pct}%
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            )}
          </Stack>
        }
      />
      {plan.milestones?.length > 0 && (
        <>
          <Divider />
          <CardContent sx={{ py: 1 }}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {plan.milestones.map((m: any) => (
                <Chip
                  key={m.id}
                  icon={<Flag sx={{ fontSize: 14 }} />}
                  label={`${MILESTONE_LABELS[m.type] ?? m.type}: ${new Date(m.plannedDate).toLocaleDateString()}`}
                  size="small"
                  color={
                    m.status === 'COMPLETED'
                      ? 'success'
                      : m.status === 'AT_RISK' || m.status === 'DELAYED'
                      ? 'error'
                      : 'default'
                  }
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </>
      )}
      {plan.children?.length > 0 && (
        <>
          <Divider />
          <CardContent sx={{ py: 1, pl: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Minor releases ({plan.children.length})
            </Typography>
            <Stack gap={1}>
              {plan.children.map((child: any) => (
                <Stack key={child.id} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={500}>
                    {child.version}
                  </Typography>
                  <Chip
                    label={child.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: STATUS_COLORS[child.status] + '22',
                      color: STATUS_COLORS[child.status],
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(child.plannedStart).toLocaleDateString()} →{' '}
                    {new Date(child.plannedEnd).toLocaleDateString()}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </>
      )}
    </Card>

    {/* Edit / Delete dialogs rendered outside Card to avoid nesting issues */}
    <EditReleasePlanDialog   open={editOpen}   plan={plan} onClose={() => setEditOpen(false)} />
    <DeleteReleasePlanDialog open={deleteOpen} plan={plan} onClose={() => setDeleteOpen(false)} />
  </>
  );
}

// ── Export multiple release plans to Excel (single Gantt sheet) ───────────────
function exportReleasePlansToExcel(plans: any[]) {
  const wb = XLSX.utils.book_new();

  // ── Color palette (labelBg = vivid, barBg = tint, font = text on labelBg) ──
  type ColEntry = { labelBg: string; barBg: string; font: string };
  const COLOR_MAP: Record<string, ColEntry> = {
    Release:           { labelBg: '1565C0', barBg: 'BBDEFB', font: 'FFFFFF' },
    'Minor Release':   { labelBg: '0277BD', barBg: 'B3E5FC', font: 'FFFFFF' },
    DEVELOPMENT_START: { labelBg: '2E7D32', barBg: 'C8E6C9', font: 'FFFFFF' },
    CODE_FREEZE:       { labelBg: 'C62828', barBg: 'FFCDD2', font: 'FFFFFF' },
    REGRESSION_START:  { labelBg: 'E65100', barBg: 'FFE0B2', font: 'FFFFFF' },
    REGRESSION_END:    { labelBg: 'BF360C', barBg: 'FFCCBC', font: 'FFFFFF' },
    GO_NO_GO:          { labelBg: '6A1B9A', barBg: 'E1BEE7', font: 'FFFFFF' },
    PRODUCTION_LIVE:   { labelBg: '01579B', barBg: 'E3F2FD', font: 'FFFFFF' },
    Phase:             { labelBg: 'F57C00', barBg: 'FFE0B2', font: 'FFFFFF' },
    Milestone:         { labelBg: '455A64', barBg: 'CFD8DC', font: 'FFFFFF' },
  };
  const resolveColor = (type: string, milestoneType?: string): ColEntry =>
    (milestoneType ? COLOR_MAP[milestoneType] : undefined) ?? COLOR_MAP[type] ?? COLOR_MAP['Milestone'];

  // ── Collect events ─────────────────────────────────────────────────────────
  type GanttRow = { label: string; plan: string; type: string; start: number; end: number; milestoneType?: string };
  const events: GanttRow[] = [];

  const SPAN_MILESTONE_TYPES = new Set(['REGRESSION_START', 'REGRESSION_END', 'GO_NO_GO']);

  plans.forEach((plan: any) => {
    const pName = `${plan.version} — ${plan.name}`;
    const planEnd = plan.plannedEnd ? new Date(plan.plannedEnd).getTime() : null;

    if (plan.plannedStart && plan.plannedEnd) {
      events.push({ label: pName, plan: pName, type: 'Release',
        start: new Date(plan.plannedStart).getTime(), end: new Date(plan.plannedEnd).getTime() });
    }

    const milestones: any[] = [...(plan.milestones ?? [])].sort(
      (a: any, b: any) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime(),
    );
    milestones.forEach((m: any) => {
      const t = new Date(m.plannedDate).getTime();
      if (!isNaN(t)) {
        const cfg = MS_CONFIG[m.type];
        const isSpan = SPAN_MILESTONE_TYPES.has(m.type);
        events.push({
          label: cfg?.label ?? m.type,
          plan: pName,
          type: isSpan ? 'Phase' : 'Milestone',
          milestoneType: m.type,
          start: t,
          end: isSpan && planEnd ? planEnd : t,
        });
      }
    });

    (plan.children ?? []).forEach((child: any) => {
      if (child.plannedStart && child.plannedEnd) {
        events.push({ label: `${child.version} — ${child.name}`, plan: pName, type: 'Minor Release',
          start: new Date(child.plannedStart).getTime(), end: new Date(child.plannedEnd).getTime() });
      }
    });
  });

  if (!events.length) {
    const rows: any[][] = [['Plan', 'Version', 'Type', 'Status', 'Planned Start', 'Planned End', 'Milestones']];
    plans.forEach((p: any) => rows.push([p.name, p.version, p.type, p.status,
      p.plannedStart ? new Date(p.plannedStart).toLocaleDateString('en-CA') : '',
      p.plannedEnd   ? new Date(p.plannedEnd).toLocaleDateString('en-CA')   : '',
      (p.milestones ?? []).length]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Release Plans');
    XLSX.writeFile(wb, `release-plans-${new Date().toISOString().slice(0, 10)}.xlsx`);
    return;
  }

  // ── Build weekday columns ──────────────────────────────────────────────────
  const allTimes = events.flatMap((e) => [e.start, e.end]).filter(Boolean);
  const minTime  = Math.min(...allTimes);
  const maxTime  = Math.max(...allTimes);

  const days: number[] = [];
  const anchorD = new Date(minTime);
  let cur = Date.UTC(anchorD.getUTCFullYear(), anchorD.getUTCMonth(), anchorD.getUTCDate());
  const endUTC = (() => { const d = new Date(maxTime); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); })();
  while (cur <= endUTC) {
    const dow = new Date(cur).getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(cur);
    cur += 86_400_000;
  }

  const fmtDay    = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmtDayISO = (ts: number) => new Date(ts).toLocaleDateString('en-CA', { timeZone: 'UTC' });

  // ── Header rows ────────────────────────────────────────────────────────────
  const monthSpans: { label: string; count: number }[] = [];
  days.forEach((d) => {
    const label = new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!monthSpans.length || monthSpans[monthSpans.length - 1].label !== label) {
      monthSpans.push({ label, count: 1 });
    } else {
      monthSpans[monthSpans.length - 1].count++;
    }
  });

  const monthRow: any[] = ['', '', '', '', ''];
  monthSpans.forEach(({ label, count }) => {
    monthRow.push(label);
    for (let i = 1; i < count; i++) monthRow.push('');
  });
  const dayRow: any[] = ['Item', 'Plan', 'Type', 'Start', 'End', ...days.map(fmtDay)];
  const rows: any[][] = [monthRow, dayRow];

  // ── Data rows ──────────────────────────────────────────────────────────────
  const planOrder = plans.map((p: any) => `${p.version} — ${p.name}`);
  const sorted = [...events].sort((a, b) => {
    const ai = planOrder.indexOf(a.plan); const bi = planOrder.indexOf(b.plan);
    if (ai !== bi) return ai - bi;
    if (a.type === 'Release') return -1;
    if (b.type === 'Release') return 1;
    return a.start - b.start;
  });

  sorted.forEach((e) => {
    const startUTC = (() => { const d = new Date(e.start); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); })();
    const endUTC2  = (() => { const d = new Date(e.end);   return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); })();
    const bar = days.map((d) => {
      if (e.type === 'Milestone') return d === startUTC ? '◆' : '';
      return d >= startUTC && d <= endUTC2 ? '■' : ''; // ■ will be cleared; only color fill remains
    });
    rows.push([
      e.label, e.plan, e.type,
      fmtDayISO(e.start),
      e.type === 'Milestone' ? '' : fmtDayISO(e.end),
      ...bar,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ...days.map(() => ({ wch: 4 })),
  ];

  // ── Apply cell styles ──────────────────────────────────────────────────────
  const HEADER_ROWS = 2;
  const DATA_COLS   = 5; // Item, Plan, Type, Start, End
  const totalCols   = DATA_COLS + days.length;

  const S_MONTH: XLSX.CellStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '37474F' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const S_DAY: XLSX.CellStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '546E7A' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 8 },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Style both header rows across all columns
  for (let c = 0; c < totalCols; c++) {
    const r0 = XLSX.utils.encode_cell({ r: 0, c });
    const r1 = XLSX.utils.encode_cell({ r: 1, c });
    if (!ws[r0]) ws[r0] = { t: 's', v: '' };
    if (!ws[r1]) ws[r1] = { t: 's', v: '' };
    ws[r0].s = S_MONTH;
    ws[r1].s = S_DAY;
  }

  const S_META: XLSX.CellStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } },
    font: { color: { rgb: '444444' }, sz: 9 },
    alignment: { vertical: 'center' },
  };

  sorted.forEach((e, i) => {
    const wsRow = HEADER_ROWS + i;
    const col   = resolveColor(e.type, e.milestoneType);

    // Col A — vivid label color per type
    const labelRef = XLSX.utils.encode_cell({ r: wsRow, c: 0 });
    if (ws[labelRef]) {
      ws[labelRef].s = {
        fill: { patternType: 'solid', fgColor: { rgb: col.labelBg } },
        font: { bold: true, color: { rgb: col.font }, sz: 10 },
        alignment: { vertical: 'center' },
      };
    }

    // Cols B–E — neutral meta style
    for (let c = 1; c < DATA_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r: wsRow, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = S_META;
    }

    // Bar columns — tint fill for spans, vivid fill for milestone diamonds
    days.forEach((_d, di) => {
      const ref = XLSX.utils.encode_cell({ r: wsRow, c: DATA_COLS + di });
      if (!ws[ref] || ws[ref].v === '') return; // skip empty cells

      const isMilestone = e.type === 'Milestone';
      ws[ref].s = {
        fill: { patternType: 'solid', fgColor: { rgb: isMilestone ? col.labelBg : col.barBg } },
        font: {
          bold: isMilestone,
          // For spans: make ■ invisible (same color as bg); for milestones: white ◆
          color: { rgb: isMilestone ? 'FFFFFF' : col.barBg },
          sz: isMilestone ? 9 : 8,
        },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      // Remove the ■ placeholder for span rows — the fill color tells the story
      if (!isMilestone) ws[ref].v = '';
    });
  });

  const sheetName = plans.length === 1
    ? `${plans[0].version} ${plans[0].name}`.slice(0, 31)
    : 'Release Timeline';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `release-plans-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Sortable row wrapper ──────────────────────────────────────────────────────
function SortablePlanRow({
  plan,
  selected,
  onToggle,
}: {
  plan: any;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        mb: 0,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 'auto',
      }}
    >
      {/* Drag handle */}
      <Tooltip title="Drag to reorder">
        <Box
          {...attributes}
          {...listeners}
          sx={{
            mt: 2, flexShrink: 0, cursor: 'grab', color: 'text.disabled',
            display: 'flex', alignItems: 'center',
            '&:active': { cursor: 'grabbing' },
            '&:hover': { color: 'text.secondary' },
          }}
        >
          <DragIndicator fontSize="small" />
        </Box>
      </Tooltip>

      {/* Checkbox */}
      <Tooltip title={selected ? 'Deselect' : 'Select for export'}>
        <Box
          onClick={() => onToggle(plan.id)}
          sx={{
            mt: 2.2, width: 20, height: 20, flexShrink: 0, cursor: 'pointer',
            border: '2px solid', borderColor: selected ? 'primary.main' : 'grey.400',
            borderRadius: 0.5, bgcolor: selected ? 'primary.main' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected && (
            <Typography sx={{ color: '#fff', fontSize: 13, lineHeight: 1, fontWeight: 900 }}>✓</Typography>
          )}
        </Box>
      </Tooltip>

      <Box sx={{ flex: 1 }}>
        <ReleasePlanCard plan={plan} />
      </Box>
    </Box>
  );
}

// ── Releases Tab ──────────────────────────────────────────────────────────────
function ReleasesTab({ plans, onNewPlan, projectId }: { plans: any[]; onNewPlan: () => void; projectId?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const storageKey = `release-order-${projectId ?? 'global'}`;
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : plans.map((p: any) => p.id);
    } catch {
      return plans.map((p: any) => p.id);
    }
  });

  const orderedPlans = useMemo(() => {
    const planMap = new Map(plans.map((p: any) => [p.id, p]));
    const result: any[] = [];
    for (const id of orderedIds) {
      if (planMap.has(id)) result.push(planMap.get(id));
    }
    // Append any newly added plans not yet in stored order
    for (const p of plans) {
      if (!orderedIds.includes(p.id)) result.push(p);
    }
    return result;
  }, [plans, orderedIds]);

  const toggle = (id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setSelected((prev) => prev.size === orderedPlans.length ? new Set() : new Set(orderedPlans.map((p: any) => p.id)));

  const selectedPlans = orderedPlans.filter((p: any) => selected.has(p.id));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedPlans.findIndex((p: any) => p.id === active.id);
      const newIndex = orderedPlans.findIndex((p: any) => p.id === over.id);
      const newOrder = arrayMove(orderedPlans, oldIndex, newIndex).map((p: any) => p.id);
      setOrderedIds(newOrder);
      try { localStorage.setItem(storageKey, JSON.stringify(newOrder)); } catch { /* ignore */ }
    }
  };

  if (!plans.length) {
    return (
      <EmptyState
        icon={<RocketLaunch sx={{ fontSize: 56 }} />}
        title="No release plans yet"
        description="Create your first release plan to start tracking versions and milestones."
        action={{ label: 'New Release Plan', onClick: onNewPlan }}
      />
    );
  }

  return (
    <Box>
      {/* Selection toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1.5} mb={2} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          onClick={toggleAll}
          sx={{ textTransform: 'none', minWidth: 120 }}
        >
          {selected.size === orderedPlans.length ? 'Deselect All' : `Select All (${orderedPlans.length})`}
        </Button>
        {selected.size > 0 && (
          <>
            <Chip size="small" label={`${selected.size} selected`} color="primary" />
            <Button
              size="small"
              variant="contained"
              startIcon={<FileDownload />}
              onClick={() => exportReleasePlansToExcel(selectedPlans)}
            >
              Export {selected.size === 1 ? 'Plan' : `${selected.size} Plans`} to Excel
            </Button>
          </>
        )}
      </Stack>

      {/* Sortable cards */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedPlans.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
          {orderedPlans.map((plan: any) => (
            <SortablePlanRow
              key={plan.id}
              plan={plan}
              selected={selected.has(plan.id)}
              onToggle={toggle}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  );
}

// ── Add Sprints Dialog ───────────────────────────────────────────────────
function AddSprintsDialog({ open, calendar, onClose }: { open: boolean; calendar: any; onClose: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const extend = useExtendSprintCalendar();
  const [count, setCount] = useState('6');
  const [error, setError] = useState('');

  const lastSprint = calendar?.sprints?.slice(-1)[0];
  const interval   = calendar?.sprintLength ?? 14;

  // Preview next N sprints
  const preview = (() => {
    if (!lastSprint || !Number(count)) return [];
    const lastEndMs = new Date(lastSprint.endDate).getTime();
    const n = Math.min(Number(count), 6);
    return Array.from({ length: n }, (_, i) => ({
      name:  `Sprint ${lastSprint.number + 1 + i}`,
      start: new Date(lastEndMs + (1 + i * interval) * 86_400_000).toLocaleDateString(),
      end:   new Date(lastEndMs + ((i + 1) * interval) * 86_400_000).toLocaleDateString(),
    }));
  })();

  const handleClose = () => { setCount('6'); setError(''); onClose(); };

  const handleSubmit = async () => {
    const n = Number(count);
    if (!n || n < 1 || n > 52) { setError('Enter a number between 1 and 52.'); return; }
    try {
      await extend.mutateAsync({ id: calendar.id, count: n });
      handleClose();
    } catch {
      setError('Failed to add sprints. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Add Sprints to "{calendar?.name}"</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {lastSprint && (
          <Typography variant="caption" color="text.secondary">
            Last sprint: <b>{lastSprint.name}</b> ends {new Date(lastSprint.endDate).toLocaleDateString()}
          </Typography>
        )}
        <TextField
          label="Number of sprints to add"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          inputProps={{ min: 1, max: 52 }}
          fullWidth
        />
        {preview.length > 0 && (
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">Preview:</Typography>
            {preview.map((p) => (
              <Stack key={p.name} direction="row" gap={1}>
                <Typography variant="caption" sx={{ width: 70, fontWeight: 600 }}>{p.name}</Typography>
                <Typography variant="caption">{p.start} → {p.end}</Typography>
              </Stack>
            ))}
            {Number(count) > 6 && (
              <Typography variant="caption" color="text.secondary">…and {Number(count) - 6} more</Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={extend.isPending}>
          {extend.isPending ? 'Adding…' : 'Add Sprints'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Per-calendar Excel export ─────────────────────────────────────────────
function exportCalendarToExcel(cal: any) {
  if (!cal) return;
  const wb = XLSX.utils.book_new();
  const sprints: any[] = (cal.sprints ?? []).sort((a: any, b: any) => a.number - b.number);

  // ─ Sheet 1: Sprint list ─
  const listRows = [
    ['Sprint #', 'Sprint Name', 'Start Date', 'End Date', 'Duration (days)'],
    ...sprints.map((s: any) => {
      const sd = new Date(s.startDate); const ed = new Date(s.endDate);
      const d = Math.round((ed.getTime() - sd.getTime()) / 86_400_000) + 1;
      return [s.number, s.name, sd.toLocaleDateString('en-CA'), ed.toLocaleDateString('en-CA'), d];
    }),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(listRows);
  ws1['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, cal.name.slice(0, 31));

  // ─ Sheet 2: Gantt view (week columns) ─
  const allTimes = sprints.flatMap((s: any) => [
    new Date(s.startDate).getTime(), new Date(s.endDate).getTime(),
  ]);
  if (allTimes.length) {
    const minT = Math.min(...allTimes); const maxT = Math.max(...allTimes);
    const anchorD = new Date(minT);
    const anchor  = Date.UTC(anchorD.getUTCFullYear(), anchorD.getUTCMonth(), anchorD.getUTCDate());
    const weeks: number[] = []; let cur = anchor;
    while (cur <= maxT + 7 * 86_400_000) { weeks.push(cur); cur += 7 * 86_400_000; }
    const fmtWk = (ts: number) =>
      new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const ganttRows: any[][] = [['Sprint', ...weeks.map(fmtWk)]];
    sprints.forEach((s: any) => {
      const sd0 = new Date(s.startDate); const ed0 = new Date(s.endDate);
      const ss = Date.UTC(sd0.getUTCFullYear(), sd0.getUTCMonth(), sd0.getUTCDate());
      const se = Date.UTC(ed0.getUTCFullYear(), ed0.getUTCMonth(), ed0.getUTCDate());
      ganttRows.push([s.name, ...weeks.map((w) => {
        const we = w + 6 * 86_400_000;
        return se < w || ss > we ? '' : '■';
      })]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(ganttRows);
    ws2['!cols'] = [{ wch: 14 }, ...weeks.map(() => ({ wch: 7 }))];
    XLSX.utils.book_append_sheet(wb, ws2, 'Gantt View');
  }

  XLSX.writeFile(wb, `sprint-${cal.name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Single-calendar Gantt chart ─────────────────────────────────────────────
function SprintCalendarGantt({ calendar, onAddSprints }: { calendar: any; onAddSprints: () => void }) {
  if (!calendar) return <EmptyState title="Select a calendar" description="Choose a sprint calendar from the dropdown above." />;
  const sprints: any[] = (calendar.sprints ?? []).sort((a: any, b: any) => a.number - b.number);
  if (!sprints.length) return <EmptyState title="No sprints" description="This calendar has no sprints yet." action={{ label: 'Add Sprints', onClick: onAddSprints }} />;

  // Build phase-aware color per sprint bar (if template active)
  const hasTemplate = !!calendar.codeFreezeOffset;

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const d = p.data;
        const s  = new Date(d[1]).toLocaleDateString();
        const e  = new Date(d[2]).toLocaleDateString();
        const days = Math.round((new Date(d[2]).getTime() - new Date(d[1]).getTime()) / 86_400_000) + 1;
        return `<b>${d[3]}</b><br/>${s} → ${e}<br/>${days} days`;
      },
    },
    grid: { left: 90, right: 40, top: 20, bottom: 40 },
    xAxis: { type: 'time', axisLabel: { formatter: '{MMM} {d} {yyyy}', fontSize: 11 } },
    yAxis: {
      type: 'category',
      data: [...sprints].reverse().map((s: any) => s.name),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      type: 'custom',
      renderItem: (_: any, api: any) => {
        const yIdx   = api.value(0);
        const startX = api.coord([api.value(1), yIdx]);
        const endX   = api.coord([api.value(2), yIdx]);
        const h      = api.size([0, 1])[1] * 0.62;
        const w      = Math.max(2, endX[0] - startX[0]);
        const color  = api.value(4) as string;
        const lbl    = api.value(3) as string;
        const pxPerChar = 7;
        const showLabel = w > lbl.length * pxPerChar + 8;
        return {
          type: 'group',
          children: [
            {
              type: 'rect',
              shape: { x: startX[0], y: startX[1] - h / 2, width: w, height: h, r: 2 },
              style: { fill: color, opacity: 0.88 },
            },
            ...(showLabel ? [{
              type: 'text',
              style: {
                text: lbl,
                x: startX[0] + 6,
                y: startX[1],
                fill: '#fff',
                fontSize: 11,
                fontWeight: 700,
                textVerticalAlign: 'middle',
              },
            }] : []),
          ],
        };
      },
      encode: { x: [1, 2], y: 0 },
      data: [...sprints].reverse().map((s: any, i: number) => {
        const phases = hasTemplate ? computeSprintPhases(s, calendar).phases : [];
        // Dominant color = first non-milestone phase
        const color = phases.find((p) => !p.isMilestone)?.color ?? '#1976d2';
        return [i, s.startDate, s.endDate, s.name, color];
      }),
    }],
  };

  const h = Math.max(280, sprints.length * 32 + 80);
  return <ReactECharts option={option} style={{ height: h }} />;
}

// ── Sprint Calendars Tab ───────────────────────────────────────────────────────
function SprintsTab({ calendars, onNewCalendar }: { calendars: any[]; onNewCalendar: () => void }) {
  const [selCalId, setSelCalId] = useState(calendars[0]?.id ?? '');
  const [addSprintsOpen, setAddSprintsOpen] = useState(false);

  const calendar = calendars.find((c: any) => c.id === selCalId) ?? calendars[0];

  if (!calendars.length) {
    return (
      <EmptyState
        icon={<CalendarMonth sx={{ fontSize: 56 }} />}
        title="No sprint calendars yet"
        description="Create your first sprint calendar to plan and visualise sprints."
        action={{ label: 'New Sprint Calendar', onClick: onNewCalendar }}
      />
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
          <InputLabel>Sprint Calendar</InputLabel>
          <Select
            label="Sprint Calendar"
            value={selCalId || (calendars[0]?.id ?? '')}
            onChange={(e) => setSelCalId(e.target.value)}
          >
            {calendars.map((c: any) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {calendar && (
          <>
            <Chip
              size="small"
              label={`${calendar.sprints?.length ?? 0} sprints · ${calendar.sprintLength}d each`}
              color="primary"
              variant="outlined"
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlaylistAdd />}
              onClick={() => setAddSprintsOpen(true)}
            >
              Add Sprints
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => exportCalendarToExcel(calendar)}
            >
              Export Excel
            </Button>
          </>
        )}
      </Stack>

      {/* Gantt */}
      <Card variant="outlined">
        <CardHeader
          title={calendar?.name ?? 'Sprint Gantt'}
          subheader={
            calendar
              ? `${calendar.sprints?.length ?? 0} sprints · ${calendar.sprintLength} calendar days each`
              : ''
          }
        />
        <Divider />
        <CardContent sx={{ p: 1 }}>
          <SprintCalendarGantt calendar={calendar} onAddSprints={() => setAddSprintsOpen(true)} />
        </CardContent>
      </Card>

      {/* Sprint table */}
      {calendar && (calendar.sprints?.length ?? 0) > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, overflow: 'auto', maxHeight: 340 }}>
          <Stack direction="row" sx={{ bgcolor: 'grey.50', px: 2, py: 1, position: 'sticky', top: 0 }}>
            <Typography variant="caption" fontWeight={700} sx={{ width: 60 }}>#</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 80 }}>Sprint</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Start</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>End</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 70 }}>Days</Typography>
          </Stack>
          <Divider />
          {[...(calendar.sprints ?? [])].sort((a: any, b: any) => a.number - b.number).map((s: any) => {
            const sd = new Date(s.startDate); const ed = new Date(s.endDate);
            const days = Math.round((ed.getTime() - sd.getTime()) / 86_400_000) + 1;
            return (
              <Stack key={s.id} direction="row" sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ width: 60, color: 'text.secondary' }}>{s.number}</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ width: 80 }}>{s.name}</Typography>
                <Typography variant="caption" sx={{ flex: 1 }}>{sd.toLocaleDateString()}</Typography>
                <Typography variant="caption" sx={{ flex: 1 }}>{ed.toLocaleDateString()}</Typography>
                <Typography variant="caption" sx={{ width: 70 }}>{days}d</Typography>
              </Stack>
            );
          })}
        </Paper>
      )}

      {calendar && <AddSprintsDialog open={addSprintsOpen} calendar={calendar} onClose={() => setAddSprintsOpen(false)} />}
    </Box>
  );
}

function MilestonesTab({ plans }: { plans: any[] }) {
  const allMilestones = plans.flatMap((p) =>
    (p.milestones ?? []).map((m: any) => ({ ...m, release: p })),
  );
  if (!allMilestones.length) {
    return <EmptyState title="No milestones" description="Milestones appear when added to release plans" />;
  }
  const sorted = [...allMilestones].sort(
    (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime(),
  );
  return (
    <Stack gap={1}>
      {sorted.map((m) => (
        <Paper key={m.id} variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            <Flag fontSize="small" color={m.status === 'COMPLETED' ? 'success' : m.status === 'AT_RISK' ? 'error' : 'action'} />
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600}>
                {MILESTONE_LABELS[m.type] ?? m.type}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.release.version} · {m.release.name}
              </Typography>
            </Box>
            <Typography variant="caption">{new Date(m.plannedDate).toLocaleDateString()}</Typography>
            <Chip label={m.status.replace('_', ' ')} size="small" />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

// ── Milestone display config ────────────────────────────────────────────────
const MS_CONFIG: Record<string, { label: string; color: string; symbol: string }> = {
  BACKLOG_GROOMING:    { label: 'Backlog Grooming',  color: '#00acc1', symbol: 'rect'     },
  SPRINT_PLANNING:     { label: 'Sprint Planning',   color: '#039be5', symbol: 'rect'     },
  BACKLOG_READINESS:   { label: 'Backlog Readiness', color: '#00897b', symbol: 'diamond'  },
  DEVELOPMENT_START:   { label: 'Dev Start',         color: '#43a047', symbol: 'triangle' },
  CODE_FREEZE:         { label: 'Code Freeze',       color: '#e53935', symbol: 'diamond'  },
  REGRESSION_START:    { label: 'Regression Start',  color: '#fb8c00', symbol: 'triangle' },
  REGRESSION_END:      { label: 'Regression End',    color: '#f4511e', symbol: 'triangle' },
  GO_NO_GO:            { label: 'Go / No-Go',        color: '#8e24aa', symbol: 'diamond'  },
  PRODUCTION_LIVE:     { label: 'Prod Live',         color: '#1e88e5', symbol: 'pin'      },
  POST_RELEASE_REVIEW: { label: 'Post-Release Review', color: '#6d4c41', symbol: 'rect'   },
};

// ── Gantt View sheet helper ───────────────────────────────────────────────────
function addGanttSheet(wb: XLSX.WorkBook, sprints: any[], milestones: any[], calendar: any) {
  const validSprints = sprints.filter(
    (s: any) => !isNaN(new Date(s.startDate).getTime()) && !isNaN(new Date(s.endDate).getTime()),
  );
  const validMs = milestones.filter((m: any) => !isNaN(new Date(m.plannedDate).getTime()));
  const allTimes = [
    ...validSprints.map((s: any) => new Date(s.startDate).getTime()),
    ...validSprints.map((s: any) => new Date(s.endDate).getTime()),
    ...validMs.map((m: any) => new Date(m.plannedDate).getTime()),
  ];
  if (!allTimes.length) return;

  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);

  // Anchor at the UTC calendar date of the earliest event (no Monday snap)
  const anchorDate = new Date(minTime);
  const anchor = Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate());

  const weeks: number[] = [];
  let cur = anchor;
  while (cur <= maxTime + 7 * 86_400_000) {
    weeks.push(cur);
    cur += 7 * 86_400_000;
  }

  const fmtWk = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const phaseAbbr: Record<string, string> = {
    Development: 'Dev', 'Code Freeze': 'CF', Regression: 'Reg', 'Go/No-Go': 'GNG', 'Go Live': 'GL',
  };

  const rows: any[][] = [['Name', ...weeks.map(fmtWk)]];

  validSprints.forEach((s: any) => {
    // Normalise sprint bounds to UTC day timestamps
    const sd = new Date(s.startDate);
    const ed = new Date(s.endDate);
    const ss = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate());
    const se = Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate());
    const { phases } = computeSprintPhases(s, calendar);
    const cells = weeks.map((wStart) => {
      const wEnd = wStart + 6 * 86_400_000;
      if (se < wStart || ss > wEnd) return '';
      const mid = wStart + 3 * 86_400_000;
      const ph = phases.find((p) => !p.isMilestone && mid >= p.start.getTime() && mid <= p.end.getTime());
      return ph ? phaseAbbr[ph.label] ?? '■' : '■';
    });
    rows.push([s.name, ...cells]);
  });

  if (validMs.length) {
    // Find the latest date across all sprints to use as range end for phase milestones
    const sprintMaxTime = validSprints.length
      ? Math.max(...validSprints.map((s: any) => new Date(s.endDate).getTime()))
      : maxTime;

    const SPAN_MS = new Set(['REGRESSION_START', 'REGRESSION_END', 'GO_NO_GO']);

    rows.push([]);
    validMs.forEach((m: any) => {
      const md0 = new Date(m.plannedDate);
      const md = Date.UTC(md0.getUTCFullYear(), md0.getUTCMonth(), md0.getUTCDate());
      const isSpan = SPAN_MS.has(m.type);
      // Span milestones: extend to last sprint end
      const rangeEnd = isSpan
        ? (() => { const d = new Date(sprintMaxTime); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); })()
        : md;
      const cfg = MS_CONFIG[m.type];
      const cells = weeks.map((wStart) => {
        const wEnd = wStart + 6 * 86_400_000;
        if (isSpan) return md <= wEnd && rangeEnd >= wStart ? '■' : '';
        return md >= wStart && md <= wEnd ? '★' : '';
      });
      rows.push([cfg?.label ?? m.type, ...cells]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, ...weeks.map(() => ({ wch: 7 }))];
  XLSX.utils.book_append_sheet(wb, ws, 'Gantt View');
}

// ── Excel export for integrated timeline ──────────────────────────────────────
function exportTimelineToExcel(plan: any, calendar: any) {
  const wb = XLSX.utils.book_new();

  const allSprints: any[] = (calendar?.sprints ?? []).sort((a: any, b: any) => a.number - b.number);
  const hasTemplate = !!calendar?.codeFreezeOffset;
  const planMilestones: any[] = [...(plan?.milestones ?? [])].sort(
    (a: any, b: any) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime(),
  );

  // Always export all sprints from the selected calendar — phase labels tell the release story
  const sprints = allSprints;

  const rows: any[][] = hasTemplate
    ? [['Sprint', 'Phase', 'Start Date', 'End Date', 'Days', 'Notes']]
    : [['#', 'Type', 'Name', 'Start Date', 'End Date', 'Phase / Notes']];

  if (hasTemplate) {
    sprints.forEach((s: any) => {
      const { phases } = computeSprintPhases(s, calendar);
      phases.forEach((ph) => {
        const days = Math.round((ph.end.getTime() - ph.start.getTime()) / 86_400_000) + 1;
        rows.push([
          s.name,
          ph.label,
          ph.start.toLocaleDateString('en-CA'),
          ph.isMilestone && ph.label !== 'Go Live' ? '' : ph.end.toLocaleDateString('en-CA'),
          ph.isMilestone ? '' : days,
          ph.isMilestone ? '★ milestone' : '',
        ]);
      });
      rows.push([]);
    });
  } else {
    let row = 1;
    sprints.forEach((s: any) => {
      const sprintEnd = new Date(s.endDate).getTime();
      const cf  = planMilestones.find((m: any) => m.type === 'CODE_FREEZE');
      const rs  = planMilestones.find((m: any) => m.type === 'REGRESSION_START');
      const re  = planMilestones.find((m: any) => m.type === 'REGRESSION_END');
      let phase = 'Development';
      if (cf && sprintEnd >= new Date(cf.plannedDate).getTime())  phase = 'Post Code-Freeze';
      if (rs && sprintEnd >= new Date(rs.plannedDate).getTime())  phase = 'Regression';
      if (re && sprintEnd >= new Date(re.plannedDate).getTime())  phase = 'Stabilisation';
      rows.push([row++, 'Sprint', s.name, new Date(s.startDate).toLocaleDateString('en-CA'), new Date(s.endDate).toLocaleDateString('en-CA'), phase]);
    });
    planMilestones.forEach((m: any) => {
      const cfg = MS_CONFIG[m.type];
      rows.push([row++, 'Milestone', cfg?.label ?? m.type, new Date(m.plannedDate).toLocaleDateString('en-CA'), '', m.notes ?? '']);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = hasTemplate
    ? [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 16 }]
    : [{ wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
  const planName = hasTemplate
    ? calendar.name.slice(0, 31)
    : `${plan?.version ?? 'Timeline'} — ${plan?.name ?? ''}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, planName);

  // Second sheet: week-column Gantt view (always uses full calendar, not filtered sprints)
  addGanttSheet(wb, allSprints, hasTemplate ? [] : planMilestones, calendar);

  XLSX.writeFile(wb, `release-timeline-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Integrated Timeline Component ─────────────────────────────────────────────
function IntegratedTimeline({ plans, calendars }: { plans: any[]; calendars: any[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [calId,  setCalId]  = useState(calendars[0]?.id ?? '');

  const plan     = plans.find((p: any) => p.id === planId);
  const calendar = calendars.find((c: any) => c.id === calId);
  const sprints: any[]    = (calendar?.sprints ?? []).sort((a: any, b: any) => a.number - b.number);
  const milestones: any[] = (plan?.milestones ?? []).sort(
    (a: any, b: any) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime(),
  );

  const hasTemplate = !!calendar?.codeFreezeOffset;

  if (!plans.length || !calendars.length) {
    return (
      <EmptyState
        icon={<TimelineIcon sx={{ fontSize: 56 }} />}
        title="Nothing to show yet"
        description="Create at least one Release Plan (with milestones) and one Sprint Calendar to see the integrated timeline."
      />
    );
  }

  // ── Phase Template mode: segmented bars ──────────────────────────────────
  const PHASE_COLORS: Record<string, string> = {
    Development: '#1976d2',
    'Code Freeze': '#e53935',
    Regression: '#fb8c00',
    'Go/No-Go': '#8e24aa',
    'Go Live': '#1e88e5',
  };

  // Build one custom-series data point per sprint with pre-computed phase segments
  const templateSeriesData = sprints.map((s: any, i: number) => {
    const { phases } = computeSprintPhases(s, calendar);
    return {
      value: [i, new Date(s.startDate).getTime(), new Date(s.endDate).getTime(), s.name, phases],
    };
  });

  const yLabels = sprints.map((s: any) => s.name);

  // ── Milestone-plan mode: single-color bars ────────────────────────────────
  const codeFreezeDate = milestones.find((m: any) => m.type === 'CODE_FREEZE')?.plannedDate;
  const regStartDate   = milestones.find((m: any) => m.type === 'REGRESSION_START')?.plannedDate;
  const regEndDate     = milestones.find((m: any) => m.type === 'REGRESSION_END')?.plannedDate;

  const sprintColor = (s: any) => {
    const end = new Date(s.endDate).getTime();
    if (regEndDate   && end >= new Date(regEndDate).getTime())   return '#8e24aa';
    if (regStartDate && end >= new Date(regStartDate).getTime()) return '#fb8c00';
    if (codeFreezeDate && end >= new Date(codeFreezeDate).getTime()) return '#e53935';
    return '#1976d2';
  };

  const height = Math.max(300, sprints.length * 34 + 120);

  const option: any = hasTemplate
    ? {
        tooltip: {
          trigger: 'item',
          formatter: (p: any) => {
            const phases: any[] = p.data?.value?.[4] ?? [];
            if (!phases.length) return p.data?.value?.[3] ?? '';
            const sprintName = p.data?.value?.[3];
            return [
              `<b>${sprintName}</b>`,
              ...phases.map((ph: any) => `<span style="color:${ph.color}">■</span> ${ph.label}: ${ph.start.toLocaleDateString()} → ${ph.end.toLocaleDateString()}`),
            ].join('<br/>');
          },
        },
        grid: { left: 110, right: 20, top: 30, bottom: 40 },
        xAxis: { type: 'time', axisLabel: { formatter: '{dd} {MMM}' } },
        yAxis: { type: 'category', data: yLabels, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: 'custom',
            renderItem: (_: any, api: any) => {
              const idx    = api.value(0);
              const phases: any[] = api.value(4) as any[];
              const height_ = api.size([0, 1])[1] * 0.6;
              const children = (phases ?? []).map((ph: any) => {
                const x1 = api.coord([ph.start.getTime(), idx]);
                const x2 = api.coord([ph.end.getTime(), idx]);
                const w  = Math.max(ph.isMilestone ? 4 : 2, x2[0] - x1[0]);
                return {
                  type: 'rect',
                  shape: { x: x1[0], y: x1[1] - height_ / 2, width: w, height: height_ },
                  style: { fill: ph.color, opacity: ph.isMilestone ? 1 : 0.82, stroke: ph.isMilestone ? ph.color : undefined, lineWidth: ph.isMilestone ? 2 : 0 },
                };
              });
              return { type: 'group', children };
            },
            encode: { x: [1, 2], y: 0 },
            data: templateSeriesData,
          },
        ],
      }
    : {
        tooltip: {
          trigger: 'item',
          formatter: (p: any) => {
            const d = p.data;
            if (d?.ms) {
              const cfg = MS_CONFIG[d.ms.type];
              return `<b>${cfg?.label ?? d.ms.type}</b><br/>${new Date(d.ms.plannedDate).toLocaleDateString()}`;
            }
            return `<b>${d?.value?.[3] ?? ''}</b><br/>${new Date(d?.value?.[1]).toLocaleDateString()} → ${new Date(d?.value?.[2]).toLocaleDateString()}`;
          },
        },
        legend: { data: ['Development', 'Post Code-Freeze', 'Regression', 'Stabilisation'], top: 0, type: 'scroll' },
        grid: { left: 110, right: 30, top: 50, bottom: 40 },
        xAxis: { type: 'time', axisLabel: { formatter: '{dd} {MMM}' } },
        yAxis: { type: 'category', data: yLabels, axisLabel: { fontSize: 11 } },
        series: [
          {
            name: 'Sprints',
            type: 'custom',
            renderItem: (_: any, api: any) => {
              const start  = api.coord([api.value(1), api.value(0)]);
              const end    = api.coord([api.value(2), api.value(0)]);
              const height_ = api.size([0, 1])[1] * 0.55;
              return {
                type: 'rect',
                shape: { x: start[0], y: start[1] - height_ / 2, width: Math.max(1, end[0] - start[0]), height: height_ },
                style: api.style(),
                emphasis: { style: { opacity: 0.8 } },
              };
            },
            encode: { x: [1, 2], y: 0 },
            data: sprints.map((s: any, i: number) => ({
              value: [i, new Date(s.startDate).getTime(), new Date(s.endDate).getTime(), s.name],
              itemStyle: { color: sprintColor(s), opacity: 0.85 },
            })),
          },
          ...Object.entries(MS_CONFIG).map(([type, cfg]) => ({
            name: cfg.label,
            type: 'scatter',
            symbol: cfg.symbol,
            symbolSize: 14,
            itemStyle: { color: cfg.color },
            data: milestones
              .filter((m: any) => m.type === type)
              .map((m: any) => ({ value: [new Date(m.plannedDate).getTime(), yLabels.length - 0.5], ms: m })),
            markLine: {
              silent: false,
              lineStyle: { color: cfg.color, type: 'dashed', width: 1.5, opacity: 0.7 },
              data: milestones
                .filter((m: any) => m.type === type)
                .filter((m: any) => !isNaN(new Date(m.plannedDate).getTime()))
                .map((m: any) => ({ xAxis: new Date(m.plannedDate).getTime() })),
              symbol: 'none',
              label: { show: true, position: 'insideStartTop', formatter: cfg.label, fontSize: 10, color: cfg.color },
            },
          })),
        ],
      };

  return (
    <Box>
      {/* Selectors */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2} flexWrap="wrap" alignItems={{ xs: 'stretch', sm: 'center' }}>
        {!hasTemplate && (
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel>Release Plan</InputLabel>
            <Select label="Release Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>{p.version} — {p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
          <InputLabel>Sprint Calendar</InputLabel>
          <Select label="Sprint Calendar" value={calId} onChange={(e) => setCalId(e.target.value)}>
            {calendars.map((c: any) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}{c.codeFreezeOffset ? ' ⚡ Phase Template' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={() => exportTimelineToExcel(plan, calendar)}
          disabled={!calendar}
        >
          Export Excel
        </Button>
        {hasTemplate && (
          <Chip size="small" label="Repeating Phase Template active" color="primary" variant="outlined" />
        )}
      </Stack>

      {/* Legend */}
      {hasTemplate ? (
        <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
          {Object.entries(PHASE_COLORS).map(([label, color]) => (
            <Chip key={label} size="small" label={label} sx={{ bgcolor: color + '22', color, border: `1px solid ${color}` }} />
          ))}
        </Stack>
      ) : (
        <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
          {[['#1976d2','Development'],['#e53935','Post Code-Freeze'],['#fb8c00','Regression'],['#8e24aa','Stabilisation']].map(([color, label]) => (
            <Chip key={label} size="small" label={label} sx={{ bgcolor: color + '22', color, border: `1px solid ${color}` }} />
          ))}
          {milestones.length === 0 && (
            <Typography variant="caption" color="text.secondary">No milestones on this plan — add them via New Release Plan dialog.</Typography>
          )}
        </Stack>
      )}

      {/* Per-sprint phase table */}
      {hasTemplate && sprints.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2, overflow: 'auto', maxHeight: 340 }}>
          <Stack direction="row" sx={{ bgcolor: 'grey.50', px: 2, py: 1, position: 'sticky', top: 0 }}>
            <Typography variant="caption" fontWeight={700} sx={{ width: 80 }}>Sprint</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Phase</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 110 }}>Start</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 110 }}>End</Typography>
          </Stack>
          <Divider />
          {sprints.map((s: any) => {
            const { phases } = computeSprintPhases(s, calendar);
            return phases.map((ph, pi) => (
              <Stack
                key={`${s.id}-${pi}`}
                direction="row"
                sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
                alignItems="center"
              >
                <Typography variant="caption" sx={{ width: 80, fontWeight: pi === 0 ? 700 : 400, color: pi === 0 ? 'text.primary' : 'text.secondary' }}>
                  {pi === 0 ? s.name : ''}
                </Typography>
                <Stack direction="row" gap={1} alignItems="center" flex={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ph.color, flexShrink: 0 }} />
                  <Typography variant="caption">{ph.label}{ph.isMilestone ? ' ★' : ''}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ width: 110 }}>{ph.start.toLocaleDateString()}</Typography>
                <Typography variant="caption" sx={{ width: 110 }} color="text.secondary">
                  {ph.isMilestone && ph.label !== 'Go Live' ? '—' : ph.end.toLocaleDateString()}
                </Typography>
              </Stack>
            ));
          })}
        </Paper>
      )}

      {/* Milestone table (non-template mode) */}
      {!hasTemplate && milestones.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ bgcolor: 'grey.50', px: 2, py: 1 }}>
            <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Milestone</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 120 }}>Date</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ width: 100 }}>Sprint</Typography>
          </Stack>
          <Divider />
          {milestones.map((m: any) => {
            const cfg = MS_CONFIG[m.type];
            const mDate = new Date(m.plannedDate);
            // Compare at UTC day boundaries to avoid timezone drift
            const mDay = Date.UTC(mDate.getUTCFullYear(), mDate.getUTCMonth(), mDate.getUTCDate());
            const toUTCDay = (d: string) => { const dt = new Date(d); return Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()); };
            const sprint = sprints.find((s: any) => mDay >= toUTCDay(s.startDate) && mDay <= toUTCDay(s.endDate))
              // Fallback: last sprint that ended before the milestone (milestone is post-sprint)
              ?? [...sprints].reverse().find((s: any) => mDay > toUTCDay(s.endDate));
            return (
              <Stack key={m.id} direction="row" sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }} alignItems="center">
                <Stack direction="row" gap={1} alignItems="center" flex={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg?.color ?? '#999', flexShrink: 0 }} />
                  <Typography variant="body2">{cfg?.label ?? m.type}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ width: 120 }}>{mDate.toLocaleDateString()}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 100 }}>
                  {sprint ? sprint.name : '—'}
                </Typography>
              </Stack>
            );
          })}
        </Paper>
      )}

      {/* Gantt */}
      {sprints.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 1 }}>
          <ReactECharts option={option} style={{ height }} />
        </Paper>
      ) : (
        <EmptyState title="No sprints in this calendar" description="Add a Sprint Calendar with sprints to see the Gantt." />
      )}
    </Box>
  );
}

export function ReleaseCadencePage() {
  const [tab, setTab] = useState<TabId>('releases');
  const [createPlan, setCreatePlan] = useState(false);
  const [createCalendar, setCreateCalendar] = useState(false);
  const [createMilestone, setCreateMilestone] = useState(false);
  const { activeProject } = useProject();
  const { data: plans, isLoading: plansLoading, error: plansError } = useReleasePlans(activeProject ? { projectId: activeProject.id } : undefined);
  const { data: calendars, isLoading: calendarsLoading } = useSprintCalendars(activeProject?.id);

  if (plansLoading && tab === 'releases') return <LoadingSpinner />;
  if (calendarsLoading && tab === 'sprints') return <LoadingSpinner />;

  const createButton = tab === 'releases'
    ? <Button variant="contained" startIcon={<Add />} onClick={() => setCreatePlan(true)}>New Release Plan</Button>
    : tab === 'sprints'
    ? <Button variant="contained" startIcon={<Add />} onClick={() => setCreateCalendar(true)}>New Sprint Calendar</Button>
    : tab === 'milestones'
    ? <Button variant="contained" startIcon={<Add />} onClick={() => setCreateMilestone(true)}>New Milestone</Button>
    : null;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={3} gap={1}>
        <Typography variant="h4" fontWeight={700}>Release Cadence</Typography>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip icon={<RocketLaunch />} label={`${plans?.length ?? 0} Release Plans`} color="primary" variant="outlined" />
          {createButton}
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: { xs: 0, sm: 2 } }} variant="scrollable" scrollButtons="auto">
          <Tab value="releases" label="Release Plans" icon={<RocketLaunch />} iconPosition="start" />
          <Tab value="sprints" label="Sprint Calendars" icon={<CalendarMonth />} iconPosition="start" />
          <Tab value="milestones" label="Milestones" icon={<Flag />} iconPosition="start" />
          <Tab value="timeline" label="Integrated Timeline" icon={<TimelineIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 'releases' && (
        <>
          {plansError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load release plans</Alert>}
          <ReleasesTab plans={plans ?? []} onNewPlan={() => setCreatePlan(true)} projectId={activeProject?.id} />
        </>
      )}

      {tab === 'sprints' && (
        <SprintsTab calendars={calendars ?? []} onNewCalendar={() => setCreateCalendar(true)} />
      )}

      {tab === 'milestones' && <MilestonesTab plans={plans ?? []} />}

      {tab === 'timeline' && (
        <IntegratedTimeline plans={plans ?? []} calendars={calendars ?? []} />
      )}

      <CreateReleasePlanDialog open={createPlan} onClose={() => setCreatePlan(false)} projectId={activeProject?.id} />
      <CreateSprintCalendarDialog open={createCalendar} onClose={() => setCreateCalendar(false)} projectId={activeProject?.id} />
      <CreateMilestoneDialog open={createMilestone} onClose={() => setCreateMilestone(false)} plans={plans ?? []} />
    </Box>
  );
}

