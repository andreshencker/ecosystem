// src/payments/providers/stripe/stripe.payment-methods.spec.ts
//
// Unit tests for stripe.payment-methods.ts helpers.
// No Stripe SDK calls — tests the pure mapping / extraction logic.

import {
  mapStripeMethodStatus,
  extractStripeMethodEntries,
  mapStripeMethodToCanonical,
  buildStripeUpdateParams,
  KNOWN_STRIPE_METHOD_KEYS,
} from './stripe.payment-methods';
import { PaymentMethodConfigurationStatus } from '../../enums/payment-method-configuration-status.enum';
import { PaymentMethodType } from '../../enums/payment-method-type.enum';
import type Stripe from 'stripe';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNT_ID = 'cred-abc-123';

function makeMethodField(opts: {
  available?: boolean;
  preference?: string;
  value?: string;
  overridable?: boolean | null;
}) {
  return {
    available: opts.available !== undefined ? opts.available : true,
    display_preference: {
      preference: opts.preference !== undefined ? opts.preference : 'none',
      value: opts.value !== undefined ? opts.value : 'off',
      overridable: opts.overridable !== undefined ? opts.overridable : true,
    },
  };
}

function makeConfig(
  methods: Record<string, ReturnType<typeof makeMethodField>>,
): Stripe.PaymentMethodConfiguration {
  return {
    id: 'pmc_test_123',
    object: 'payment_method_configuration',
    is_default: true,
    active: true,
    name: 'Test',
    ...methods,
  } as unknown as Stripe.PaymentMethodConfiguration;
}

// ─── mapStripeMethodStatus ────────────────────────────────────────────────────

describe('mapStripeMethodStatus', () => {
  // ── Key correction ─────────────────────────────────────────────────────────
  // Stripe's `available` means "currently offered at checkout", NOT
  // "permanently supported". Disabled methods (preference='off') have
  // available=false but status must be Inactive, not Unsupported.
  // Unsupported is reserved for overridable=false (Connect child configs).

  it('returns Inactive (not Unsupported) when disabled with preference off', () => {
    // Typical disabled method: preference='off', value='off', available=false
    const result = mapStripeMethodStatus(false, 'off', 'off', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Inactive);
  });

  it('returns Inactive when disabled with preference none', () => {
    const result = mapStripeMethodStatus(false, 'off', 'none', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Inactive);
  });

  it('returns Unsupported only when overridable is false', () => {
    // overridable=false → child Connect config cannot change this setting
    const result = mapStripeMethodStatus(false, 'off', 'none', false);
    expect(result).toBe(PaymentMethodConfigurationStatus.Unsupported);
  });

  it('returns Unsupported when overridable=false even if available', () => {
    const result = mapStripeMethodStatus(true, 'on', 'on', false);
    expect(result).toBe(PaymentMethodConfigurationStatus.Unsupported);
  });

  it('returns Active when available and value is "on"', () => {
    const result = mapStripeMethodStatus(true, 'on', 'on', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Active);
  });

  it('returns Active when value is "on" regardless of preference', () => {
    const result = mapStripeMethodStatus(true, 'on', 'none', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Active);
  });

  it('returns Inactive when available but value is "off" (preference none)', () => {
    const result = mapStripeMethodStatus(true, 'off', 'none', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Inactive);
  });

  it('returns Inactive when available but value is "off" (preference off)', () => {
    const result = mapStripeMethodStatus(true, 'off', 'off', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Inactive);
  });

  it('returns Restricted when value "on" but not available (capability not active)', () => {
    // preference='on' but account capability blocks it → restricted
    const result = mapStripeMethodStatus(false, 'on', 'on', null);
    expect(result).toBe(PaymentMethodConfigurationStatus.Restricted);
  });

  it('overridable=true behaves same as overridable=null for status', () => {
    const withTrue = mapStripeMethodStatus(false, 'off', 'off', true);
    const withNull = mapStripeMethodStatus(false, 'off', 'off', null);
    expect(withTrue).toBe(withNull);
  });
});

// ─── extractStripeMethodEntries ───────────────────────────────────────────────

