import type { AppConfig } from '@/types/app-config';

export const APP_CONFIG_FALLBACK: AppConfig = {
  contractVersion: 1,
  key: 'relay',
  name: 'Relay',
  description: 'Secure connections and automation across external services.',
  launchUrl: 'http://localhost:3000',
  theme: {
    icon: 'R',
    logoUrl: null,
    logoUrlDark: null,
    faviconUrl: null,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
    light: { primaryColor: '#F4733D', primaryContrastText: '#FFFFFF', backgroundColor: '#F7F7F9', textColor: '#111116' },
    dark: { primaryColor: '#FF8A5B', primaryContrastText: '#FFFFFF', backgroundColor: '#17151F', textColor: '#F5F4FA' },
  },
};
