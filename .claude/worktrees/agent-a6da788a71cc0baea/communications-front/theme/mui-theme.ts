import { createTheme } from '@mui/material/styles';

// Design-System.md: §1 Color Palette, §2 Typography, §3 Spacing, §6 Border Radius

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4263EB',
      dark: '#3451D1',
      light: '#6785F5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7C3AED',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#0EA66F',
      light: '#D1FAE5',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#2563EB',
      light: '#DBEAFE',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    divider: '#E2E8F0',
    action: {
      hover: 'rgba(66, 99, 235, 0.04)',
      selected: 'rgba(66, 99, 235, 0.08)',
    },
  },

  typography: {
    // Font family set via CSS variable from next/font
    fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
    body1: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },
    overline: { fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '0.06em' },
    button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },
  },

  shape: {
    borderRadius: 6,
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
          lineHeight: 1,
        },
        sizeMedium: {
          height: 36,
          padding: '0 16px',
        },
        sizeSmall: {
          height: 30,
          padding: '0 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          height: 42,
          padding: '0 20px',
          fontSize: '0.9375rem',
        },
      },
    },

    MuiCard: {
      defaultProps: {
        variant: 'outlined',
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          borderColor: '#E2E8F0',
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          fontWeight: 500,
          height: 24,
          fontSize: '0.75rem',
          textTransform: 'none',
        },
        label: {
          padding: '0 8px',
        },
      },
    },

    MuiDialog: {
      defaultProps: {
        maxWidth: 'sm' as const,
        fullWidth: true,
      },
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        size: 'medium' as const,
        variant: 'outlined' as const,
        fullWidth: true,
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: '6px !important',
          fontSize: '0.875rem',
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2E8F0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94A3B8',
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: '0.75rem',
          backgroundColor: '#0F172A',
        },
        arrow: {
          color: '#0F172A',
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 500,
          color: '#64748B',
          backgroundColor: '#F8FAFC',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '1px 8px',
          padding: '8px 12px',
          '&.Mui-selected': {
            backgroundColor: '#EEF2FF',
            color: '#4263EB',
            '&:hover': {
              backgroundColor: '#E0E7FF',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
        },
      },
    },

    MuiSkeleton: {
      defaultProps: {
        animation: 'wave',
      },
    },

    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
      },
    },
  },
});
