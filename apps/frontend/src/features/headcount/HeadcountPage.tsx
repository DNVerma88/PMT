import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader,
  Alert, Stack, Paper, Button, Switch, FormControlLabel, Divider, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
  Slider, useMediaQuery, useTheme,
} from '@mui/material';
import { Groups, TrendingUp, TrendingDown, PersonAdd, WorkOutline, Add, FileDownload, InfoOutlined, History, Schedule, OpenInFull, CloseFullscreen } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { useHeadcountSummary, useHeadcountWaterfall, useHeadcountTimeSeries, useCreateHeadcountRecord } from './useHeadcount';
import { useUpdateProject } from '../projects/useProjects';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useProject } from '../../context/ProjectContext';
import { ExportDialog } from '../exports/ExportsPage';

function CreateHeadcountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const mutation = useCreateHeadcountRecord();
  const [isProjection, setIsProjection] = useState(false);
  const [form, setForm] = useState({
    period: '',
    openingCount: '',
    closingCount: '',
    addedCount: '',
    removedCount: '',
    targetCount: '',   // maps to plannedCount
    notes: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Derived display values
  const activeNum  = isProjection ? Number(form.openingCount) || 0 : Number(form.closingCount) || 0;
  const targetNum  = Number(form.targetCount) || 0;
  const openPositions = Math.max(0, targetNum - activeNum);
  const reductionPlanned = targetNum > 0 && activeNum > targetNum ? activeNum - targetNum : 0;

  const handleClose = () => {
    setForm({ period: '', openingCount: '', closingCount: '', addedCount: '', removedCount: '', targetCount: '', notes: '' });
    setIsProjection(false);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.period || !form.openingCount) {
      setError('Period and opening headcount are required.');
      return;
    }
    if (!isProjection && !form.closingCount) {
      setError('Active headcount (period end) is required for historical records.');
      return;
    }
    try {
      const closing = isProjection ? Number(form.openingCount) : Number(form.closingCount);
      // Backend expects a full ISO date string; append -01 if user entered YYYY-MM
      const periodIso = /^\d{4}-\d{2}$/.test(form.period.trim())
        ? `${form.period.trim()}-01`
        : form.period.trim();
      await mutation.mutateAsync({
        period:       periodIso,
        openingCount: Number(form.openingCount),
        closingCount: closing,
        addedCount:   form.addedCount   ? Number(form.addedCount)   : undefined,
        removedCount: form.removedCount ? Number(form.removedCount) : undefined,
        plannedCount: form.targetCount  ? Number(form.targetCount)  : undefined,
        notes:        form.notes || undefined,
      });
      handleClose();
    } catch {
      setError('Failed to save record. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{isProjection ? 'Add Future Staffing Projection' : 'Log Headcount Record'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormControlLabel
          control={
            <Switch
              checked={isProjection}
              onChange={(e) => setIsProjection(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Typography variant="body2" fontWeight={600}>Future Projection</Typography>
              <Tooltip title="Use this for upcoming months where headcount hasn't changed yet. Only Target is needed alongside Opening.">
                <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
              </Tooltip>
            </Stack>
          }
        />

        {isProjection && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Set the <b>Opening HC</b> (current headcount) and your <b>Target HC</b> for the upcoming month.
            The chart will display projected bars in a lighter shade.
          </Alert>
        )}

        <TextField
          label="Period (YYYY-MM, e.g. 2026-07)"
          value={form.period}
          onChange={(e) => set('period', e.target.value)}
          required
          fullWidth
          placeholder="2026-07"
        />

        <Divider />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>HEADCOUNT</Typography>

        <Stack direction="row" gap={2}>
          <TextField
            label="Opening HC"
            type="number"
            value={form.openingCount}
            onChange={(e) => set('openingCount', e.target.value)}
            required
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Headcount at start of month"
          />
          {!isProjection && (
            <TextField
              label="Active HC (period end)"
              type="number"
              value={form.closingCount}
              onChange={(e) => set('closingCount', e.target.value)}
              required
              fullWidth
              inputProps={{ min: 0 }}
              helperText="Actual headcount at month end"
            />
          )}
        </Stack>

        {!isProjection && (
          <Stack direction="row" gap={2}>
            <TextField
              label="Hires / Transfers In"
              type="number"
              value={form.addedCount}
              onChange={(e) => set('addedCount', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Exits / Transfers Out"
              type="number"
              value={form.removedCount}
              onChange={(e) => set('removedCount', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Stack>
        )}

        <Divider />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>TARGET</Typography>

        <TextField
          label="Target HC"
          type="number"
          value={form.targetCount}
          onChange={(e) => set('targetCount', e.target.value)}
          fullWidth
          inputProps={{ min: 0 }}
          helperText="Desired / planned headcount — shown as dashed target line"
        />

        {/* Derived insights */}
        {(form.openingCount || form.closingCount || form.targetCount) && (
          <Stack direction="row" gap={1} flexWrap="wrap">
            {openPositions > 0 && (
              <Chip size="small" label={`Open Positions: ${openPositions}`} color="warning" variant="outlined" />
            )}
            {reductionPlanned > 0 && (
              <Chip size="small" label={`Reduction Planned: −${reductionPlanned}`} color="error" variant="outlined" />
            )}
            {openPositions === 0 && reductionPlanned === 0 && targetNum > 0 && (
              <Chip size="small" label="At target" color="success" variant="outlined" />
            )}
          </Stack>
        )}

        <TextField
          label="Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          multiline
          rows={2}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isProjection ? 'Add Projection' : 'Save Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
      <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
    </Paper>
  );
}

// Helper: generate all YYYY-MM strings in [from, to] inclusive
function generateMonthRange(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ── Staffing Projection Chart (Active + Open + Reduction Planned + Target) ──────
const DEFAULT_COLORS = {
  actual:    '#f57c00',
  projected: '#ffb74d',
  open:      '#9e9e9e',
  target:    '#1a237e',
  reduction: '#d32f2f',
};

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Tooltip title={label}>
      <Box
        component="label"
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
          border: '1px solid', borderColor: 'divider', borderRadius: 1,
          px: 0.75, py: 0.4, bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{ width: 18, height: 18, borderRadius: '3px', bgcolor: value, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }}
        />
        <Typography variant="caption" noWrap sx={{ fontSize: 10, color: 'text.secondary', maxWidth: 60 }}>{label}</Typography>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
      </Box>
    </Tooltip>
  );
}

function StaffingProjectionChart({
  data, periodFrom, periodTo, colors, height,
}: {
  data: any[]; periodFrom: string; periodTo: string;
  colors: typeof DEFAULT_COLORS; height: number;
}) {
  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Build a complete month list covering the full range
  const fromYM = periodFrom.slice(0, 7);
  const toYM   = periodTo.slice(0, 7);
  const allMonths = generateMonthRange(fromYM, toYM);

  const dataByYM = new Map((data ?? []).map((d: any) => [new Date(d.period).toISOString().slice(0, 7), d]));

  // Find first record so we can back-fill months before it
  const sortedRecords = [...(data ?? [])].sort(
    (a: any, b: any) => new Date(a.period).getTime() - new Date(b.period).getTime()
  );
  const firstRecord = sortedRecords[0];
  const firstYM      = firstRecord ? new Date(firstRecord.period).toISOString().slice(0, 7) : null;
  const firstClosing = firstRecord ? (firstRecord.opening || firstRecord.closing || 0) : 0;
  const firstPlanned = firstRecord?.planned ?? 0;

  // Forward-fill: carry last known closing into months after the last record.
  // Back-fill: use first record's opening for months before the first record.
  let lastClosing = 0;
  let lastPlanned = 0;
  const filledData = allMonths.map((ym) => {
    const record = dataByYM.get(ym);
    if (record) {
      if (record.closing > 0) lastClosing = record.closing;
      if (record.planned > 0) lastPlanned = record.planned;
      return { ...record, _carried: false };
    }
    // Month is before the first record — back-fill with first record's opening
    if (firstYM && ym < firstYM) {
      return {
        period: `${ym}-01`,
        opening: firstClosing, closing: firstClosing,
        added: 0, removed: 0, planned: firstPlanned,
        _carried: true,
      };
    }
    // Month is after the last record — forward-fill with last known closing
    return {
      period: `${ym}-01`,
      opening: lastClosing, closing: lastClosing,
      added: 0, removed: 0, planned: lastPlanned,
      _carried: true,
    };
  });

  if (!filledData.length) {
    return <EmptyState title="No staffing data" description="Log headcount records to see the staffing projection chart" />;
  }

  const fmtPeriod = (d: any) =>
    new Date(d.period).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

  const periods = filledData.map(fmtPeriod);

  // Per-bar values
  const activeItems = filledData.map((d: any) => {
    const ym = new Date(d.period).toISOString().slice(0, 7);
    const isFuture = ym > currentYM;
    // Carried-forward future months: lighter shade; actual data: solid orange
    const isLight = isFuture || d._carried;
    return {
      value: d.closing,
      itemStyle: { color: isLight ? colors.projected : colors.actual },
    };
  });

  const openItems = filledData.map((d: any) => {
    // Only show open positions when there's a real target set
    const active = d.closing;
    const open = d._carried ? 0 : Math.max(0, (d.planned || 0) - active);
    return { value: open, itemStyle: { color: colors.open } };
  });

  // Target dashed line — only for months that have an actual or carried planned target
  const targetItems = filledData.map((d: any) => (d.planned > 0 ? d.planned : null));

  // Reduction planned line
  const reductionItems = filledData.map((d: any) => {
    if (d._carried) return null;
    const planned = d.planned || 0;
    return planned > 0 && d.opening > planned ? d.opening - planned : null;
  });

  // Whether any future / carried months exist
  const hasProjections = filledData.some((d: any) => {
    const ym = new Date(d.period).toISOString().slice(0, 7);
    return ym > currentYM || d._carried;
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        if (!params?.length) return '';
        const idx = params[0]?.dataIndex;
        const d = filledData[idx] as any;
        if (!d) return '';
        const ym = new Date(d.period).toISOString().slice(0, 7);
        const isFuture = ym > currentYM;
        const label = d._carried
          ? ' <span style="color:#f57c00;font-style:italic">(carried forward)</span>'
          : isFuture ? ' <span style="color:#f57c00;font-style:italic">(projected)</span>' : '';
        const active = activeItems[idx].value;
        const open   = openItems[idx].value;
        const target = d.planned || 0;
        const reduc  = reductionItems[idx];
        let html = `<b>${params[0].axisValue}</b>${label}<br/>`;
        html += `<span style="color:${colors.actual}">&#9632;</span> Active: <b>${active}</b><br/>`;
        if (open > 0) html += `<span style="color:${colors.open}">&#9632;</span> Open Positions: <b>+${open}</b><br/>`;
        if (target > 0) html += `<span style="color:${colors.target}">&#9670;</span> Target: <b>${target}</b><br/>`;
        if (reduc) html += `<span style="color:${colors.reduction}">&#9679;</span> Reduction Planned: <b>-${reduc}</b><br/>`;
        return html;
      },
    },
    legend: {
      data: ['Active', 'Open', 'Reduction Planned', 'Target'],
      bottom: 0,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 50, right: 30, top: 30, bottom: 56 },
    xAxis: { type: 'category', data: periods, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'Active',
        type: 'bar',
        stack: 'hc',
        data: activeItems,
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'inside',
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          formatter: (p: any) => (p.value > 0 ? `${p.value}` : ''),
        },
        z: 3,
      },
      {
        name: 'Open',
        type: 'bar',
        stack: 'hc',
        data: openItems,
        barMaxWidth: 60,
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          fontWeight: 600,
          color: '#616161',
          formatter: (p: any) => (p.value > 0 ? `${p.value}` : ''),
        },
        z: 3,
      },
      {
        name: 'Reduction Planned',
        type: 'line',
        data: reductionItems,
        itemStyle: { color: colors.reduction },
        lineStyle: { color: colors.reduction, width: 2 },
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        z: 5,
      },
      {
        name: 'Target',
        type: 'line',
        data: targetItems,
        itemStyle: { color: colors.target },
        lineStyle: { color: colors.target, width: 2.5, type: 'dashed' },
        symbol: 'diamond',
        symbolSize: 9,
        connectNulls: true,
        z: 5,
      },
    ],
  };

  return (
    <Box>
      {hasProjections && (
        <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap" alignItems="center">
          <Box sx={{ width: 14, height: 14, bgcolor: colors.actual, borderRadius: 0.5, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">Solid = Actual</Typography>
          <Box sx={{ width: 14, height: 14, bgcolor: colors.projected, borderRadius: 0.5, flexShrink: 0, ml: 1 }} />
          <Typography variant="caption" color="text.secondary">Light = Projected (future)</Typography>
        </Stack>
      )}
      <ReactECharts option={option} style={{ height }} />
    </Box>
  );
}

function WaterfallChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <EmptyState title="No waterfall data" description="Log headcount records to see net change over time" />;
  }

  const periods = data.map((d) => new Date(d.period).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }));

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Hires', 'Exits', 'Net Headcount'], bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
    grid: { left: 50, right: 20, top: 20, bottom: 56 },
    xAxis: { type: 'category', data: periods, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'Hires',
        type: 'bar',
        stack: 'change',
        data: data.map((d) => d.added),
        itemStyle: { color: '#4caf50' },
        barMaxWidth: 50,
      },
      {
        name: 'Exits',
        type: 'bar',
        stack: 'change',
        data: data.map((d) => -d.removed),
        itemStyle: { color: '#f44336' },
        barMaxWidth: 50,
      },
      {
        name: 'Net Headcount',
        type: 'line',
        data: data.map((d) => d.closing),
        itemStyle: { color: '#1976d2' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 240 }} />;
}

