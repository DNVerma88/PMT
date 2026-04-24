import { Component, ReactNode } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Log to external monitoring in production (e.g., Sentry)
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box
          role="alert"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 2,
            p: 4,
          }}
        >
          <Alert
            severity="error"
            sx={{ maxWidth: 480, width: '100%' }}
            action={
              <Button
                size="small"
                startIcon={<RefreshOutlined />}
                onClick={this.handleReset}
                aria-label="Try again"
              >
                Try again
              </Button>
            }
          >
            <Typography fontWeight={600} mb={0.5}>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {import.meta.env.DEV && this.state.error
                ? this.state.error.message
                : 'An unexpected error occurred. Please try again or contact support.'}
            </Typography>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
