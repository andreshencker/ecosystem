export interface GrapiflyAppPalette {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface GrapiflyAppConfig {
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
    light: GrapiflyAppPalette;
    dark: GrapiflyAppPalette;
  };
}
