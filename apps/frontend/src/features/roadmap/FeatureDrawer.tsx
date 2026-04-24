import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useSprintCalendars, useReleasePlans } from '../release-cadence/useReleaseCadence';
import { useSprintCalendarDetail, useCreateFeature, useUpdateFeature } from './useFeatures';
import { FeatureDto } from '../../services/features.service';
import { api } from '../../services/api';
import { useQuery } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Feature to edit — undefined when creating */
  feature?: FeatureDto | null;
  projectId?: string;
  /** Pre-selected sprint calendar */
  defaultCalendarId?: string;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  teamId: string;
  status: string;
  releasePlanId: string;
  sprintCalendarId: string;
  sortOrder: string;
  phase1Label: string;
  phase1StartSprint: string;
  phase1EndSprint: string;
  phase1Color: string;
  phase2Label: string;
  phase2StartSprint: string;
  phase2EndSprint: string;
  phase2Color: string;
}

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];

const EMPTY: FormState = {
  name: '',
  description: '',
  category: '',
  teamId: '',
  status: 'PLANNED',
  releasePlanId: '',
  sprintCalendarId: '',
  sortOrder: '0',
  phase1Label: 'Development',
  phase1StartSprint: '',
  phase1EndSprint: '',
  phase1Color: '#ff9800',
  phase2Label: 'QA / Release',
  phase2StartSprint: '',
  phase2EndSprint: '',
  phase2Color: '#4caf50',
};

function featureToForm(f: FeatureDto, defaultCalendarId?: string): FormState {
  return {
    name: f.name,
    description: f.description ?? '',
    category: f.category ?? '',
    teamId: f.teamId ?? '',
    status: f.status,
    releasePlanId: f.releasePlanId ?? '',
    sprintCalendarId: f.sprintCalendarId ?? defaultCalendarId ?? '',
    sortOrder: String(f.sortOrder),
    phase1Label: f.phase1Label,
    phase1StartSprint: f.phase1StartSprint != null ? String(f.phase1StartSprint) : '',
    phase1EndSprint: f.phase1EndSprint != null ? String(f.phase1EndSprint) : '',
    phase1Color: f.phase1Color,
    phase2Label: f.phase2Label,
    phase2StartSprint: f.phase2StartSprint != null ? String(f.phase2StartSprint) : '',
    phase2EndSprint: f.phase2EndSprint != null ? String(f.phase2EndSprint) : '',
    phase2Color: f.phase2Color,
  };
}

