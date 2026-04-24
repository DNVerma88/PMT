import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSprintCalendars } from '../release-cadence/useReleaseCadence';
import { useFeatureTimeline, useDeleteFeature, useUpdateFeature } from './useFeatures';
import { FeatureDrawer } from './FeatureDrawer';
import { FeatureDto, MonthGroup, SprintDto } from '../../services/features.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const SPRINT_W = 56;   // px per sprint column
const ROW_H = 44;      // px per feature row
const FIRST_COL_W = 220; // px for the sticky feature-name column
const BAR_RADIUS = 4;   // px
const BAR_HEIGHT = 13;  // px
const PHASE1_TOP = 6;   // px offset from row top
const PHASE2_TOP = 25;  // px

interface TableColors {
  header: string;
  headerSub: string;
  rowEven: string;
  rowOdd: string;
}

const DEFAULT_TABLE_COLORS: TableColors = {
  header: '#e53935',
  headerSub: '#b71c1c',
  rowEven: '#ffffff',
  rowOdd: '#fafafa',
};

/** Returns black or white for best contrast against a hex background. */
function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance (WCAG)
  const lum = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  return L > 0.179 ? '#000000' : '#ffffff';
}

type GroupBy = 'none' | 'category' | 'team' | 'releasePlan';

interface GroupedRow {
  groupLabel?: string;
  features: FeatureDto[];
}

