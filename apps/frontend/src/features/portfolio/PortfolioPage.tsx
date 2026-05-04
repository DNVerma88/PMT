import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountTree,
  CheckCircle,
  Error as ErrorIcon,
  FiberManualRecord,
  Groups,
  RocketLaunch,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import portfolioService, {
  ProjectHealthRow,
  UpcomingMilestone,
} from '../../services/portfolio.service';
import { format } from 'date-fns';

// ─── Helper components ───────────────────────────────────────────────────────

const HEALTH_COLORS = { red: '#d32f2f', amber: '#f57c00', green: '#2e7d32' };
const HEALTH_LABELS = { red: 'Delayed', amber: 'At Risk', green: 'On Track' };

function HealthDot({ health }: { health: 'red' | 'amber' | 'green' }) {
  return (
    <FiberManualRecord
      sx={{ color: HEALTH_COLORS[health], fontSize: 16, verticalAlign: 'middle' }}
    />
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} lineHeight={1}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.disabled">
                {sub}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Release health table ────────────────────────────────────────────────────

function ReleaseHealthSection({ data }: { data: ProjectHealthRow[] }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Release Health
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'background.default' } }}>
              <TableCell>Project</TableCell>
              <TableCell>Health</TableCell>
              <TableCell>Releases</TableCell>
              <TableCell>On Track</TableCell>
              <TableCell>At Risk</TableCell>
              <TableCell>Delayed</TableCell>
              <TableCell>Milestones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const on = row.releases.filter((r) => r.health === 'green').length;
              const risk = row.releases.filter((r) => r.health === 'amber').length;
              const delayed = row.releases.filter((r) => r.health === 'red').length;
              const completed = row.releases.reduce((s, r) => s + r.completedMilestones, 0);
              const total = row.releases.reduce((s, r) => s + r.totalMilestones, 0);

              return (
                <TableRow key={row.projectId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{row.projectName}</Typography>
                    <Typography variant="caption" color="text.disabled">{row.projectCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={HEALTH_LABELS[row.overallHealth]}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <HealthDot health={row.overallHealth} />
                        <Typography variant="caption">{HEALTH_LABELS[row.overallHealth]}</Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{row.releases.length}</TableCell>
                  <TableCell>
                    <Chip label={on} size="small" color="success" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={risk} size="small" color="warning" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={delayed} size="small" color="error" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {completed} / {total}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No active projects
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Upcoming milestones table ───────────────────────────────────────────────

function MilestonesSection({ data }: { data: UpcomingMilestone[] }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Upcoming Milestones (next 30 days)
      </Typography>
      {data.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No milestones due in the next 30 days.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'background.default' } }}>
                <TableCell>Project</TableCell>
                <TableCell>Release</TableCell>
                <TableCell>Milestone</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Days Left</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.milestoneId} hover>
                  <TableCell>
                    <Typography variant="body2">{m.project?.name ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.releaseName} <Typography component="span" variant="caption" color="text.disabled">v{m.releaseVersion}</Typography></Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.type.replace(/_/g, ' ')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(m.plannedDate), 'MMM d, yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${m.daysUntilDue}d`}
                      size="small"
                      color={m.daysUntilDue <= 7 ? 'error' : m.daysUntilDue <= 14 ? 'warning' : 'default'}
                      variant={m.daysUntilDue <= 14 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{m.status.replace(/_/g, ' ')}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ─── Productivity bar chart ───────────────────────────────────────────────────

function ProductivityChart({ data }: { data: { period: string; planned: number; actual: number; projectName: string }[] }) {
  // Group by period for a stacked/grouped bar
  const periods = [...new Set(data.map((d) => d.period))].sort();
  const projects = [...new Set(data.map((d) => d.projectName))];

  const plannedSeries = projects.map((p) => ({
    name: `${p} — Planned`,
    type: 'bar' as const,
    stack: p,
    data: periods.map((period) => {
      const found = data.find((d) => d.period === period && d.projectName === p);
      return found?.planned ?? 0;
    }),
  }));

  const actualSeries = projects.map((p) => ({
    name: `${p} — Actual`,
    type: 'bar' as const,
    stack: p,
    data: periods.map((period) => {
      const found = data.find((d) => d.period === period && d.projectName === p);
      return found?.actual ?? 0;
    }),
  }));

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { show: true, type: 'scroll' },
    grid: { left: 40, right: 10, bottom: 40, top: 50, containLabel: true },
    xAxis: { type: 'category', data: periods },
    yAxis: { type: 'value', name: 'Units' },
    series: [...plannedSeries, ...actualSeries],
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Productivity Trend (Planned vs Actual)
      </Typography>
      <ReactECharts option={option} style={{ height: 300 }} />
    </Box>
  );
}

// ─── Headcount chart ─────────────────────────────────────────────────────────

function HeadcountChart({ data }: { data: { period: string; closing: number; planned: number; projectName: string }[] }) {
  const periods = [...new Set(data.map((d) => d.period))].sort();
  const projects = [...new Set(data.map((d) => d.projectName))];

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { show: true, type: 'scroll' },
    grid: { left: 40, right: 10, bottom: 40, top: 50, containLabel: true },
    xAxis: { type: 'category', data: periods },
    yAxis: { type: 'value', name: 'Headcount' },
    series: projects.map((p) => ({
      name: p,
      type: 'line' as const,
      data: periods.map((period) => {
        const found = data.find((d) => d.period === period && d.projectName === p);
        return found?.closing ?? null;
      }),
    })),
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Headcount by Project
      </Typography>
      <ReactECharts option={option} style={{ height: 280 }} />
    </Box>
  );
}