export function HeadcountPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { activeProject, updateActiveProject } = useProject();
  const updateProject = useUpdateProject();

  const [pastMonths,   setPastMonths]   = useState(() => activeProject?.headcountPastMonths   ?? 6);
  const [futureMonths, setFutureMonths] = useState(() => activeProject?.headcountFutureMonths ?? 3);
  const [chartHeight, setChartHeight]   = useState(340);
  const [chartWidth,  setChartWidth]    = useState(100); // percentage 20–100
  const [chartColors, setChartColors] = useState({ ...DEFAULT_COLORS });
  const setColor = (key: keyof typeof DEFAULT_COLORS) => (v: string) =>
    setChartColors((c) => ({ ...c, [key]: v || DEFAULT_COLORS[key] }));

  // Sync window values when the active project changes (e.g. switching projects)
  const prevProjectId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeProject?.id !== prevProjectId.current) {
      prevProjectId.current = activeProject?.id;
      setPastMonths(activeProject?.headcountPastMonths   ?? 6);
      setFutureMonths(activeProject?.headcountFutureMonths ?? 3);
    }
  }, [activeProject]);

  // Debounce-save changes to the DB (500 ms after user stops typing)
  // Also update the in-memory ProjectContext so navigating away and back retains the value.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSettings = (past: number, future: number) => {
    if (!activeProject?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const patch = { headcountPastMonths: past, headcountFutureMonths: future };
      // Optimistically update context immediately so remount reads correct value
      updateActiveProject(patch);
      updateProject.mutate({ id: activeProject.id, data: patch });
    }, 500);
  };

  const handlePastMonths = (v: number) => { setPastMonths(v); saveSettings(v, futureMonths); };
  const handleFutureMonths = (v: number) => { setFutureMonths(v); saveSettings(pastMonths, v); };

  // Compute API date range from controls
  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth() - pastMonths, 1);
  const toDate   = new Date(today.getFullYear(), today.getMonth() + futureMonths, 1);
  const periodFrom = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;
  const periodTo   = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: summary, isLoading: sumLoading, error: sumError } = useHeadcountSummary(activeProject?.id);
  const { data: waterfall, isLoading: wfLoading } = useHeadcountWaterfall({ periodFrom, periodTo, projectId: activeProject?.id });
  const { data: timeSeries } = useHeadcountTimeSeries({ periodFrom, periodTo, projectId: activeProject?.id });

  if (sumLoading || wfLoading) return <LoadingSpinner />;

  const hasData = (waterfall?.length ?? 0) > 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>Headcount &amp; Staffing</Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={() => setExportOpen(true)}>Export</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Log Record</Button>
        </Stack>
      </Stack>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} defaultReportType="headcount" projectId={activeProject?.id} />

      {sumError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load headcount data</Alert>}

      {/* Stat cards */}
      <Stack direction="row" gap={2} mb={3} flexWrap="wrap">
        <StatCard label="Total Headcount" value={summary?.total ?? 0} icon={<Groups />} color="#1976d2" />
        <StatCard label="Added This Period" value={summary?.added ?? 0} icon={<PersonAdd />} color="#388e3c" />
        <StatCard label="Removed This Period" value={summary?.removed ?? 0} icon={<TrendingDown />} color="#d32f2f" />
        <StatCard label="Open Roles" value={summary?.openRoles ?? 0} icon={<WorkOutline />} color="#f57c00" />
        <StatCard label="Target HC" value={summary?.planned ?? 0} icon={<TrendingUp />} color="#7b1fa2" />
      </Stack>

      {!hasData ? (
        <EmptyState
          icon={<Groups sx={{ fontSize: 56 }} />}
          title="No headcount records yet"
          description="Log monthly headcount records to track hiring, attrition, and staffing trends. Use &lsquo;Future Projection&rsquo; mode to plan upcoming months."
          action={{ label: 'Log First Record', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <Grid container spacing={3}>
          {/* Main projection chart */}
          <Grid item xs={12}>
            <Box sx={{ width: `${chartWidth}%`, transition: 'width 0.2s ease' }}>
            <Card variant="outlined">
              <CardHeader
                title="Staffing Projection"
                subheader="Active headcount vs open positions vs target — light bars show projected months"
              />
              <CardContent>
                {/* Toolbar — always inside the card so it stays visible when width changes */}
                <Stack direction="row" alignItems="center" gap={1.5} mb={1.5} flexWrap="wrap">
                  <TextField
                    label="Past months"
                    type="number"
                    size="small"
                    value={pastMonths}
                    onChange={(e) => handlePastMonths(Math.max(0, Math.min(36, Number(e.target.value) || 0)))}
                    inputProps={{ min: 0, max: 36 }}
                    sx={{ width: 120 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><History sx={{ fontSize: 16 }} /></InputAdornment> }}
                  />
                  <TextField
                    label="Future months"
                    type="number"
                    size="small"
                    value={futureMonths}
                    onChange={(e) => handleFutureMonths(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                    inputProps={{ min: 0, max: 24 }}
                    sx={{ width: 130 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Schedule sx={{ fontSize: 16 }} /></InputAdornment> }}
                  />
                  <Divider orientation="vertical" flexItem />
                  <ColorSwatch label="Actual"     value={chartColors.actual}     onChange={setColor('actual')} />
                  <ColorSwatch label="Projected"  value={chartColors.projected}  onChange={setColor('projected')} />
                  <ColorSwatch label="Open"       value={chartColors.open}       onChange={setColor('open')} />
                  <ColorSwatch label="Target"     value={chartColors.target}     onChange={setColor('target')} />
                  <ColorSwatch label="Reduction"  value={chartColors.reduction}  onChange={setColor('reduction')} />
                  <Divider orientation="vertical" flexItem />
                  {/* Height control */}
                  <Stack direction="row" alignItems="center" gap={0.75}>
                    <Tooltip title="Chart height"><Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>H</Typography></Tooltip>
                    <Slider
                      size="small"
                      min={200} max={700} step={20}
                      value={chartHeight}
                      onChange={(_, v) => setChartHeight(v as number)}
                      sx={{ width: 90 }}
                      aria-label="Chart height"
                    />
                    <Tooltip title={chartHeight <= 260 ? 'Expand height' : 'Compact height'}>
                      <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 0.75, py: 0.25 }}
                        onClick={() => setChartHeight((h) => h <= 260 ? 340 : 220)}>
                        {chartHeight <= 260 ? <OpenInFull sx={{ fontSize: 14 }} /> : <CloseFullscreen sx={{ fontSize: 14 }} />}
                      </Button>
                    </Tooltip>
                  </Stack>
                  {/* Width control */}
                  <Stack direction="row" alignItems="center" gap={0.75}>
                    <Tooltip title="Chart width (%)"><Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>W</Typography></Tooltip>
                    <Slider
                      size="small"
                      min={20} max={100} step={5}
                      value={chartWidth}
                      onChange={(_, v) => setChartWidth(v as number)}
                      sx={{ width: 90 }}
                      aria-label="Chart width"
                    />
                    <Tooltip title={chartWidth < 100 ? 'Full width' : 'Compact width'}>
                      <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 0.75, py: 0.25 }}
                        onClick={() => setChartWidth((w) => w < 100 ? 100 : 50)}>
                        {chartWidth < 100 ? <OpenInFull sx={{ fontSize: 14 }} /> : <CloseFullscreen sx={{ fontSize: 14 }} />}
                      </Button>
                    </Tooltip>
                  </Stack>
                </Stack>
                <StaffingProjectionChart data={timeSeries ?? []} periodFrom={periodFrom} periodTo={periodTo} colors={chartColors} height={chartHeight} />
              </CardContent>
            </Card>
            </Box>
          </Grid>

          {/* Waterfall below */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardHeader title="Hires vs Exits" subheader="Net headcount change by period" />
              <CardContent>
                <WaterfallChart data={waterfall ?? []} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <CreateHeadcountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
