export interface AppPalette {
  primaryColor: string;
  /** Text/icon color rendered on top of primaryColor (e.g. contained button labels). */
  primaryContrastText: string;
  backgroundColor: string;
  textColor: string;
}

export interface AppConfig {
  contractVersion: 1;
  key: 'relay';
  name: string;
  description: string;
  launchUrl: string;
  theme: {
    icon: string;
    logoUrl: string | null;
    logoUrlDark: string | null;
    faviconUrl: string | null;
    fontFamily: string | null;
    light: AppPalette;
    dark: AppPalette;
  };
}

/** Picks the mode-correct logo — theme.logoUrlDark in dark mode if set, otherwise the default logoUrl. */
export function resolveLogoUrl(theme: AppConfig['theme'], mode: 'light' | 'dark'): string | undefined {
  return (mode === 'dark' ? theme.logoUrlDark : null) ?? theme.logoUrl ?? undefined;
}
