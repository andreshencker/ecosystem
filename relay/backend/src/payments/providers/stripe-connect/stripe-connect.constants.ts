// src/payments/providers/stripe-connect/stripe-connect.constants.ts

export const STRIPE_CONNECT_PROVIDER_KEY = 'stripe-connect' as const;
export const STRIPE_CONNECT_DISPLAY_NAME = 'Stripe Connect';
export const STRIPE_CONNECT_DESCRIPTION =
  'Stripe Connect — marketplace onboarding: connected accounts, hosted KYC, ' +
  'and destination charges with an application fee.';
export const STRIPE_CONNECT_CONNECTION_TYPE = 'api_key' as const;

export const STRIPE_CONNECT_API_VERSION = '2026-06-24.dahlia' as const;
export const STRIPE_CONNECT_TIMEOUT_MS = 10_000;
