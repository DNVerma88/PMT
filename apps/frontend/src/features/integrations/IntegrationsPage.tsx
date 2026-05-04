import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Delete,
  Edit,
  Error as ErrorIcon,
  HourglassTop,
  Pause,
  Refresh,
  VpnKey,
} from '@mui/icons-material';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import integrationsService, {
  CreateIntegrationPayload,
  IntegrationConnection,
  IntegrationProvider,
  SyncDirection,
} from '../../services/integrations.service';

// ─── Constants ───────────────────────────────────────────────────────────────

const DIRECTION_LABELS: Record<SyncDirection, string> = {
  INBOUND: 'External → PMT',
  OUTBOUND: 'PMT → External',
  BIDIRECTIONAL: 'Both ways',
};

const STATUS_CHIP = {
  ACTIVE: { label: 'Active', color: 'success' as const, icon: <CheckCircle fontSize="small" /> },
  PENDING_AUTH: { label: 'Needs auth', color: 'warning' as const, icon: <VpnKey fontSize="small" /> },
  ERROR: { label: 'Error', color: 'error' as const, icon: <ErrorIcon fontSize="small" /> },
  PAUSED: { label: 'Paused', color: 'default' as const, icon: <Pause fontSize="small" /> },
};

// ─── Create/Edit dialog ──────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  providers: { provider: string; displayName: string }[];
  existing?: IntegrationConnection;
}

