import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, Alert, Stack, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, InputLabel, FormControl, ToggleButton, ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import { Assessment, Speed, Category, Add } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { useVelocityTrend, useWorkTypeBreakdown, useMetricDefs, useCreateProductivityRecord } from './useProductivity';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useProject } from '../../context/ProjectContext';
import { useSprintCalendars } from '../release-cadence/useReleaseCadence';
import { useSprintCalendarDetail } from '../roadmap/useFeatures';

const WORK_TYPE_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0288d1'];
const WORK_TYPES = ['FEATURE', 'BUG_FIX', 'TECH_DEBT', 'DOCUMENTATION', 'TESTING', 'INFRASTRUCTURE', 'OTHER'];

// ── Period types ──────────────────────────────────────────────────────────────

type PeriodType = 'sprint' | 'week' | 'month' | 'quarter' | 'date';

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  sprint: 'Sprint',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  date: 'Custom Date',
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
const QUARTER_START_MONTH: Record<string, number> = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 };

/** Convert the period-type-specific value to an ISO date string for the backend. */
function toISOPeriod(type: PeriodType, value: string, sprintStartDate?: string): string {
  if (type === 'sprint') {
    return sprintStartDate ? new Date(sprintStartDate).toISOString() : '';
  }
  if (!value) return '';
  switch (type) {
    case 'week': {
      // value = "2026-W17"
      const [yearStr, weekStr] = value.split('-W');
      const year = parseInt(yearStr, 10);
      const week = parseInt(weekStr, 10);
      // ISO week 1 is the week containing the first Thursday
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7; // Mon=1 … Sun=7
      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
      return monday.toISOString();
    }
    case 'month':
      return new Date(`${value}-01`).toISOString();
    case 'quarter': {
      // value = "2026-Q2"
      const [y, q] = value.split('-');
      const month = QUARTER_START_MONTH[q] ?? 0;
      return new Date(parseInt(y, 10), month, 1).toISOString();
    }
    case 'date':
      return new Date(value).toISOString();
    default:
      return '';
  }
}

// ── Period picker sub-component ───────────────────────────────────────────────