interface Props {
  projectId?: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FeatureTimeline({ projectId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [calendarId, setCalendarId] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureDto | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Legend color overrides — applied to all features for instant bulk recolor
  const [legendColors, setLegendColors] = useState({ phase1: '#ff9800', phase2: '#4caf50' });
  const [updatingColors, setUpdatingColors] = useState<'phase1' | 'phase2' | null>(null);

  // Table appearance colors (local only — no server persistence needed)
  const [tableColors, setTableColors] = useState<TableColors>(DEFAULT_TABLE_COLORS);

  function setTableColor(key: keyof TableColors, value: string) {
    setTableColors((prev) => ({ ...prev, [key]: value }));
  }

  const { data: calendars = [], isLoading: loadingCalendars } = useSprintCalendars(projectId);
  const {
    data: timeline,
    isLoading: loadingTimeline,
    isError,
  } = useFeatureTimeline({ sprintCalendarId: calendarId || undefined, projectId });

  const deleteFeature = useDeleteFeature();
  const updateFeature = useUpdateFeature();

  // Sync legend colors from the first feature whenever timeline loads
  useEffect(() => {
    if (timeline?.features.length) {
      setLegendColors({
        phase1: timeline.features[0].phase1Color,
        phase2: timeline.features[0].phase2Color,
      });
    }
  }, [timeline?.features[0]?.phase1Color, timeline?.features[0]?.phase2Color]);

  // ── Grouping ──────────────────────────────────────────────────────────────

  const groups: GroupedRow[] = useMemo(() => {
    if (!timeline) return [];
    const features = timeline.features;

    if (groupBy === 'none') return [{ features }];

    const map = new Map<string, FeatureDto[]>();
    for (const f of features) {
      let key = '';
      if (groupBy === 'category') key = f.category || '(No Category)';
      else if (groupBy === 'team') key = f.teamName || '(No Team)';
      else if (groupBy === 'releasePlan') key = f.releasePlanName || '(No Release Plan)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries()).map(([groupLabel, features]) => ({ groupLabel, features }));
  }, [timeline, groupBy]);

  // Apply legend color overrides so bars update instantly before the server round-trip
  const displayedGroups: GroupedRow[] = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        features: g.features.map((f) => ({
          ...f,
          phase1Color: legendColors.phase1,
          phase2Color: legendColors.phase2,
        })),
      })),
    [groups, legendColors],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingFeature(null);
    setDrawerOpen(true);
  }

  function openEdit(f: FeatureDto) {
    setEditingFeature(f);
    setDrawerOpen(true);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    await deleteFeature.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  /** Bulk-update phase color for every feature visible in the current timeline */
  async function handleBulkColorChange(phase: 'phase1' | 'phase2', color: string) {
    // Update legend state immediately for instant visual feedback
    setLegendColors((prev) => ({ ...prev, [phase]: color }));
    if (!timeline?.features.length) return;
    setUpdatingColors(phase);
    try {
      await Promise.all(
        timeline.features.map((f) =>
          updateFeature.mutateAsync({ id: f.id, data: { [`${phase}Color`]: color } }),
        ),
      );
    } finally {
      setUpdatingColors(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const sprints: SprintDto[] = timeline?.sprints ?? [];
  const months: MonthGroup[] = timeline?.months ?? [];

  return (
    <Box>
      {/* ── Toolbar ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2} flexWrap="wrap" alignItems={{ xs: 'stretch', sm: 'center' }}>
        {/* Calendar selector */}
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
          <InputLabel>Sprint Calendar</InputLabel>
          <Select
            label="Sprint Calendar"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            disabled={loadingCalendars}
          >
            <MenuItem value="">
              <em>Select a sprint calendar…</em>
            </MenuItem>
            {(calendars as { id: string; name: string }[]).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Group-by selector */}
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
          <InputLabel>Group By</InputLabel>
          <Select
            label="Group By"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="category">Category</MenuItem>
            <MenuItem value="team">Team</MenuItem>
            <MenuItem value="releasePlan">Release Plan</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        {/* Color pickers — row on sm+, wrap on xs */}
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" color="text.disabled" sx={{ mr: 0.25, whiteSpace: 'nowrap' }}>
            Table
          </Typography>
          <MiniColorPicker
            value={tableColors.header}
            onChange={(v) => setTableColor('header', v)}
            tooltip="Header row color"
          />
          <MiniColorPicker
            value={tableColors.headerSub}
            onChange={(v) => setTableColor('headerSub', v)}
            tooltip="Sprint row color"
          />
          <MiniColorPicker
            value={tableColors.rowEven}
            onChange={(v) => setTableColor('rowEven', v)}
            tooltip="Even row color"
          />
          <MiniColorPicker
            value={tableColors.rowOdd}
            onChange={(v) => setTableColor('rowOdd', v)}
            tooltip="Odd row color"
          />
        </Stack>

        {/* Legend — swatches are color pickers */}
        {timeline && (
          <Stack direction="row" gap={2} alignItems="center">
            {(timeline.features[0] ?? groups[0]?.features[0]) ? (
              <>
                <LegendSwatch
                  color={legendColors.phase1}
                  label={timeline.features[0]?.phase1Label ?? 'Development'}
                  loading={updatingColors === 'phase1'}
                  onColorChange={(c) => handleBulkColorChange('phase1', c)}
                />
                <LegendSwatch
                  color={legendColors.phase2}
                  label={timeline.features[0]?.phase2Label ?? 'QA / Release'}
                  loading={updatingColors === 'phase2'}
                  onColorChange={(c) => handleBulkColorChange('phase2', c)}
                />
              </>
            ) : null}
          </Stack>
        )}

        {/* Add button */}
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={!calendarId}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          Add Feature
        </Button>
      </Stack>

      {/* ── Content area ── */}
      {!calendarId && (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>
          <Typography>Select a sprint calendar to view the feature timeline.</Typography>
        </Box>
      )}

      {calendarId && loadingTimeline && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {calendarId && isError && (
        <Box sx={{ py: 4, textAlign: 'center', color: 'error.main' }}>
          <Typography>Failed to load timeline. Please try again.</Typography>
        </Box>
      )}

      {calendarId && !loadingTimeline && !isError && timeline && (
        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <table
            style={{
              borderCollapse: 'collapse',
              minWidth: FIRST_COL_W + sprints.length * SPRINT_W,
              tableLayout: 'fixed',
            }}
          >
            <thead>
              {/* Month header row */}
              <tr>
                <th
                  style={{
                    width: FIRST_COL_W,
                    minWidth: FIRST_COL_W,
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    backgroundColor: tableColors.header,
                    color: contrastText(tableColors.header),
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 8px',
                    textAlign: 'left',
                    border: '1px solid rgba(128,128,128,0.25)',
                  }}
                >
                  Feature
                </th>
                {months.map((m) => (
                  <th
                    key={`${m.year}-${m.month}`}
                    colSpan={m.sprintNumbers.length}
                    style={{
                      backgroundColor: tableColors.header,
                      color: contrastText(tableColors.header),
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '6px 4px',
                      border: '1px solid rgba(128,128,128,0.25)',
                    }}
                  >
                    {m.label} {m.year}
                  </th>
                ))}
              </tr>

              {/* Sprint number row */}
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    backgroundColor: tableColors.headerSub,
                    color: contrastText(tableColors.headerSub),
                    fontSize: 11,
                    padding: '4px 8px',
                    textAlign: 'left',
                    border: '1px solid rgba(128,128,128,0.2)',
                  }}
                >
                  Sprint
                </th>
                {sprints.map((s) => (
                  <th
                    key={s.id}
                    style={{
                      width: SPRINT_W,
                      minWidth: SPRINT_W,
                      backgroundColor: tableColors.headerSub,
                      color: contrastText(tableColors.headerSub),
                      fontSize: 11,
                      fontWeight: 400,
                      textAlign: 'center',
                      padding: '4px 2px',
                      border: '1px solid rgba(128,128,128,0.2)',
                    }}
                  >
                    S-{s.number}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td
                    colSpan={sprints.length + 1}
                    style={{ textAlign: 'center', padding: '24px', color: '#999', fontSize: 13 }}
                  >
                    No features yet. Click "Add Feature" to get started.
                  </td>
                </tr>
              )}

              {displayedGroups.map((g, gi) => (
                <>
                  {/* Group header row */}
                  {groupBy !== 'none' && g.groupLabel && (
                    <tr key={`group-${gi}`}>
                      <td
                        colSpan={sprints.length + 1}
                        style={{
                          backgroundColor: '#f5f5f5',
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#555',
                          borderBottom: '1px solid #e0e0e0',
                        }}
                      >
                        {g.groupLabel}
                      </td>
                    </tr>
                  )}

                  {/* Feature rows */}
                  {g.features.map((f, fi) => (
                    <FeatureRow
                      key={f.id}
                      feature={f}
                      sprints={sprints}
                      rowIndex={fi}
                      tableColors={tableColors}
                      onEdit={() => openEdit(f)}
                      onDelete={() => setConfirmDeleteId(f.id)}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {/* ── Feature Drawer ── */}
      <FeatureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        feature={editingFeature}
        projectId={projectId}
        defaultCalendarId={calendarId}
      />

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullScreen={isMobile}>
        <DialogTitle>Delete Feature?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will soft-delete the feature and remove it from the timeline. You cannot undo this
            action from the UI.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteFeature.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Feature Row ────────────────────────────────────────────────────────────────

interface RowProps {
  feature: FeatureDto;
  sprints: SprintDto[];
  rowIndex: number;
  tableColors: TableColors;
  onEdit: () => void;
  onDelete: () => void;
}

function FeatureRow({ feature: f, sprints, rowIndex, tableColors, onEdit, onDelete }: RowProps) {
  const isEven = rowIndex % 2 === 0;
  const rowBg = isEven ? tableColors.rowEven : tableColors.rowOdd;

  function barStyle(
    startSprint: number | null | undefined,
    endSprint: number | null | undefined,
    color: string,
    topOffset: number,
    sprintNum: number,
  ): React.CSSProperties | undefined {
    if (!startSprint || !endSprint) return undefined;
    if (sprintNum < startSprint || sprintNum > endSprint) return undefined;

    const isFirst = sprintNum === startSprint;
    const isLast = sprintNum === endSprint;

    return {
      position: 'absolute' as const,
      top: topOffset,
      left: isFirst ? 2 : 0,
      right: isLast ? 2 : 0,
      height: BAR_HEIGHT,
      backgroundColor: color,
      borderRadius: isFirst && isLast
        ? BAR_RADIUS
        : isFirst
        ? `${BAR_RADIUS}px 0 0 ${BAR_RADIUS}px`
        : isLast
        ? `0 ${BAR_RADIUS}px ${BAR_RADIUS}px 0`
        : 0,
      opacity: 0.92,
    };
  }

  return (
    <tr>
      {/* Sticky feature name cell */}
      <td
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 2,
          width: FIRST_COL_W,
          minWidth: FIRST_COL_W,
          height: ROW_H,
          backgroundColor: rowBg,
          borderBottom: '1px solid #e0e0e0',
          borderRight: '2px solid #e0e0e0',
          padding: '0 4px 0 8px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: ROW_H,
          }}
        >
          <Tooltip title={f.description ?? ''} placement="right" disableHoverListener={!f.description}>
            <Typography
              variant="body2"
              sx={{
                fontSize: 12,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                mr: 0.5,
              }}
            >
              {f.name}
            </Typography>
          </Tooltip>
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
            <IconButton size="small" sx={{ p: 0.25 }} onClick={onEdit}>
              <EditIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.25 }} onClick={onDelete}>
              <DeleteIcon sx={{ fontSize: 14, color: 'error.light' }} />
            </IconButton>
          </Box>
        </Box>
      </td>

      {/* Sprint cells */}
      {sprints.map((s) => {
        const p1Style = barStyle(
          f.phase1StartSprint,
          f.phase1EndSprint,
          f.phase1Color,
          PHASE1_TOP,
          s.number,
        );
        const p2Style = barStyle(
          f.phase2StartSprint,
          f.phase2EndSprint,
          f.phase2Color,
          PHASE2_TOP,
          s.number,
        );

        const label1 = p1Style
          ? `${f.phase1Label}: S-${f.phase1StartSprint} → S-${f.phase1EndSprint}`
          : '';
        const label2 = p2Style
          ? `${f.phase2Label}: S-${f.phase2StartSprint} → S-${f.phase2EndSprint}`
          : '';

        return (
          <td
            key={s.id}
            style={{
              width: SPRINT_W,
              minWidth: SPRINT_W,
              height: ROW_H,
              position: 'relative',
              backgroundColor: rowBg,
              borderBottom: '1px solid #e0e0e0',
              borderRight: '1px solid #f0f0f0',
              padding: 0,
            }}
          >
            {p1Style && (
              <Tooltip title={label1} placement="top" arrow>
                <span style={{ display: 'block', ...p1Style }} />
              </Tooltip>
            )}
            {p2Style && (
              <Tooltip title={label2} placement="bottom" arrow>
                <span style={{ display: 'block', ...p2Style }} />
              </Tooltip>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ── Legend swatch (click to change color for all features) ──────────────────

interface LegendSwatchProps {
  color: string;
  label: string;
  loading?: boolean;
  onColorChange?: (color: string) => void;
}

function LegendSwatch({ color, label, loading, onColorChange }: LegendSwatchProps) {
  return (
    <Tooltip
      title={onColorChange ? `Click swatch to change color for all features` : ''}
      placement="top"
      disableHoverListener={!onColorChange}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          component="label"
          sx={{
            cursor: onColorChange ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 10,
            borderRadius: 0.5,
            bgcolor: color,
            flexShrink: 0,
            border: onColorChange ? '2px solid transparent' : 'none',
            boxShadow: onColorChange ? '0 0 0 1px rgba(0,0,0,0.18)' : 'none',
            transition: 'box-shadow 0.15s',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': onColorChange ? { boxShadow: '0 0 0 2px rgba(0,0,0,0.4)' } : {},
          }}
        >
          {onColorChange && (
            <Box
              component="input"
              type="color"
              value={color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onColorChange(e.target.value)}
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            />
          )}
        </Box>
        {loading ? (
          <CircularProgress size={10} sx={{ color: 'text.disabled', flexShrink: 0 }} />
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ── MiniColorPicker — compact square swatch used in the table-colors toolbar ──

function MiniColorPicker({
  value,
  onChange,
  tooltip,
}: {
  value: string;
  onChange: (v: string) => void;
  tooltip: string;
}) {
  return (
    <Tooltip title={tooltip} placement="top">
      <Box
        component="label"
        sx={{
          cursor: 'pointer',
          display: 'inline-flex',
          width: 18,
          height: 18,
          borderRadius: 0.5,
          bgcolor: value,
          border: '1.5px solid rgba(0,0,0,0.18)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'box-shadow 0.15s',
          '&:hover': { boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' },
        }}
      >
        <Box
          component="input"
          type="color"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          }}
        />
      </Box>
    </Tooltip>
  );
}