function EditDialog({ open, onClose, providers, existing }: EditDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateIntegrationPayload>({
    provider: (existing?.provider ?? 'JIRA') as IntegrationProvider,
    label: existing?.label ?? '',
    baseUrl: existing?.baseUrl ?? '',
    syncDirection: (existing?.syncDirection ?? 'INBOUND') as SyncDirection,
    config: existing?.config ?? {},
  });

  const createMut = useMutation({
    mutationFn: () => (existing ? integrationsService.update(existing.id, form) : integrationsService.create(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{existing ? 'Edit Integration' : 'New Integration'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Provider</InputLabel>
          <Select
            label="Provider"
            value={form.provider}
            disabled={!!existing}
            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as IntegrationProvider }))}
          >
            {providers.map((pr) => (
              <MenuItem key={pr.provider} value={pr.provider}>{pr.displayName}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Label"
          size="small"
          value={form.label}
          onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
          helperText="Friendly name, e.g. 'Acme Jira'"
        />

        <TextField
          label="Base URL"
          size="small"
          value={form.baseUrl ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
          helperText="Required for self-hosted tools (e.g. https://jira.acme.com)"
        />

        <FormControl fullWidth size="small">
          <InputLabel>Sync Direction</InputLabel>
          <Select
            label="Sync Direction"
            value={form.syncDirection}
            onChange={(e) => setForm((p) => ({ ...p, syncDirection: e.target.value as SyncDirection }))}
          >
            {Object.entries(DIRECTION_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
          <FormHelperText>Which direction data flows</FormHelperText>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!form.label || createMut.isPending}
          onClick={() => createMut.mutate()}
          startIcon={createMut.isPending ? <CircularProgress size={14} /> : undefined}
        >
          {existing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Credentials dialog ──────────────────────────────────────────────────────

function CredentialsDialog({ connection, onClose }: { connection: IntegrationConnection; onClose: () => void }) {
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({ token: '', email: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveMut = useMutation({
    mutationFn: () => integrationsService.saveCredentials(connection.id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const testMut = useMutation({
    mutationFn: () => integrationsService.testConnection(connection.id),
    onSuccess: (r) => { setTestResult(r); qc.invalidateQueries({ queryKey: ['integrations'] }); },
    onError: (e: any) => setTestResult({ success: false, message: e?.response?.data?.message ?? String(e) }),
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Credentials — {connection.label}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <Alert severity="info">
          Credentials are encrypted with AES-256-GCM and never returned after saving.
        </Alert>

        {['JIRA', 'AZURE_DEVOPS'].includes(connection.provider) && (
          <TextField
            label="Email (Jira/ADO cloud)"
            size="small"
            value={fields.email ?? ''}
            onChange={(e) => setFields((p) => ({ ...p, email: e.target.value }))}
          />
        )}

        <TextField
          label="API Token / PAT"
          size="small"
          type="password"
          value={fields.token ?? ''}
          onChange={(e) => setFields((p) => ({ ...p, token: e.target.value }))}
        />

        {testResult && (
          <Alert severity={testResult.success ? 'success' : 'error'}>{testResult.message}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          startIcon={saveMut.isPending ? <CircularProgress size={14} /> : <VpnKey />}
        >
          Save
        </Button>
        <Button
          variant="contained"
          onClick={() => testMut.mutate()}
          disabled={testMut.isPending}
          startIcon={testMut.isPending ? <CircularProgress size={14} /> : <CheckCircle />}
        >
          Test
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Sync logs panel ─────────────────────────────────────────────────────────

function SyncLogsPanel({ connectionId }: { connectionId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['integrations', connectionId, 'logs'],
    queryFn: () => integrationsService.getLogs(connectionId),
  });

  if (isLoading) return <CircularProgress size={20} />;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Sync History</Typography>
      {logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No syncs yet</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Started</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Items Synced</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.startedAt), 'MMM d, h:mm a')}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size="small"
                      color={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{log.itemsSynced}</TableCell>
                  <TableCell>{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}</TableCell>
                  <TableCell>
                    {log.errorMsg ? (
                      <Tooltip title={log.errorMsg}>
                        <Typography variant="caption" color="error" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {log.errorMsg}
                        </Typography>
                      </Tooltip>
                    ) : '—'}
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

// ─── Integrations Page ───────────────────────────────────────────────────────

export function IntegrationsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IntegrationConnection | undefined>();
  const [credsTarget, setCredsTarget] = useState<IntegrationConnection | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: providers = [] } = useQuery({
    queryKey: ['integrations', 'providers'],
    queryFn: integrationsService.listProviders,
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsService.list(),
  });

  const deleteMut = useMutation({
    mutationFn: integrationsService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const syncMut = useMutation({
    mutationFn: integrationsService.triggerSync,
    onSuccess: (_, id) => {
      setExpandedId(id);
      setTimeout(() => qc.invalidateQueries({ queryKey: ['integrations', id, 'logs'] }), 3000);
    },
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Integrations</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Add Integration
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect PMT to external project management tools. Credentials are encrypted at rest with AES-256-GCM.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : connections.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>No integrations yet.</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Add your first integration
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {connections.map((conn) => {
            const chip = STATUS_CHIP[conn.status] ?? STATUS_CHIP.PENDING_AUTH;
            const isExpanded = expandedId === conn.id;

            return (
              <Paper key={conn.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{conn.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {providers.find((p) => p.provider === conn.provider)?.displayName ?? conn.provider}
                      {conn.baseUrl ? ` · ${conn.baseUrl}` : ''}
                      {' · '}{DIRECTION_LABELS[conn.syncDirection]}
                    </Typography>
                  </Box>

                  <Chip icon={chip.icon} label={chip.label} size="small" color={chip.color} />

                  {conn.lastSyncAt && (
                    <Typography variant="caption" color="text.secondary">
                      Last sync: {format(new Date(conn.lastSyncAt), 'MMM d, h:mm a')}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Sync now">
                      <span>
                        <IconButton
                          size="small"
                          disabled={conn.status !== 'ACTIVE' || syncMut.isPending}
                          onClick={() => syncMut.mutate(conn.id)}
                        >
                          {syncMut.variables === conn.id && syncMut.isPending ? <CircularProgress size={16} /> : <Refresh />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Credentials">
                      <IconButton size="small" onClick={() => setCredsTarget(conn)}><VpnKey /></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => setEditTarget(conn)}><Edit /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteMut.mutate(conn.id)}><Delete /></IconButton>
                    </Tooltip>
                    <Tooltip title="Show logs">
                      <IconButton
                        size="small"
                        onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                      >
                        <HourglassTop />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {conn.errorMsg && (
                  <Alert severity="error" sx={{ mt: 1 }} icon={<ErrorIcon />}>
                    {conn.errorMsg}
                  </Alert>
                )}

                {isExpanded && (
                  <>
                    <Divider sx={{ mt: 2 }} />
                    <SyncLogsPanel connectionId={conn.id} />
                  </>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {createOpen && (
        <EditDialog open onClose={() => setCreateOpen(false)} providers={providers} />
      )}
      {editTarget && (
        <EditDialog open onClose={() => setEditTarget(undefined)} providers={providers} existing={editTarget} />
      )}
      {credsTarget && (
        <CredentialsDialog connection={credsTarget} onClose={() => setCredsTarget(undefined)} />
      )}
    </Box>
  );
}
