import { useMemo } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Stack, Chip, Alert,
  LinearProgress, Divider, Tooltip,
} from '@mui/material';
import {
  AccountTree, Assessment, Groups, RocketLaunch, Flag, TrendingUp, Speed,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../auth/useAuth';
import { useDashboardSummary } from './useDashboard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useProject } from '../../context/ProjectContext';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9e9e9e', PLANNED: '#2196f3', IN_PROGRESS: '#ff9800',
  COMPLETED: '#4caf50', CANCELLED: '#757575', DELAYED: '#e91e63', AT_RISK: '#ff5722',
};

const MILESTONE_LABELS: Record<string, string> = {
  BACKLOG_GROOMING:    'Backlog Grooming',
  SPRINT_PLANNING:     'Sprint Planning',
  BACKLOG_READINESS:   'Backlog Readiness',
  DEVELOPMENT_START:   'Dev Start', DEVELOPMENT_END: 'Dev End',
  CODE_FREEZE:         'Code Freeze', REGRESSION_START: 'Reg Start',
  REGRESSION_END:      'Reg End', GO_NO_GO: 'Go/No-Go', PRODUCTION_LIVE: 'Prod Live',
  POST_RELEASE_REVIEW: 'Post-Release Review',
};

// ── Quick Nav Card ────────────────────────────────────────────────────────────
function QuickNavCard({ label, icon, description, to, color }: { label: string; icon: React.ReactNode; description: string; to: string; color: string }) {
  const navigate = useNavigate();
  return (
    <Card
      sx={{ height: '100%', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}
      onClick={() => navigate(to)}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
        <Box sx={{ color, bgcolor: color + '18', borderRadius: 1.5, p: 0.8, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color, to,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; to: string;
}) {
  const navigate = useNavigate();
  return (
    <Card
      sx={{ cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}
      onClick={() => navigate(to)}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
              {label.toUpperCase()}
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ color, lineHeight: 1.2, my: 0.5 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">{sub}</Typography>
            )}
          </Box>
          <Box sx={{
            bgcolor: color + '18', borderRadius: 2, p: 1.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Release Status Donut ──────────────────────────────────────────────────────
function ReleaseStatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { fontSize: 11 },
      itemWidth: 12,
      itemHeight: 12,
    },
    series: [{
      type: 'pie', radius: ['42%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: {
        label: { show: false },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
      },
      data: data.map((d) => ({
        name: d.status.replace(/_/g, ' '),
        value: d.count,
        itemStyle: { color: STATUS_COLOR[d.status] ?? '#607d8b' },
      })),
    }],
  };
  return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ── Productivity Chart (Planned vs Actual) ────────────────────────────────────
function ProductivityChart({ records }: { records: any[] }) {
  const labels = records.map((r) => {
    const d = new Date(r.period);
    return isNaN(d.getTime()) ? r.period : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const planned = records.map((r) => r.planned ?? 0);
  const actual  = records.map((r) => r.actual ?? 0);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) =>
        `${params[0].axisValueLabel}<br/>` +
        params.map((p: any) => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`).join('<br/>'),
    },
    legend: { data: ['Planned', 'Actual'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 36, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category', data: labels,
      axisLabel: { fontSize: 10, rotate: labels.length > 4 ? 30 : 0 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: 'Planned', type: 'bar', barMaxWidth: 28,
        itemStyle: { color: '#90CAF9', borderRadius: [3, 3, 0, 0] },
        data: planned,
      },
      {
        name: 'Actual', type: 'bar', barMaxWidth: 28,
        itemStyle: { color: '#388e3c', borderRadius: [3, 3, 0, 0] },
        data: actual,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ── Headcount Bar Chart ───────────────────────────────────────────────────────
function HeadcountChart({ hc }: { hc: { total: number; added: number; removed: number; openRoles: number } }) {
  const categories = ['Total Staff', 'Added', 'Removed', 'Open Roles'];
  const values     = [hc.total, hc.added, hc.removed, hc.openRoles];
  const colors     = ['#1976d2', '#43a047', '#e53935', '#ff9800'];

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 16, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar', barMaxWidth: 48,
      data: values.map((v, i) => ({
        value: v,
        itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] },
      })),
      label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ── Milestone Timeline Rows ───────────────────────────────────────────────────
function MilestoneTimeline({ milestones }: { milestones: any[] }) {
  const now = Date.now();
  const WINDOW_MS = 30 * 86_400_000;

  if (!milestones.length) {
    return <Typography variant="body2" color="text.secondary">No milestones due in the next 30 days.</Typography>;
  }

  return (
    <Stack gap={1.5}>
      {milestones.map((m: any) => {
        const dueMs   = new Date(m.plannedDate).getTime();
        const daysAgo = Math.ceil((dueMs - now) / 86_400_000);
        const pct     = Math.max(0, Math.min(100, ((WINDOW_MS - (dueMs - now)) / WINDOW_MS) * 100));
        const urgent  = daysAgo <= 7;

        return (
          <Box key={m.id}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.4}>
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                  {MILESTONE_LABELS[m.type] ?? m.type}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {m.releasePlan?.version} · {m.releasePlan?.project?.name ?? 'All projects'}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={0.8}>
                <Chip
                  label={daysAgo <= 0 ? 'Today' : `${daysAgo}d`}
                  size="small"
                  color={urgent ? 'error' : 'default'}
                  sx={{ fontWeight: 700, minWidth: 44 }}
                />
                <Chip label={m.status.replace(/_/g, ' ')} size="small" variant="outlined" />
              </Stack>
            </Stack>
            <Tooltip title={`${new Date(m.plannedDate).toLocaleDateString()} · ${daysAgo} days away`}>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={urgent ? 'error' : 'warning'}
                sx={{ height: 5, borderRadius: 3 }}
              />
            </Tooltip>
          </Box>
        );
      })}
    </Stack>
  );
}

// ── Milestone Type Donut ──────────────────────────────────────────────────────
const MILESTONE_COLORS: Record<string, string> = {
  BACKLOG_GROOMING:    '#00acc1', SPRINT_PLANNING: '#039be5',
  BACKLOG_READINESS:   '#00897b',
  DEVELOPMENT_START:   '#43a047', CODE_FREEZE: '#e53935',
  REGRESSION_START:    '#fb8c00', REGRESSION_END: '#f4511e',
  GO_NO_GO:            '#8e24aa', PRODUCTION_LIVE: '#1e88e5', DEVELOPMENT_END: '#00897b',
  POST_RELEASE_REVIEW: '#6d4c41',
};

function MilestoneTypeDonut({ milestones }: { milestones: any[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    milestones.forEach((m: any) => { map[m.type] = (map[m.type] ?? 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({
      name: MILESTONE_LABELS[type] ?? type, value: count,
      itemStyle: { color: MILESTONE_COLORS[type] ?? '#607d8b' },
    }));
  }, [milestones]);

  if (!counts.length) return null;

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      confine: true,
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { fontSize: 11 },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 8,
    },
    series: [{
      type: 'pie', radius: ['35%', '58%'],
      center: ['50%', '38%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: {
        label: { show: false },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
      },
      labelLine: { show: false },
      data: counts,
    }],
  };
  return <ReactECharts option={option} style={{ height: 290 }} />;
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { data: summary, isLoading, error } = useDashboardSummary(activeProject?.id);

  if (isLoading) return <LoadingSpinner />;

  const activeReleases        = summary?.activeReleasesCount ?? 0;
  const upcomingMilestones    = summary?.upcomingMilestones ?? [];
  const headcount             = summary?.headcountSummary ?? { total: 0, added: 0, removed: 0, openRoles: 0 };
  const releasesByStatus      = summary?.releasesByStatus ?? [];
  const productivityRecords   = (summary?.latestProductivityRecords ?? []).slice().reverse();
  const totalReleases         = releasesByStatus.reduce((s: number, r: any) => s + r.count, 0);

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Welcome back, {user?.firstName ?? 'there'}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Portfolio snapshot · {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load dashboard summary</Alert>}

      {/* ── KPI Stats ── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Active Releases" value={activeReleases}
            sub={`${totalReleases} total`}
            icon={<RocketLaunch />} color="#9c27b0" to="/release-cadence"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Milestones Due" value={upcomingMilestones.length}
            sub="Next 30 days"
            icon={<Flag />} color="#f57c00" to="/release-cadence"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Headcount" value={headcount.total ?? 0}
            sub={headcount.openRoles ? `${headcount.openRoles} open roles` : 'No open roles'}
            icon={<Groups />} color="#1976d2" to="/headcount"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Productivity Logs" value={productivityRecords.length}
            sub="Recent records"
            icon={<Speed />} color="#388e3c" to="/productivity"
          />
        </Grid>
      </Grid>

      {/* ── Three Charts Row ── */}
      <Grid container spacing={2.5} mb={2.5}>
        {/* Release Status Donut */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <RocketLaunch sx={{ color: '#9c27b0', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Release Status</Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              {releasesByStatus.length === 0 ? (
                <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No release data yet</Typography>
                </Box>
              ) : (
                <ReleaseStatusDonut data={releasesByStatus} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Productivity Planned vs Actual */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Assessment sx={{ color: '#388e3c', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Productivity · Planned vs Actual</Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              {productivityRecords.length === 0 ? (
                <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No productivity records yet</Typography>
                </Box>
              ) : (
                <ProductivityChart records={productivityRecords} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Headcount Chart */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Groups sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Headcount Overview</Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              {headcount.total === 0 && headcount.added === 0 ? (
                <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No headcount data yet</Typography>
                </Box>
              ) : (
                <HeadcountChart hc={headcount} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Bottom Row: Milestones + Type Breakdown ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <Flag sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Upcoming Milestones</Typography>
                <Chip label="Next 30 days" size="small" color="warning" variant="outlined" sx={{ ml: 'auto' }} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <MilestoneTimeline milestones={upcomingMilestones} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <TrendingUp sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Milestone Types</Typography>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              {upcomingMilestones.length === 0 ? (
                <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No upcoming milestones</Typography>
                </Box>
              ) : (
                <MilestoneTypeDonut milestones={upcomingMilestones} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Quick Nav Cards ── */}
      <Grid container spacing={2.5} mt={0.5}>
        {[
          { label: 'Roadmap', icon: <AccountTree />, desc: 'Gantt & Feature Timeline', to: '/roadmap', color: '#1976d2' },
          { label: 'Release Cadence', icon: <RocketLaunch />, desc: `${activeReleases} active · ${totalReleases} total`, to: '/release-cadence', color: '#9c27b0' },
          { label: 'Productivity', icon: <Assessment />, desc: 'Sprint velocity & metrics', to: '/productivity', color: '#388e3c' },
          { label: 'Headcount', icon: <Groups />, desc: headcount.total ? `${headcount.total} staff · ${headcount.openRoles} open` : 'Track staffing levels', to: '/headcount', color: '#f57c00' },
        ].map(({ label, icon, desc, to, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <QuickNavCard label={label} icon={icon} description={desc} to={to} color={color} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