describe('extractStripeMethodEntries', () => {
  it('returns entries for present method fields', () => {
    const config = makeConfig({
      card: makeMethodField({ available: true, value: 'on', preference: 'on' }),
      klarna: makeMethodField({ available: false }),
    });

    const entries = extractStripeMethodEntries(config);

    expect(entries.some((e) => e.key === 'card')).toBe(true);
    expect(entries.some((e) => e.key === 'klarna')).toBe(true);
  });

  it('does not return entries for absent fields', () => {
    const config = makeConfig({
      card: makeMethodField({}),
    });

    const entries = extractStripeMethodEntries(config);

    // Only card is present — apple_pay should be absent
    expect(entries.some((e) => e.key === 'apple_pay')).toBe(false);
  });

  it('returns empty array for a config with no known method fields', () => {
    const config = makeConfig({});
    const entries = extractStripeMethodEntries(config);
    expect(entries).toHaveLength(0);
  });

  it('preserves display_preference data for each entry', () => {
    const config = makeConfig({
      card: makeMethodField({
        available: true,
        value: 'on',
        preference: 'on',
        overridable: true,
      }),
    });

    const entries = extractStripeMethodEntries(config);
    const cardEntry = entries.find((e) => e.key === 'card');

    expect(cardEntry).toBeDefined();
    expect(cardEntry?.data.available).toBe(true);
    expect(cardEntry?.data.display_preference.value).toBe('on');
    expect(cardEntry?.data.display_preference.preference).toBe('on');
    expect(cardEntry?.data.display_preference.overridable).toBe(true);
  });

  it('handles null overridable correctly', () => {
    const config = makeConfig({
      card: makeMethodField({ overridable: null }),
    });

    const entries = extractStripeMethodEntries(config);
    const cardEntry = entries.find((e) => e.key === 'card');

    expect(cardEntry?.data.display_preference.overridable).toBeNull();
  });
});

// ─── mapStripeMethodToCanonical ───────────────────────────────────────────────

describe('mapStripeMethodToCanonical', () => {
  it('maps card to PaymentMethodType.Card', () => {
    const data = makeMethodField({
      available: true,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.type).toBe(PaymentMethodType.Card);
  });

  it('maps klarna to PaymentMethodType.BuyNowPayLater', () => {
    const data = makeMethodField({
      available: true,
      value: 'off',
      preference: 'off',
    });
    const result = mapStripeMethodToCanonical('klarna', data, ACCOUNT_ID);
    expect(result.type).toBe(PaymentMethodType.BuyNowPayLater);
  });

  it('maps apple_pay to PaymentMethodType.Wallet', () => {
    const data = makeMethodField({
      available: true,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical('apple_pay', data, ACCOUNT_ID);
    expect(result.type).toBe(PaymentMethodType.Wallet);
  });

  it('maps sepa_debit to PaymentMethodType.DirectDebit', () => {
    const data = makeMethodField({
      available: true,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical('sepa_debit', data, ACCOUNT_ID);
    expect(result.type).toBe(PaymentMethodType.DirectDebit);
  });

  it('maps unknown key to PaymentMethodType.Other', () => {
    const data = makeMethodField({
      available: true,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical(
      'unknown_method',
      data,
      ACCOUNT_ID,
    );
    expect(result.type).toBe(PaymentMethodType.Other);
  });

  it('sets id equal to the stripe field key', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.id).toBe('card');
  });

  it('sets accountId correctly', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.accountId).toBe(ACCOUNT_ID);
  });

  it('enabled is true when available and value is "on"', () => {
    const data = makeMethodField({
      available: true,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.enabled).toBe(true);
  });

  it('enabled is false when value is "off"', () => {
    const data = makeMethodField({
      available: true,
      value: 'off',
      preference: 'off',
    });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.enabled).toBe(false);
  });

  it('enabled is false when not available even if value is "on"', () => {
    const data = makeMethodField({
      available: false,
      value: 'on',
      preference: 'on',
    });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.enabled).toBe(false);
  });

  it('configurable is true when overridable is not false (available=true)', () => {
    const data = makeMethodField({ available: true, overridable: true });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.configurable).toBe(true);
  });

  it('configurable is false ONLY when overridable is false', () => {
    // overridable=false → Connect child config; parent setting cannot be overridden
    const data = makeMethodField({ available: true, overridable: false });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.configurable).toBe(false);
  });

  it('configurable is true when disabled (available=false) but overridable is not false', () => {
    // KEY FIX: a disabled method can still be configured (enabled via API).
    // available=false means "not currently offered at checkout", not "unsupported".
    const data = makeMethodField({ available: false, overridable: true });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.configurable).toBe(true);
  });

  it('configurable is true when disabled with overridable=null', () => {
    // null is the typical value for non-Connect root configs — always configurable
    const data = makeMethodField({ available: false, overridable: null });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.configurable).toBe(true);
  });

  it('configurable is true when overridable is null (root config)', () => {
    const data = makeMethodField({ available: true, overridable: null });
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.configurable).toBe(true);
  });

  it('returns displayName "Credit & Debit Cards" for card', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.displayName).toBe('Credit & Debit Cards');
  });

  it('returns displayName "Apple Pay" for apple_pay', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('apple_pay', data, ACCOUNT_ID);
    expect(result.displayName).toBe('Apple Pay');
  });

  it('returns capitalised displayName for unknown key', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('my_method', data, ACCOUNT_ID);
    expect(result.displayName).toBe('My Method');
  });

  it('returns empty supportedCurrencies and supportedCountries', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.supportedCurrencies).toEqual([]);
    expect(result.supportedCountries).toEqual([]);
  });

  it('reason is null', () => {
    const data = makeMethodField({});
    const result = mapStripeMethodToCanonical('card', data, ACCOUNT_ID);
    expect(result.reason).toBeNull();
  });
});