// ─── Risks section ───────────────────────────────────────────────────────────

function RisksSection({ overdue, delayed }: { overdue: any[]; delayed: any[] }) {
  if (overdue.length === 0 && delayed.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', mt: 1 }}>
        <CheckCircle />
        <Typography>No at-risk items detected.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>
        At-Risk Items
      </Typography>

      {delayed.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <ErrorIcon color="error" fontSize="small" />
            <Typography variant="subtitle2" color="error">
              Delayed / At-Risk Releases
            </Typography>
          </Box>
          {delayed.map((r) => (
            <Box
              key={r.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5, px: 1, bgcolor: 'error.50', borderRadius: 1, mb: 0.5 }}
            >
              <Chip label={r.status} size="small" color={r.status === 'DELAYED' ? 'error' : 'warning'} />
              <Typography variant="body2">
                {r.name} v{r.version}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.project?.name ?? '—'} · due {r.plannedEnd ? format(new Date(r.plannedEnd), 'MMM d, yyyy') : '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {overdue.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Warning color="warning" fontSize="small" />
            <Typography variant="subtitle2" color="warning.dark">
              Overdue Milestones
            </Typography>
          </Box>
          {overdue.slice(0, 10).map((m) => (
            <Box
              key={m.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5, px: 1, bgcolor: 'warning.50', borderRadius: 1, mb: 0.5 }}
            >
              <Chip label={`${m.daysOverdue}d overdue`} size="small" color="warning" />
              <Typography variant="body2">{m.type.replace(/_/g, ' ')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {m.release} v{m.version} · {m.project?.name ?? '—'}
              </Typography>
            </Box>
          ))}
          {overdue.length > 10 && (
            <Typography variant="caption" color="text.secondary">
              +{overdue.length - 10} more
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Portfolio Page ──────────────────────────────────────────────────────────

export function PortfolioPage() {
  const summary = useQuery({ queryKey: ['portfolio', 'summary'], queryFn: portfolioService.getSummary });
  const health = useQuery({ queryKey: ['portfolio', 'health'], queryFn: portfolioService.getReleaseHealth });
  const headcount = useQuery({ queryKey: ['portfolio', 'headcount'], queryFn: portfolioService.getHeadcount });
  const productivity = useQuery({ queryKey: ['portfolio', 'productivity'], queryFn: portfolioService.getProductivity });
  const milestones = useQuery({ queryKey: ['portfolio', 'milestones'], queryFn: () => portfolioService.getMilestones() });
  const risks = useQuery({ queryKey: ['portfolio', 'risks'], queryFn: portfolioService.getRisks });

  const isLoading = [summary, health, headcount, productivity, milestones, risks].some((q) => q.isLoading);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const s = summary.data!;
  const releasesByStatus = s?.releaseStatusBreakdown ?? {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Portfolio Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cross-project health, headcount, productivity, and risk summary.
      </Typography>

      {/* KPI row */}
      {s && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Total Projects" value={s.totalProjects} icon={<AccountTree />} sub={`${s.activeProjects} active`} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Total Releases" value={s.totalReleases} icon={<RocketLaunch />} sub={`${releasesByStatus['DELIVERED'] ?? 0} delivered`} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Team Members" value={s.totalMembers} icon={<Groups />} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard
              label="At-Risk / Delayed"
              value={(releasesByStatus['AT_RISK'] ?? 0) + (releasesByStatus['DELAYED'] ?? 0)}
              icon={<Warning />}
              sub="releases"
            />
          </Grid>
        </Grid>
      )}

      {/* Charts row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {headcount.data && headcount.data.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <HeadcountChart data={headcount.data} />
            </Paper>
          </Grid>
        )}
        {productivity.data && productivity.data.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <ProductivityChart data={productivity.data} />
            </Paper>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Release health */}
      {health.data && (
        <Box sx={{ mb: 4 }}>
          <ReleaseHealthSection data={health.data} />
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Milestones & Risks */}
      <Grid container spacing={3}>
        {milestones.data && (
          <Grid item xs={12} lg={7}>
            <MilestonesSection data={milestones.data} />
          </Grid>
        )}
        {risks.data && (
          <Grid item xs={12} lg={5}>
            <RisksSection overdue={risks.data.overdueMilestones} delayed={risks.data.delayedReleases} />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
