// src/payments/providers/stripe/stripe.credentials.contract.ts
//
// Stripe-specific credential contract.
// This file lives inside the Stripe provider folder and must not be imported
// from outside src/payments/providers/stripe/.
// The generic ProviderCredentialsService imports it only to participate in the
// existing credential normalize/validate/encrypt pipeline.

import type { ContractSpec } from '../../../communication/channels/implementation/shared/credentials.types';
import {
  pick,
  requireField,
  requireOneOf,
  strTrim,
} from '../../../communication/channels/implementation/shared/credentials.utils';
import { CredentialsValidationError } from '../../../communication/channels/implementation/shared/credentials.errors';

export interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  mode: 'test' | 'live';
}

const ALLOWED: (keyof StripeCredentials)[] = [
  'secretKey',
  'publishableKey',
  'webhookSecret',
  'mode',
];

// Stripe API key patterns:
//   Secret keys:      sk_test_... or sk_live_...
//   Publishable keys: pk_test_... or pk_live_...
//   Webhook secrets:  whsec_...
const SK_RE = /^sk_(test|live)_[A-Za-z0-9]{10,}$/;
const PK_RE = /^pk_(test|live)_[A-Za-z0-9]{10,}$/;
const WHSEC_RE = /^whsec_[A-Za-z0-9+/=]{10,}$/;

export const StripeCredentialsContract: ContractSpec<StripeCredentials> = {
  channelKey: 'payment',
  connectionType: 'api_key',

  normalize(input) {
    // Cast to Record<string, unknown> so property accesses return `unknown`
    // rather than `any`. `strTrim` accepts `any`, and TypeScript allows passing
    // `unknown` to `any` parameters — no unsafe-argument rule fires.
    const c: Record<string, unknown> = (input as Record<string, unknown>) ?? {};

    const secretKey = strTrim(
      c['secretKey'] ?? c['secret_key'] ?? c['STRIPE_SECRET_KEY'],
    );
    const publishableKey = strTrim(
      c['publishableKey'] ??
        c['publishable_key'] ??
        c['STRIPE_PUBLISHABLE_KEY'],
    );
    const rawWebhook = strTrim(
      c['webhookSecret'] ?? c['webhook_secret'] ?? c['STRIPE_WEBHOOK_SECRET'],
    );
    const webhookSecret = rawWebhook || undefined;
    const rawMode = strTrim(c['mode'] ?? c['STRIPE_MODE']) || 'test';
    const mode: 'test' | 'live' = rawMode === 'live' ? 'live' : 'test';

    const normalized: StripeCredentials = {
      secretKey,
      publishableKey,
      mode,
      ...(webhookSecret !== undefined && { webhookSecret }),
    };

    return {
      value: pick<StripeCredentials>(normalized, ALLOWED) as StripeCredentials,
    };
  },

  validate(value) {
    requireField(value.secretKey, 'secretKey');
    requireField(value.publishableKey, 'publishableKey');
    requireOneOf(value.mode, 'mode', ['test', 'live']);

    if (!SK_RE.test(value.secretKey)) {
      throw new CredentialsValidationError(
        'secretKey must be a valid Stripe secret key (sk_test_... or sk_live_...)',
        'secretKey',
      );
    }

    if (!PK_RE.test(value.publishableKey)) {
      throw new CredentialsValidationError(
        'publishableKey must be a valid Stripe publishable key (pk_test_... or pk_live_...)',
        'publishableKey',
      );
    }

    if (
      value.webhookSecret !== undefined &&
      !WHSEC_RE.test(value.webhookSecret)
    ) {
      throw new CredentialsValidationError(
        'webhookSecret must be a valid Stripe webhook secret (whsec_...)',
        'webhookSecret',
      );
    }

    // Non-fatal: mode vs key-prefix mismatch is allowed for staging setups.
    // A future live verifyCredentials() call against Stripe will surface the real mode.
  },

  verify() {
    // No Stripe API call in this task — structural validation only.
    // Live verification will be added when the Stripe provider adapter is implemented.
    return Promise.resolve({
      ok: true,
      message:
        'Stripe credentials format is valid. Live verification will be available after Stripe integration is complete.',
    });
  },
};
