// src/payments/providers/payment-provider.tokens.ts

/**
 * Centralised NestJS injection tokens for the Payments provider layer.
 *
 * Using string tokens allows the registry and provider adapters to be
 * substituted with test doubles without changing import paths.
 */

/** Injection token for PaymentProviderRegistry. */
export const PAYMENT_PROVIDER_REGISTRY = 'PAYMENT_PROVIDER_REGISTRY';

/**
 * Well-known canonical provider keys for use in switch-free provider resolution.
 * These must match the providerKey values declared by each provider adapter.
 */
export const PaymentProviderKey = {
  Stripe: 'stripe',
  PayPal: 'paypal',
  Square: 'square',
  Adyen: 'adyen',
  MercadoPago: 'mercadopago',
  Braintree: 'braintree',
} as const;

export type PaymentProviderKey =
  (typeof PaymentProviderKey)[keyof typeof PaymentProviderKey];
