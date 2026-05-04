import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Slider,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete, DoneAll, Notifications, Settings } from '@mui/icons-material';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import notificationsService, {
  AppNotification,
  NotificationPreference,
} from '../../services/notifications.service';

const TYPE_LABELS: Record<string, { label: string; color: 'warning' | 'error' | 'info' | 'default' | 'success' }> = {
  MILESTONE_DUE_SOON: { label: 'Due Soon', color: 'warning' },
  MILESTONE_OVERDUE: { label: 'Overdue', color: 'error' },
  RELEASE_STATUS_CHANGED: { label: 'Release Update', color: 'warning' },
  MILESTONE_STATUS_CHANGED: { label: 'Milestone Update', color: 'info' },
  MEMBER_ADDED: { label: 'Project', color: 'success' },
};

function NotificationList({
  notifications,
  onMarkRead,
  onDelete,
}: {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (notifications.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">No notifications</Typography>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {notifications.map((n, idx) => {
        const meta = TYPE_LABELS[n.type] ?? { label: n.type, color: 'default' as const };
        return (
          <Box key={n.id}>
            {idx > 0 && <Divider />}
            <ListItem
              alignItems="flex-start"
              sx={{
                bgcolor: n.isRead ? 'transparent' : 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
                py: 1.5,
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!n.isRead && (
                    <Tooltip title="Mark as read">
                      <IconButton size="small" onClick={() => onMarkRead(n.id)}>
                        <DoneAll fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(n.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 8, mb: 0.5 }}>
                    <Typography variant="body1" fontWeight={n.isRead ? 400 : 600}>
                      {n.title}
                    </Typography>
                    <Chip label={meta.label} color={meta.color} size="small" sx={{ height: 18, fontSize: 11 }} />
                    {!n.isRead && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')} ·{' '}
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          </Box>
        );
      })}
    </List>
  );
}

function PreferencesPanel({ prefs }: { prefs: NotificationPreference }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState(prefs);

  const mutation = useMutation({
    mutationFn: notificationsService.updatePreferences,
    onSuccess: (updated) => {
      queryClient.setQueryData(['notifications', 'preferences'], updated);
    },
  });

  const save = (patch: Partial<NotificationPreference>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    mutation.mutate(patch);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Notification Preferences
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Delivery channels
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={local.inAppEnabled}
              onChange={(e) => save({ inAppEnabled: e.target.checked })}
            />
          }
          label="In-app notifications"
        />
        <FormControlLabel
          control={
            <Switch
              checked={local.emailEnabled}
              onChange={(e) => save({ emailEnabled: e.target.checked })}
            />
          }
          label="Email notifications"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Alert me for milestones due within{' '}
          <strong>{local.milestoneDueSoonDays} day{local.milestoneDueSoonDays !== 1 ? 's' : ''}</strong>
        </Typography>
        <Slider
          value={local.milestoneDueSoonDays}
          min={1}
          max={14}
          step={1}
          marks={[1, 3, 5, 7, 10, 14].map((v) => ({ value: v, label: `${v}d` }))}
          onChange={(_, v) => setLocal((p) => ({ ...p, milestoneDueSoonDays: v as number }))}
          onChangeCommitted={(_, v) => save({ milestoneDueSoonDays: v as number })}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Notification types
        </Typography>
        {[
          { key: 'notifyMilestoneDue', label: 'Milestone due soon' },
          { key: 'notifyMilestoneOverdue', label: 'Milestone overdue' },
          { key: 'notifyReleaseStatus', label: 'Release / milestone status changes' },
          { key: 'notifyMemberAdded', label: 'Added to a project' },
        ].map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Switch
                checked={local[key as keyof NotificationPreference] as boolean}
                onChange={(e) => save({ [key]: e.target.checked })}
              />
            }
            label={label}
            sx={{ display: 'flex' }}
          />
        ))}
      </Box>

      {mutation.isPending && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">Saving…</Typography>
        </Box>
      )}
    </Paper>
  );
}

export function NotificationsPage() {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsService.getAll(),
  });

  const { data: prefs } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsService.getPreferences,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n) => !n.isRead);
  const displayed = tab === 0 ? notifications : unread;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Notifications
        </Typography>
        <Button
          size="small"
          startIcon={<DoneAll />}
          onClick={() => markAllReadMutation.mutate()}
          disabled={unread.length === 0 || markAllReadMutation.isPending}
        >
          Mark all read
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`All (${notifications.length})`} />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Unread
              {unread.length > 0 && (
                <Chip label={unread.length} size="small" color="error" sx={{ height: 18, fontSize: 11 }} />
              )}
            </Box>
          }
        />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Settings fontSize="small" />Preferences</Box>} />
      </Tabs>

      {tab === 2 ? (
        prefs ? <PreferencesPanel prefs={prefs} /> : <CircularProgress />
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined">
          <NotificationList
            notifications={displayed}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </Paper>
      )}
    </Box>
  );
}
