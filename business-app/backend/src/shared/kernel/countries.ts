export const COUNTRIES = {
  AU: 'AU',
  US: 'US',
  GB: 'GB',
  CA: 'CA',
  NZ: 'NZ',
  DE: 'DE',
  FR: 'FR',
  ES: 'ES',
  IT: 'IT',
  JP: 'JP',
  CN: 'CN',
  IN: 'IN',
  BR: 'BR',
  AR: 'AR',
  MX: 'MX',
  SG: 'SG',
  HK: 'HK',
  NL: 'NL',
  SE: 'SE',
  NO: 'NO',
} as const;

export type CountryCode = (typeof COUNTRIES)[keyof typeof COUNTRIES];
