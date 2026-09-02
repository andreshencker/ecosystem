export interface GrapiflyAppConfig {
  contractVersion: 1;
  key: 'jtrade';
  name: string;
  description: string;
  launchUrl: string;
  theme: {
    icon: string;
    logoUrl: string | null;
    logoUrlDark: string | null;
    faviconUrl: string | null;
    fontFamily: string;
    light: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
    dark: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
  };
  allowedFlows: ('client' | 'provider' | 'internal')[];
}
