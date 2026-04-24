import { createTheme, alpha } from '@mui/material/styles';

// Brand palette
const BRAND_BLUE = '#1565C0';
const BRAND_BLUE_LIGHT = '#42A5F5';
const BRAND_DARK_BG = '#0A1929';

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? BRAND_BLUE : BRAND_BLUE_LIGHT,
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#00838F',
      },
      error: {
        main: '#D32F2F',
      },
      warning: {
        main: '#ED6C02',
      },
      success: {
        main: '#2E7D32',
      },
      background: {
        default: mode === 'light' ? '#F5F7FA' : BRAND_DARK_BG,
        paper: mode === 'light' ? '#FFFFFF' : '#132F4C',
      },
    },

    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 700, fontSize: '2rem' },
      h2: { fontWeight: 700, fontSize: '1.5rem' },
      h3: { fontWeight: 600, fontSize: '1.25rem' },
      h4: { fontWeight: 600, fontSize: '1.125rem' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },

    shape: {
      borderRadius: 8,
    },

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: ({ theme }) => ({
            fontWeight: 600,
            backgroundColor:
              mode === 'light'
                ? alpha(theme.palette.primary.main, 0.06)
                : alpha(theme.palette.primary.main, 0.15),
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });
