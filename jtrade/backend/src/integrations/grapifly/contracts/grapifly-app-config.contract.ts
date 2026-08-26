export interface GrapiflyAppConfig {
  contractVersion: 1;
  key: 'jtrade';
  name: string;
  description: string;
  launchUrl: string;
  theme: {
    icon: string;
    logoUrl: string | null;
    fontFamily: string;
    light: { primaryColor: string; backgroundColor: string; textColor: string };
    dark: { primaryColor: string; backgroundColor: string; textColor: string };
  };
  allowedFlows: ('client' | 'provider' | 'internal')[];
}
