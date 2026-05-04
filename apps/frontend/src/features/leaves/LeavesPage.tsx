import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select,
  InputLabel, FormControl, MenuItem, Stack, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Checkbox, FormControlLabel, IconButton, Autocomplete,
} from '@mui/material';
import { Add, Edit, Delete, BeachAccess } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leavesService, { type CreateLeavePayload, type LeaveRecord } from '../../services/leaves.service';
import wsrService from '../../services/wsr.service';
import { useProject } from '../../context/ProjectContext';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () =>
      import('../../services/api').then(({ api }) =>
        api
          .get<{ data: { id: string; firstName: string; lastName: string; email: string }[]; meta: unknown }>('/users', { params: { limit: 200 } })
          .then((r) => r.data.data ?? []),
      ),
  });
}

// ─── Leave form dialog ────────────────────────────────────────────────────────

function LeaveDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: LeaveRecord | null }) {
  const { activeProject } = useProject();
  const qc = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['wsr-config', activeProject?.id],
    queryFn: () => wsrService.getConfig(activeProject!.id),
    enabled: !!activeProject,
  });
  const { data: members = [] } = useTeamMembers();

  const leaveTypes = config?.leaveTypeConfig ?? [
    { key: 'PLANNED', label: 'Planned Leave' },
    { key: 'UNPLANNED', label: 'Unplanned Leave' },
    { key: 'SICK', label: 'Sick Leave' },
  ];

  const [userId, setUserId] = useState(initial?.userId ?? '');
  const [leaveType, setLeaveType] = useState(initial?.leaveType ?? leaveTypes[0]?.key ?? 'PLANNED');
  const [startDate, setStartDate] = useState(initial?.startDate ? initial.startDate.slice(0, 10) : '');
  const [endDate, setEndDate] = useState(initial?.endDate ? initial.endDate.slice(0, 10) : '');
  const [halfDay, setHalfDay] = useState(initial?.halfDay ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const createMut = useMutation({
    mutationFn: (p: CreateLeavePayload) => leavesService.create(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); onClose(); },
  });
  const updateMut = useMutation({
    mutationFn: (p: Partial<CreateLeavePayload>) => leavesService.update(initial!.id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); onClose(); },
  });

  const handleSave = () => {
    const payload: CreateLeavePayload = {
      userId,
      projectId: activeProject?.id,
      leaveType,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      halfDay,
      notes: notes || undefined,
    };
    if (initial) updateMut.mutate(payload); else createMut.mutate(payload);
  };

  const busy = createMut.isPending || updateMut.isPending;
  const err = createMut.error || updateMut.error;

  const selectedMember = members.find((m: { id: string }) => m.id === userId) ?? null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Leave' : 'Log Leave'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {err && <Alert severity="error">{String(err)}</Alert>}
          <Autocomplete
            options={members}
            getOptionLabel={(m: { id: string; firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`}
            value={selectedMember}
            onChange={(_e, v: { id: string } | null) => setUserId(v?.id ?? '')}
            renderInput={(params) => <TextField {...params} label="Team Member" size="small" />}
          />
          <FormControl size="small">
            <InputLabel>Leave Type</InputLabel>
            <Select label="Leave Type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              {leaveTypes.map((lt) => <MenuItem key={lt.key} value={lt.key}>{lt.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <FormControlLabel control={<Checkbox checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} />} label="Half Day" />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} size="small" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={busy || !userId || !startDate || !endDate}>
          {busy ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LeavesPage() {
  const { activeProject } = useProject();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRecord | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: config } = useQuery({
    queryKey: ['wsr-config', activeProject?.id],
    queryFn: () => wsrService.getConfig(activeProject!.id),
    enabled: !!activeProject,
  });

  const leaveTypes = config?.leaveTypeConfig ?? [
    { key: 'PLANNED', label: 'Planned Leave' },
    { key: 'UNPLANNED', label: 'Unplanned Leave' },
    { key: 'SICK', label: 'Sick Leave' },
  ];

  const { data: list, isLoading } = useQuery({
    queryKey: ['leaves', activeProject?.id, from, to],
    queryFn: () =>
      leavesService.getAll({
        projectId: activeProject?.id,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      }),
    enabled: !!activeProject,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => leavesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (l: LeaveRecord) => { setEditing(l); setDialogOpen(true); };
  const typeLabel = (key: string) => leaveTypes.find((t) => t.key === key)?.label ?? key;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Leaves</Typography>
          <Typography variant="body2" color="text.secondary">{activeProject?.name ?? 'Select a project'}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd} disabled={!activeProject}>
          Log Leave
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        {(from || to) && <Button size="small" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}
      </Stack>

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle1" fontWeight={600}><BeachAccess sx={{ verticalAlign: 'middle', mr: 1 }} />Leave Records</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          {isLoading ? <LoadingSpinner /> : !list?.data?.length ? (
            <EmptyState icon={<BeachAccess />} title="No leave records" description="Log team members' leave here." />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Half Day</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.data.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell>{l.user ? `${l.user.firstName} ${l.user.lastName}` : '—'}</TableCell>
                      <TableCell><Chip label={typeLabel(l.leaveType)} size="small" /></TableCell>
                      <TableCell>{new Date(l.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(l.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{l.halfDay ? 'Yes' : '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes ?? '—'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(l)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => deleteMut.mutate(l.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <LeaveDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={editing} />
    </Box>
  );
}
