// src/payments/providers/stripe-connect/stripe-connect.capabilities.ts

import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import type { PaymentProviderCapabilities } from '../../types/payment.types';

/**
 * Stripe Connect capabilities — a marketplace/platform provider, distinct from
 * the direct `stripe` provider. It only does Connect: create connected
 * accounts, hosted onboarding, and destination Checkout charges with an
 * application fee. Refunds / payouts / payment-methods belong to `stripe`.
 */
export const STRIPE_CONNECT_CAPABILITIES: PaymentProviderCapabilities = {
  capabilities: {
    [PaymentCapability.Gateway]: CapabilityStatus.Available,
    [PaymentCapability.Connect]: CapabilityStatus.Available,
    [PaymentCapability.Checkout]: CapabilityStatus.Available,
  },
};
