import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  /** Fill the full viewport height */
  fullPage?: boolean;
  message?: string;
  size?: number;
}

export function LoadingSpinner({ fullPage = false, message, size = 40 }: LoadingSpinnerProps) {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: fullPage ? '100vh' : 320,
        width: '100%',
      }}
    >
      <CircularProgress size={size} aria-hidden="true" />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
