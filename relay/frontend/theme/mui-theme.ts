import { createTheme } from '@mui/material/styles';

// Design-System.md: §1 Color Palette, §2 Typography, §3 Spacing, §6 Border Radius

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#F4733D',
      dark: '#D95527',
      light: '#FFAA52',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7655E8',
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
      default: '#F7F7F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111116',
      secondary: '#6B6B73',
      disabled: '#94A3B8',
    },
    divider: '#E2E8F0',
    action: {
      hover: 'rgba(244, 115, 61, 0.05)',
      selected: 'rgba(244, 115, 61, 0.10)',
    },
  },

  typography: {
    // Font family set via CSS variable from next/font
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
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
    borderRadius: 14,
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999,
          fontWeight: 600,
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
          borderRadius: 18,
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
          borderRadius: 22,
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
          borderRadius: '12px !important',
          fontSize: '0.875rem',
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
            backgroundColor: '#FFF0E7',
            color: '#D95527',
            '&:hover': {
              backgroundColor: '#FFE3D2',
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
