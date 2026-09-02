import { alpha, createTheme, darken, lighten, type PaletteMode } from '@mui/material/styles';
import { APP_CONFIG_FALLBACK } from '@/config/app-config';
import type { AppConfig } from '@/types/app-config';

// Design-System.md: §1 Color Palette, §2 Typography, §3 Spacing, §6 Border Radius

export const makeMuiTheme = (appConfig: AppConfig = APP_CONFIG_FALLBACK, mode: PaletteMode = 'light') => {
  const palette = appConfig.theme[mode];
  const primary = palette.primaryColor;
  const isDark = mode === 'dark';
  const divider = alpha(palette.textColor, isDark ? 0.14 : 0.1);
  const paper = isDark ? lighten(palette.backgroundColor, 0.045) : '#FFFFFF';
  return createTheme({
  palette: {
    mode,
    primary: {
      main: primary,
      dark: darken(primary, 0.18),
      light: lighten(primary, 0.2),
      contrastText: palette.primaryContrastText,
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
      default: palette.backgroundColor,
      paper,
    },
    text: {
      primary: palette.textColor,
      secondary: alpha(palette.textColor, 0.65),
      disabled: alpha(palette.textColor, 0.4),
    },
    divider,
    action: {
      hover: alpha(primary, isDark ? 0.12 : 0.05),
      selected: alpha(primary, isDark ? 0.2 : 0.1),
    },
  },

  typography: {
    // Font family set via CSS variable from next/font
    fontFamily: appConfig.theme.fontFamily ?? APP_CONFIG_FALLBACK.theme.fontFamily!,
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
          borderColor: divider,
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
            borderColor: divider,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(palette.textColor, 0.4),
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
          backgroundColor: isDark ? lighten(palette.backgroundColor, 0.15) : '#0F172A',
        },
        arrow: {
          color: isDark ? lighten(palette.backgroundColor, 0.15) : '#0F172A',
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: divider,
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 500,
          color: alpha(palette.textColor, 0.65),
          backgroundColor: isDark ? lighten(palette.backgroundColor, 0.07) : darken(palette.backgroundColor, 0.015),
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
            backgroundColor: alpha(primary, 0.1),
            color: isDark ? lighten(primary, 0.15) : darken(primary, 0.18),
            '&:hover': {
              backgroundColor: alpha(primary, 0.16),
            },
          },
          '&:hover': {
            backgroundColor: alpha(palette.textColor, 0.04),
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: divider,
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
};

export const muiTheme = makeMuiTheme();