export function FeatureDrawer({ open, onClose, feature, projectId, defaultCalendarId }: Props) {
  const isEdit = !!feature;

  const [form, setForm] = useState<FormState>(
    feature ? featureToForm(feature, defaultCalendarId) : { ...EMPTY, sprintCalendarId: defaultCalendarId ?? '' },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Reset form when drawer opens / feature changes
  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        feature
          ? featureToForm(feature, defaultCalendarId)
          : { ...EMPTY, sprintCalendarId: defaultCalendarId ?? '' },
      );
    }
  }, [open, feature, defaultCalendarId]);

  // ── Data for dropdowns ────────────────────────────────────────────────────

  const { data: calendars = [] } = useSprintCalendars(projectId);
  const { data: releasePlans = [] } = useReleasePlans({ projectId });
  const { data: calendarDetail, isLoading: loadingCalendar } = useSprintCalendarDetail(
    form.sprintCalendarId || undefined,
  );

  // Fetch project teams
  const { data: projectDetail } = useQuery({
    queryKey: ['project', projectId, 'teams'],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
  const teams: { id: string; name: string }[] = projectDetail?.teams ?? [];

  const sprints = calendarDetail?.sprints ?? [];
  const sprintNumbers = sprints.map((s) => s.number);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createFeature = useCreateFeature();
  const updateFeature = useUpdateFeature();
  const isBusy = createFeature.isPending || updateFeature.isPending;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.name.length > 200) e.name = 'Max 200 characters';
    if (form.description.length > 1000) e.description = 'Max 1000 characters';
    if (form.category.length > 100) e.category = 'Max 100 characters';

    const p1s = form.phase1StartSprint ? parseInt(form.phase1StartSprint, 10) : null;
    const p1e = form.phase1EndSprint ? parseInt(form.phase1EndSprint, 10) : null;
    const p2s = form.phase2StartSprint ? parseInt(form.phase2StartSprint, 10) : null;
    const p2e = form.phase2EndSprint ? parseInt(form.phase2EndSprint, 10) : null;

    if (p1s !== null && p1e !== null && p1s > p1e)
      e.phase1StartSprint = 'Start must be ≤ End';
    if (p2s !== null && p2e !== null && p2s > p2e)
      e.phase2StartSprint = 'Start must be ≤ End';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      teamId: form.teamId || undefined,
      status: form.status,
      releasePlanId: form.releasePlanId || undefined,
      sprintCalendarId: form.sprintCalendarId || undefined,
      projectId: projectId || undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      phase1Label: form.phase1Label,
      phase1StartSprint: form.phase1StartSprint ? parseInt(form.phase1StartSprint, 10) : undefined,
      phase1EndSprint: form.phase1EndSprint ? parseInt(form.phase1EndSprint, 10) : undefined,
      phase1Color: form.phase1Color,
      phase2Label: form.phase2Label,
      phase2StartSprint: form.phase2StartSprint ? parseInt(form.phase2StartSprint, 10) : undefined,
      phase2EndSprint: form.phase2EndSprint ? parseInt(form.phase2EndSprint, 10) : undefined,
      phase2Color: form.phase2Color,
    };
  }

  async function handleSubmit() {
    if (!validate()) return;
    const payload = buildPayload();
    if (isEdit) {
      await updateFeature.mutateAsync({ id: feature!.id, data: payload });
    } else {
      await createFeature.mutateAsync(payload);
    }
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 0 } }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)',
          color: '#fff',
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Edit Feature' : 'New Feature'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.25 }}>
          {isEdit ? 'Update the feature details below.' : 'Fill in details to add a feature to the timeline.'}
        </Typography>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
        <Grid container spacing={2}>
          {/* Name */}
          <Grid item xs={12}>
            <TextField
              label="Feature Name *"
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              minRows={2}
              maxRows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              inputProps={{ maxLength: 1000 }}
            />
          </Grid>

          {/* Category + Sort Order */}
          <Grid item xs={8}>
            <TextField
              label="Category"
              fullWidth
              size="small"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              error={!!errors.category}
              helperText={errors.category || 'Used for group-by in timeline'}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Sort Order"
              fullWidth
              size="small"
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Status */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Team */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Team</InputLabel>
              <Select
                label="Team"
                value={form.teamId}
                onChange={(e) => set('teamId', e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Release Plan */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Release Plan</InputLabel>
              <Select
                label="Release Plan"
                value={form.releasePlanId}
                onChange={(e) => set('releasePlanId', e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {(releasePlans as { id: string; name: string; version: string }[]).map((rp) => (
                  <MenuItem key={rp.id} value={rp.id}>
                    {rp.version} — {rp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Sprint Calendar */}
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Sprint Calendar</InputLabel>
              <Select
                label="Sprint Calendar"
                value={form.sprintCalendarId}
                onChange={(e) => set('sprintCalendarId', e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {(calendars as { id: string; name: string }[]).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* ── Phase 1 ── */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Phase 1
          </Typography>
        </Divider>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Phase 1 Label"
              fullWidth
              size="small"
              value={form.phase1Label}
              onChange={(e) => set('phase1Label', e.target.value)}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={5}>
            <FormControl fullWidth size="small" error={!!errors.phase1StartSprint}>
              <InputLabel>Start Sprint</InputLabel>
              <Select
                label="Start Sprint"
                value={form.phase1StartSprint}
                onChange={(e) => set('phase1StartSprint', e.target.value)}
                disabled={loadingCalendar || !form.sprintCalendarId}
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {sprintNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>
                    S-{n}
                  </MenuItem>
                ))}
              </Select>
              {errors.phase1StartSprint && (
                <FormHelperText>{errors.phase1StartSprint}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={5}>
            <FormControl fullWidth size="small">
              <InputLabel>End Sprint</InputLabel>
              <Select
                label="End Sprint"
                value={form.phase1EndSprint}
                onChange={(e) => set('phase1EndSprint', e.target.value)}
                disabled={loadingCalendar || !form.sprintCalendarId}
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {sprintNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>
                    S-{n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <ColorPicker
              value={form.phase1Color}
              onChange={(v) => set('phase1Color', v)}
            />
          </Grid>
        </Grid>

        {/* ── Phase 2 ── */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Phase 2
          </Typography>
        </Divider>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Phase 2 Label"
              fullWidth
              size="small"
              value={form.phase2Label}
              onChange={(e) => set('phase2Label', e.target.value)}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={5}>
            <FormControl fullWidth size="small" error={!!errors.phase2StartSprint}>
              <InputLabel>Start Sprint</InputLabel>
              <Select
                label="Start Sprint"
                value={form.phase2StartSprint}
                onChange={(e) => set('phase2StartSprint', e.target.value)}
                disabled={loadingCalendar || !form.sprintCalendarId}
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {sprintNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>
                    S-{n}
                  </MenuItem>
                ))}
              </Select>
              {errors.phase2StartSprint && (
                <FormHelperText>{errors.phase2StartSprint}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={5}>
            <FormControl fullWidth size="small">
              <InputLabel>End Sprint</InputLabel>
              <Select
                label="End Sprint"
                value={form.phase2EndSprint}
                onChange={(e) => set('phase2EndSprint', e.target.value)}
                disabled={loadingCalendar || !form.sprintCalendarId}
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {sprintNumbers.map((n) => (
                  <MenuItem key={n} value={String(n)}>
                    S-{n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <ColorPicker
              value={form.phase2Color}
              onChange={(v) => set('phase2Color', v)}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1.5,
          justifyContent: 'flex-end',
        }}
      >
        <Button variant="outlined" onClick={onClose} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={isBusy}
          startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isEdit ? 'Save Changes' : 'Create Feature'}
        </Button>
      </Box>
    </Drawer>
  );
}

// ── Tiny Color Picker ─────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box
      component="label"
      title="Pick color"
      sx={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 1,
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: value,
        boxShadow: 1,
        '&:hover': { borderColor: 'text.primary' },
        position: 'relative',
        overflow: 'hidden',
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
  );
}
