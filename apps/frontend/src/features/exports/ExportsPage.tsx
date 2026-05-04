import {
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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Download, CheckCircle, Error as ErrorIcon, HourglassTop } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import exportsService, {
  CreateExportPayload,
  ExportFormat,
  ExportJob,
  ExportReportType,
  ExportStatus,
} from '../../services/exports.service';
import { format } from 'date-fns';

const STATUS_ICONS: Record<ExportStatus, React.ReactNode> = {
  PENDING: <HourglassTop fontSize="small" color="warning" />,
  READY: <CheckCircle fontSize="small" color="success" />,
  FAILED: <ErrorIcon fontSize="small" color="error" />,
};

const REPORT_TYPES: { value: ExportReportType; label: string }[] = [
  { value: 'roadmap', label: 'Roadmap (all releases + milestones)' },
  { value: 'headcount', label: 'Headcount' },
  { value: 'productivity', label: 'Productivity Metrics' },
  { value: 'release', label: 'Release Detail' },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'EXCEL', label: 'Excel (.xlsx)' },
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV (raw data)' },
];

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportJobRow({ job }: { job: ExportJob }) {
  const [polling, setPolling] = useState(job.status === 'PENDING');
  const [current, setCurrent] = useState(job);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!polling) return;
    pollRef.current = setInterval(async () => {
      const updated = await exportsService.getStatus(job.id);
      setCurrent(updated);
      if (updated.status !== 'PENDING') {
        setPolling(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, job.id]);

  const handleDownload = async () => {
    const blob = await exportsService.download(current.id);
    downloadBlob(blob, current.fileName ?? `export-${current.id}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {REPORT_TYPES.find((t) => t.value === current.reportType)?.label ?? current.reportType}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {format(new Date(current.createdAt), 'MMM d, yyyy h:mm a')}
          {current.readyAt && ` · ready ${format(new Date(current.readyAt), 'h:mm a')}`}
        </Typography>
      </Box>

      <Chip label={current.format} size="small" variant="outlined" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {STATUS_ICONS[current.status]}
        <Typography variant="caption">{current.status}</Typography>
        {current.status === 'PENDING' && <CircularProgress size={12} />}
      </Box>

      {current.status === 'READY' && (
        <Tooltip title="Download">
          <Button size="small" startIcon={<Download />} onClick={handleDownload} variant="outlined">
            Download
          </Button>
        </Tooltip>
      )}

      {current.status === 'FAILED' && (
        <Tooltip title={current.errorMsg ?? 'Unknown error'}>
          <Typography variant="caption" color="error" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current.errorMsg ?? 'Failed'}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  defaultReportType?: ExportReportType;
  projectId?: string;
}

export function ExportDialog({ open, onClose, defaultReportType, projectId }: ExportDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateExportPayload>({
    reportType: defaultReportType ?? 'roadmap',
    format: 'EXCEL',
    projectId,
    from: '',
    to: '',
  });

  const mutation = useMutation({
    mutationFn: exportsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports', 'history'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Report</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Report Type</InputLabel>
          <Select
            label="Report Type"
            value={form.reportType}
            onChange={(e) => setForm((p) => ({ ...p, reportType: e.target.value as ExportReportType }))}
          >
            {REPORT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Format</InputLabel>
          <Select
            label="Format"
            value={form.format}
            onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as ExportFormat }))}
          >
            {FORMATS.map((f) => (
              <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="From date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.from ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
          />
          <TextField
            label="To date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.to ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={14} /> : undefined}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ExportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['exports', 'history'],
    queryFn: exportsService.getHistory,
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Exports
        </Typography>
        <Button variant="contained" startIcon={<Download />} onClick={() => setDialogOpen(true)}>
          New Export
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Exported files are available for 7 days after generation.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : history.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Download sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No exports yet. Click "New Export" to generate a report.</Typography>
        </Box>
      ) : (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {history.map((job, idx) => (
            <Box key={job.id}>
              {idx > 0 && <Divider />}
              <ExportJobRow job={job} />
            </Box>
          ))}
        </Box>
      )}

      <ExportDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