// ─── buildStripeUpdateParams ──────────────────────────────────────────────────

describe('buildStripeUpdateParams', () => {
  it('builds params with preference "on" when enabled is true', () => {
    const params = buildStripeUpdateParams('card', true);
    expect(params['card']?.display_preference.preference).toBe('on');
  });

  it('builds params with preference "off" when enabled is false', () => {
    const params = buildStripeUpdateParams('card', false);
    expect(params['card']?.display_preference.preference).toBe('off');
  });

  it('uses the methodId as the key in the update params', () => {
    const params = buildStripeUpdateParams('apple_pay', true);
    expect(Object.keys(params)).toContain('apple_pay');
  });

  it('does not include extra keys', () => {
    const params = buildStripeUpdateParams('klarna', false);
    expect(Object.keys(params)).toHaveLength(1);
  });

  // ── Stable key requirement ────────────────────────────────────────────────
  // The stable Stripe field key (e.g. 'afterpay_clearpay') must be used as the
  // update param key — never the display label ('Afterpay / Clearpay').

  it('uses the exact stable Stripe field key for afterpay_clearpay (never the display label)', () => {
    const params = buildStripeUpdateParams('afterpay_clearpay', true);
    expect(Object.keys(params)).toContain('afterpay_clearpay');
    expect(Object.keys(params)).not.toContain('Afterpay / Clearpay');
    expect(Object.keys(params)).not.toContain('afterpay clearpay');
    expect(params['afterpay_clearpay']?.display_preference.preference).toBe(
      'on',
    );
  });

  it('disabling afterpay_clearpay sets preference "off"', () => {
    const params = buildStripeUpdateParams('afterpay_clearpay', false);
    expect(params['afterpay_clearpay']?.display_preference.preference).toBe(
      'off',
    );
  });
});

// ─── mapStripeMethodToCanonical — configurable when disabled ──────────────────
// Regression guard for the bug where !available incorrectly blocked enabling.
// A disabled method (available=false) must still have configurable=true so the
// frontend shows it in the Add dropdown and the adapter can attempt to enable it.

describe('mapStripeMethodToCanonical — configurable for disabled BNPL methods', () => {
  it('afterpay_clearpay with available=false, overridable=null is configurable', () => {
    const data = makeMethodField({
      available: false,
      value: 'off',
      overridable: null,
    });
    const result = mapStripeMethodToCanonical(
      'afterpay_clearpay',
      data,
      ACCOUNT_ID,
    );
    expect(result.configurable).toBe(true);
    expect(result.enabled).toBe(false);
    expect(result.id).toBe('afterpay_clearpay');
  });

  it('afterpay_clearpay with overridable=false is not configurable (Connect child)', () => {
    const data = makeMethodField({
      available: false,
      value: 'off',
      overridable: false,
    });
    const result = mapStripeMethodToCanonical(
      'afterpay_clearpay',
      data,
      ACCOUNT_ID,
    );
    expect(result.configurable).toBe(false);
  });

  it('klarna with available=false, overridable=true is configurable', () => {
    const data = makeMethodField({
      available: false,
      value: 'off',
      overridable: true,
    });
    const result = mapStripeMethodToCanonical('klarna', data, ACCOUNT_ID);
    expect(result.configurable).toBe(true);
    expect(result.enabled).toBe(false);
  });

  it('enabled is false for any method where value is "off" regardless of available', () => {
    // Ensures the Add dropdown only shows methods that are truly not yet enabled.
    const dataAvailable = makeMethodField({
      available: true,
      value: 'off',
      overridable: null,
    });
    const dataUnavailable = makeMethodField({
      available: false,
      value: 'off',
      overridable: null,
    });
    expect(
      mapStripeMethodToCanonical('klarna', dataAvailable, ACCOUNT_ID).enabled,
    ).toBe(false);
    expect(
      mapStripeMethodToCanonical('klarna', dataUnavailable, ACCOUNT_ID).enabled,
    ).toBe(false);
  });
});

// ─── KNOWN_STRIPE_METHOD_KEYS ─────────────────────────────────────────────────

describe('KNOWN_STRIPE_METHOD_KEYS', () => {
  it('includes common methods', () => {
    expect(KNOWN_STRIPE_METHOD_KEYS).toContain('card');
    expect(KNOWN_STRIPE_METHOD_KEYS).toContain('apple_pay');
    expect(KNOWN_STRIPE_METHOD_KEYS).toContain('klarna');
    expect(KNOWN_STRIPE_METHOD_KEYS).toContain('sepa_debit');
  });

  it('has no duplicates', () => {
    const unique = new Set(KNOWN_STRIPE_METHOD_KEYS);
    expect(unique.size).toBe(KNOWN_STRIPE_METHOD_KEYS.length);
  });
});