function PeriodPicker({
  type,
  value,
  onChange,
  onSprintChange,
  sprintId,
  projectId,
}: {
  type: PeriodType;
  value: string;
  onChange: (v: string) => void;
  onSprintChange: (sprintId: string, startDate: string) => void;
  sprintId: string;
  projectId?: string;
}) {
  const { data: calendars = [], isLoading: loadingCalendars } = useSprintCalendars(projectId);

  // For sprint picker: calendar selector state
  const [calendarId, setCalendarId] = useState('');
  const { data: calendarDetail, isLoading: loadingSprints } = useSprintCalendarDetail(
    type === 'sprint' ? calendarId || undefined : undefined,
  );
  const sprints = calendarDetail?.sprints ?? [];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (type === 'sprint') {
    return (
      <Stack gap={1.5}>
        <FormControl fullWidth size="small">
          <InputLabel>Sprint Calendar</InputLabel>
          <Select
            label="Sprint Calendar"
            value={calendarId}
            onChange={(e) => { setCalendarId(e.target.value); onChange(''); }}
            disabled={loadingCalendars}
          >
            <MenuItem value=""><em>Select calendar…</em></MenuItem>
            {(calendars as any[]).map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" disabled={!calendarId || loadingSprints}>
          <InputLabel>Sprint</InputLabel>
          <Select
            label="Sprint"
            value={sprintId}
            onChange={(e) => {
              const selected = sprints.find((s) => s.id === e.target.value);
              if (selected) onSprintChange(selected.id, selected.startDate);
            }}
          >
            <MenuItem value=""><em>{loadingSprints ? 'Loading…' : 'Select sprint…'}</em></MenuItem>
            {sprints.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                S-{s.number} — {s.name} ({new Date(s.startDate).toLocaleDateString()})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    );
  }

  if (type === 'week') {
    return (
      <TextField
        label="Week"
        type="week"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        size="small"
        InputLabelProps={{ shrink: true }}
        helperText="Select the week this record covers"
      />
    );
  }

  if (type === 'month') {
    return (
      <TextField
        label="Month"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        size="small"
        InputLabelProps={{ shrink: true }}
        helperText="Select the month this record covers"
      />
    );
  }

  if (type === 'quarter') {
    // value format: "2026-Q2"
    const [yearPart, qPart] = value ? value.split('-') : ['', ''];
    return (
      <Stack direction="row" gap={1.5}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            label="Quarter"
            value={qPart || ''}
            onChange={(e) => onChange(`${yearPart || currentYear}-${e.target.value}`)}
          >
            {QUARTERS.map((q) => <MenuItem key={q} value={q}>{q}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Year</InputLabel>
          <Select
            label="Year"
            value={yearPart || String(currentYear)}
            onChange={(e) => onChange(`${e.target.value}-${qPart || 'Q1'}`)}
          >
            {years.map((y) => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
    );
  }

  // Custom date
  return (
    <TextField
      label="Date"
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      InputLabelProps={{ shrink: true }}
      helperText="Pick a specific date"
    />
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

function CreateRecordDialog({
  open,
  onClose,
  metricDefs,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  metricDefs: any[];
  projectId?: string;
}) {
  const mutation = useCreateProductivityRecord();
  const [form, setForm] = useState({ metricDefId: '', planned: '', actual: '', workType: '' });
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [periodValue, setPeriodValue] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handlePeriodTypeChange(newType: PeriodType) {
    setPeriodType(newType);
    setPeriodValue('');
    setSprintId('');
    setSprintStartDate('');
  }

  function hasPeriodValue() {
    if (periodType === 'sprint') return !!sprintId;
    return !!periodValue;
  }

  const handleSubmit = async () => {
    if (!form.metricDefId) { setError('Metric is required.'); return; }
    if (!hasPeriodValue()) { setError('Period is required.'); return; }
    if (!form.actual) { setError('Actual value is required.'); return; }

    const isoDate = toISOPeriod(periodType, periodValue, sprintStartDate);
    if (!isoDate) { setError('Could not determine a valid period date. Please check your input.'); return; }

    try {
      await mutation.mutateAsync({
        metricDefId: form.metricDefId,
        period: isoDate,
        ...(periodType === 'sprint' && sprintId ? { sprintId } : {}),
        planned: form.planned ? Number(form.planned) : undefined,
        actual: Number(form.actual),
        workType: form.workType || undefined,
        projectId,
      });
      setForm({ metricDefId: '', planned: '', actual: '', workType: '' });
      setPeriodValue('');
      setSprintId('');
      setSprintStartDate('');
      setError('');
      onClose();
    } catch {
      setError('Failed to create record. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log Productivity Record</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

        {/* Metric */}
        <FormControl fullWidth required size="small">
          <InputLabel>Metric</InputLabel>
          <Select label="Metric" value={form.metricDefId} onChange={(e) => set('metricDefId', e.target.value)}>
            {metricDefs.map((m: any) => (
              <MenuItem key={m.id} value={m.id}>{m.name} ({m.unit})</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Period type toggle */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
            Period Type
          </Typography>
          <ToggleButtonGroup
            value={periodType}
            exclusive
            onChange={(_, v) => { if (v) handlePeriodTypeChange(v as PeriodType); }}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {(Object.keys(PERIOD_TYPE_LABELS) as PeriodType[]).map((t) => (
              <ToggleButton key={t} value={t} sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
                {PERIOD_TYPE_LABELS[t]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Period value — changes based on type */}
        <PeriodPicker
          type={periodType}
          value={periodValue}
          onChange={setPeriodValue}
          sprintId={sprintId}
          projectId={projectId}
          onSprintChange={(id, startDate) => {
            setSprintId(id);
            setSprintStartDate(startDate);
          }}
        />

        {/* Planned / Actual */}
        <Stack direction="row" gap={1.5}>
          <TextField
            label="Planned"
            type="number"
            value={form.planned}
            onChange={(e) => set('planned', e.target.value)}
            fullWidth
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Actual *"
            type="number"
            value={form.actual}
            onChange={(e) => set('actual', e.target.value)}
            required
            fullWidth
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Stack>

        {/* Work Type */}
        <FormControl fullWidth size="small">
          <InputLabel>Work Type</InputLabel>
          <Select label="Work Type" value={form.workType} onChange={(e) => set('workType', e.target.value)}>
            <MenuItem value=""><em>None</em></MenuItem>
            {WORK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {mutation.isPending ? 'Saving…' : 'Save Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function VelocityChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <EmptyState title="No velocity data" description="Log productivity records linked to sprints to see trends" />;
  }
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Planned', 'Actual'] },
    grid: { left: 40, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.sprint?.name ?? `Sprint ${d.sprint?.number}`),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Planned',
        type: 'bar',
        data: data.map((d) => d.planned),
        itemStyle: { color: '#90caf9' },
      },
      {
        name: 'Actual',
        type: 'bar',
        data: data.map((d) => d.actual),
        itemStyle: { color: '#1976d2' },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260 }} />;
}

function WorkTypeChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <EmptyState title="No work-type data" description="Tag productivity records with a work type to see breakdown" />;
  }
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: data.map((d, i) => ({
          name: d.workType ?? 'Unknown',
          value: d.totalActual,
          itemStyle: { color: WORK_TYPE_COLORS[i % WORK_TYPE_COLORS.length] },
        })),
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260 }} />;
}

export function ProductivityPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { activeProject } = useProject();
  const { data: velocity, isLoading: velLoading, error: velError } = useVelocityTrend(activeProject ? { projectId: activeProject.id } : undefined);
  const { data: workType, isLoading: wtLoading, error: wtError } = useWorkTypeBreakdown(activeProject ? { projectId: activeProject.id } : undefined);
  const { data: metricDefs } = useMetricDefs();

  if (velLoading || wtLoading) return <LoadingSpinner />;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>Productivity Dashboard</Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip icon={<Assessment />} label={`${metricDefs?.length ?? 0} Metrics Tracked`} color="primary" variant="outlined" />
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Log Record</Button>
        </Stack>
      </Stack>

      {(velError || wtError) && (
        <Alert severity="error" sx={{ mb: 2 }}>Failed to load productivity data</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardHeader
              title="Velocity Trend"
              subheader="Planned vs Actual per sprint"
              avatar={<Speed color="primary" />}
            />
            <CardContent>
              <VelocityChart data={velocity ?? []} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardHeader
              title="Work Type Breakdown"
              subheader="Output distribution by category"
              avatar={<Category color="secondary" />}
            />
            <CardContent>
              <WorkTypeChart data={workType ?? []} />
            </CardContent>
          </Card>
        </Grid>

        {!velocity?.length && !workType?.length && (
          <Grid item xs={12}>
            <EmptyState
              icon={<Assessment sx={{ fontSize: 56 }} />}
              title="No productivity data yet"
              description="Log productivity records (story points, tickets, PR count, etc.) to see analytics here."
              action={{ label: 'Log First Record', onClick: () => setCreateOpen(true) }}
            />
          </Grid>
        )}
      </Grid>

      <CreateRecordDialog open={createOpen} onClose={() => setCreateOpen(false)} metricDefs={metricDefs ?? []} projectId={activeProject?.id} />
    </Box>
  );
}
