import { Box, Button, Typography } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      role="status"
      aria-label={title}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 8,
        px: 4,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <Box aria-hidden="true" sx={{ color: 'action.disabled', mb: 1 }}>
        {icon ?? <InboxOutlined sx={{ fontSize: 56 }} />}
      </Box>

      <Typography variant="h6" fontWeight={600} color="text.primary">
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" maxWidth={400}>
          {description}
        </Typography>
      )}

      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
