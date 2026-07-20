export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  NZD: 'NZD',
  JPY: 'JPY',
  CHF: 'CHF',
  CNY: 'CNY',
  HKD: 'HKD',
  SGD: 'SGD',
  INR: 'INR',
  BRL: 'BRL',
  ARS: 'ARS',
  MXN: 'MXN',
} as const;

export type CurrencyCode = (typeof CURRENCIES)[keyof typeof CURRENCIES];
