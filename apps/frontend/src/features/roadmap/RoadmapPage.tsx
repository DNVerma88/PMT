import { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Stack,
  Chip,
  Drawer,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
} from '@mui/material';
import { AccountTree, Close, FilterList } from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { useRoadmapGantt, useRoadmapSummary } from './useRoadmap';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useProject } from '../../context/ProjectContext';
import { FeatureTimeline } from './FeatureTimeline';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#9e9e9e',
  PLANNED: '#2196f3',
  IN_PROGRESS: '#ff9800',
  COMPLETED: '#4caf50',
  CANCELLED: '#757575',
  DELAYED: '#e91e63',
  AT_RISK: '#ff5722',
};

const MILESTONE_SYMBOL_COLOR: Record<string, string> = {
  PRODUCTION_LIVE: '#4caf50',
  GO_NO_GO: '#ff9800',
  CODE_FREEZE: '#9c27b0',
  DEVELOPMENT_END: '#2196f3',
  REGRESSION_END: '#00bcd4',
};

function buildGanttOption(rows: any[]) {
  const flatRows: any[] = [];
  for (const r of rows) {
    flatRows.push({ ...r, indent: 0 });
    for (const c of r.children ?? []) {
      flatRows.push({ ...c, indent: 1 });
    }
  }

  const categories = flatRows.map((r) => ({
    name: r.indent ? `  ↳ ${r.name}` : r.name,
  }));

  const barData = flatRows.map((r, i) => ({
    value: [i, r.plannedStart, r.plannedEnd, r.name, r.status],
    itemStyle: { color: STATUS_COLOR[r.status] ?? '#607d8b', opacity: r.indent ? 0.7 : 1 },
  }));

  const milestoneData: any[] = [];
  flatRows.forEach((r, i) => {
    (r.milestones ?? []).forEach((m: any) => {
      milestoneData.push({
        value: [i, m.plannedDate],
        name: m.type,
        symbol: 'diamond',
        symbolSize: 10,
        itemStyle: { color: MILESTONE_SYMBOL_COLOR[m.type] ?? '#607d8b' },
      });
    });
  });

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesIndex === 0) {
          const [, start, end, name, status] = params.data.value;
          return `<b>${name}</b><br/>Status: ${status}<br/>${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}`;
        }
        return `<b>${params.data.name}</b><br/>${new Date(params.data.value[1]).toLocaleDateString()}`;
      },
    },
    grid: { left: 220, right: 20, top: 10, bottom: 40 },
    xAxis: { type: 'time' },
    yAxis: { type: 'category', data: categories.map((c) => c.name), axisLabel: { fontSize: 11, width: 200, overflow: 'truncate' } },
    series: [
      {
        name: 'Releases',
        type: 'custom',
        renderItem: (_: any, api: any) => {
          const catIndex = api.value(0);
          const start = api.coord([api.value(1), catIndex]);
          const end = api.coord([api.value(2), catIndex]);
          const height = api.size([0, 1])[1] * 0.5;
          const color = flatRows[catIndex]?.indent ? '#90caf9' : '#1976d2';
          return {
            type: 'rect',
            shape: { x: start[0], y: start[1] - height / 2, width: Math.max(end[0] - start[0], 4), height },
            style: api.style({ fill: STATUS_COLOR[flatRows[catIndex]?.status] ?? color }),
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: barData,
      },
      {
        name: 'Milestones',
        type: 'scatter',
        data: milestoneData,
        encode: { x: 1, y: 0 },
      },
    ],
  };
}

export function RoadmapPage() {
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const { activeProject } = useProject();

  const { data: rows, isLoading, error } = useRoadmapGantt(
    statusFilter || activeProject ? { ...(statusFilter ? { status: statusFilter } : {}), ...(activeProject ? { projectId: activeProject.id } : {}) } : undefined
  );
  const { data: summary } = useRoadmapSummary(activeProject?.id);

  if (isLoading) return <LoadingSpinner />;

  const flatRows = (rows ?? []).flatMap((r: any) => [r, ...(r.children ?? [])]);
  const totalPlanned = summary?.byStatus?.find((s: any) => s.status === 'PLANNED')?.count ?? 0;
  const totalInProgress = summary?.byStatus?.find((s: any) => s.status === 'IN_PROGRESS')?.count ?? 0;
  const totalCompleted = summary?.byStatus?.find((s: any) => s.status === 'COMPLETED')?.count ?? 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>Roadmap</Typography>
        <Stack direction="row" gap={1}>
          <Chip label={`${totalPlanned} Planned`} color="primary" size="small" variant="outlined" />
          <Chip label={`${totalInProgress} In Progress`} color="warning" size="small" variant="outlined" />
          <Chip label={`${totalCompleted} Completed`} color="success" size="small" variant="outlined" />
        </Stack>
      </Stack>

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Gantt" />
          <Tab label="Feature Timeline" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Gantt ── */}
      {tab === 0 && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
            <FilterList fontSize="small" color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {['PLANNED', 'IN_PROGRESS', 'AT_RISK', 'DELAYED', 'COMPLETED', 'CANCELLED'].map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load roadmap data</Alert>}

          {!flatRows.length ? (
            <EmptyState
              icon={<AccountTree sx={{ fontSize: 56 }} />}
              title="No roadmap data"
              description="Create release plans to see them on the roadmap Gantt chart."
            />
          ) : (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <ReactECharts
                option={buildGanttOption(rows ?? [])}
                style={{ height: Math.max(300, flatRows.length * 32 + 80) }}
                onEvents={{
                  click: (params: any) => {
                    if (params.seriesIndex === 0) {
                      setSelectedRow(flatRows[params.data.value[0]]);
                    }
                  },
                }}
              />
            </Paper>
          )}

          <Drawer anchor="right" open={!!selectedRow} onClose={() => setSelectedRow(null)}>
            <Box sx={{ width: 360, p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>Release Detail</Typography>
                <IconButton onClick={() => setSelectedRow(null)}><Close /></IconButton>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {selectedRow && (
                <Stack gap={1.5}>
                  <Typography variant="subtitle1" fontWeight={600}>{selectedRow.name}</Typography>
                  <Chip label={selectedRow.status} size="small" sx={{ alignSelf: 'flex-start', bgcolor: STATUS_COLOR[selectedRow.status] + '22', color: STATUS_COLOR[selectedRow.status] }} />
                  <Typography variant="body2">Project: <b>{selectedRow.projectName}</b></Typography>
                  {selectedRow.teamName && <Typography variant="body2">Team: <b>{selectedRow.teamName}</b></Typography>}
                  <Typography variant="body2">Planned: {new Date(selectedRow.plannedStart).toLocaleDateString()} → {new Date(selectedRow.plannedEnd).toLocaleDateString()}</Typography>
                  {selectedRow.milestones?.length > 0 && (
                    <>
                      <Divider />
                      <Typography variant="subtitle2">Milestones</Typography>
                      {selectedRow.milestones.map((m: any) => (
                        <Stack key={m.id} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{m.type.replace(/_/g, ' ')}</Typography>
                          <Typography variant="body2" color="text.secondary">{new Date(m.plannedDate).toLocaleDateString()}</Typography>
                        </Stack>
                      ))}
                    </>
                  )}
                </Stack>
              )}
            </Box>
          </Drawer>
        </>
      )}

      {/* ── Tab 1: Feature Timeline ── */}
      {tab === 1 && (
        <FeatureTimeline projectId={activeProject?.id} />
      )}
    </Box>
  );
}
