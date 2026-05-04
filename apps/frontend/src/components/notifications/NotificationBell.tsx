import {
  Badge,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import { Notifications, NotificationsNone, DoneAll, OpenInNew } from '@mui/icons-material';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import notificationsService, { AppNotification } from '../../services/notifications.service';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICONS: Record<string, string> = {
  MILESTONE_DUE_SOON: '⏰',
  MILESTONE_OVERDUE: '🔴',
  RELEASE_STATUS_CHANGED: '⚠️',
  MILESTONE_STATUS_CHANGED: '🔄',
  MEMBER_ADDED: '👤',
};

export function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 60_000, // poll every 60s
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsService.getAll(),
    enabled: Boolean(anchorEl),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small">
          <Badge badgeContent={count > 0 ? count : undefined} color="error" max={99}>
            {count > 0 ? <Notifications /> : <NotificationsNone />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 520 } } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications {count > 0 && `(${count} unread)`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {count > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton
                  size="small"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <DoneAll fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View all notifications">
              <IconButton
                size="small"
                onClick={() => { handleClose(); navigate('/notifications'); }}
              >
                <OpenInNew fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* List */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ overflowY: 'auto', maxHeight: 400 }}>
            {notifications.slice(0, 20).map((n, idx) => (
              <Box key={n.id}>
                {idx > 0 && <Divider />}
                <ListItem
                  alignItems="flex-start"
                  onClick={() => handleNotificationClick(n)}
                  sx={{
                    bgcolor: n.isRead ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                    py: 1,
                    px: 2,
                  }}
                  secondaryAction={
                    <Tooltip title="Dismiss">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(n.id);
                        }}
                        sx={{ opacity: 0, '.MuiListItem-root:hover &': { opacity: 1 } }}
                      >
                        ×
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 2 }}>
                        <span style={{ fontSize: 14 }}>{TYPE_ICONS[n.type] ?? '🔔'}</span>
                        <Typography
                          variant="body2"
                          fontWeight={n.isRead ? 400 : 600}
                          noWrap
                          sx={{ flex: 1 }}
                        >
                          {n.title}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.25, lineHeight: 1.4 }}
                        >
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
