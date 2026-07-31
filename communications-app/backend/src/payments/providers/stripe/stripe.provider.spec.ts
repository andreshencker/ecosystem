// src/payments/providers/stripe/stripe.provider.spec.ts

import { StripePaymentProvider } from './stripe.provider';
import { STRIPE_CAPABILITIES } from './stripe.capabilities';
import {
  STRIPE_PROVIDER_KEY,
  STRIPE_DISPLAY_NAME,
  STRIPE_DESCRIPTION,
} from './stripe.constants';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';
import { PaymentProviderRegistry } from '../../registry/payment-provider.registry';
import {
  isConnectionProvider,
  isTransactionProvider,
  isCheckoutProvider,
  isRefundProvider,
  isWebhookProvider,
} from '../../interfaces/payment-provider.interface';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let stripe: StripePaymentProvider;

beforeEach(() => {
  stripe = new StripePaymentProvider();
});

// ─── Identity ─────────────────────────────────────────────────────────────────

describe('StripePaymentProvider — identity', () => {
  it('providerKey is "stripe"', () => {
    expect(stripe.providerKey).toBe('stripe');
    expect(stripe.providerKey).toBe(STRIPE_PROVIDER_KEY);
  });

  it('displayName is "Stripe"', () => {
    expect(stripe.displayName).toBe(STRIPE_DISPLAY_NAME);
  });

  it('description is non-empty', () => {
    expect(stripe.description).toBe(STRIPE_DESCRIPTION);
    expect(stripe.description.length).toBeGreaterThan(0);
  });
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

describe('StripePaymentProvider.getMetadata()', () => {
  it('returns the correct providerKey', () => {
    expect(stripe.getMetadata().providerKey).toBe('stripe');
  });

  it('returns connectionType "api_key"', () => {
    expect(stripe.getMetadata().connectionType).toBe('api_key');
  });

  it('returns metadata without any network call (pure synchronous)', () => {
    const meta = stripe.getMetadata();
    expect(meta).toBeDefined();
    expect(typeof meta.providerKey).toBe('string');
  });

  it('returned metadata contains no credential values', () => {
    const meta = stripe.getMetadata();
    // Reflect.get is used to access arbitrary keys without unsafe casts.
    expect(Reflect.get(meta, 'secretKey')).toBeUndefined();
    expect(Reflect.get(meta, 'publishableKey')).toBeUndefined();
    expect(Reflect.get(meta, 'webhookSecret')).toBeUndefined();
    expect(Reflect.get(meta, 'apiKey')).toBeUndefined();
  });
});

// ─── Capabilities ─────────────────────────────────────────────────────────────

describe('StripePaymentProvider.getCapabilities()', () => {
  it('returns the shared STRIPE_CAPABILITIES constant', () => {
    expect(stripe.getCapabilities()).toBe(STRIPE_CAPABILITIES);
  });

  it('Account capability is "available" — connection test implemented via GET /v1/account', () => {
    const { capabilities } = stripe.getCapabilities();
    expect(capabilities[PaymentCapability.Account]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('Balance capability is "available" — balance retrieval is implemented', () => {
    const { capabilities } = stripe.getCapabilities();
    expect(capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('PaymentMethods capability is "available" — payment method configuration is implemented', () => {
    const { capabilities } = stripe.getCapabilities();
    expect(capabilities[PaymentCapability.PaymentMethods]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('all remaining unimplemented capabilities remain "planned"', () => {
    const { capabilities } = stripe.getCapabilities();
    const stillPlanned: PaymentCapability[] = [
      PaymentCapability.OneTimePayments,
      PaymentCapability.RecurringPayments,
      PaymentCapability.Checkout,
      PaymentCapability.Disputes,
      PaymentCapability.PayoutCancellation,
      PaymentCapability.PayoutReversal,
      PaymentCapability.PayoutReconciliation,
      PaymentCapability.WebhookReplay,
      PaymentCapability.PaymentLinks,
    ];
    for (const cap of stillPlanned) {
      expect(capabilities[cap]).toBe(CapabilityStatus.Planned);
    }
  });

  it('does not declare removed business-domain capabilities', () => {
    const { capabilities } = stripe.getCapabilities();
    // Reflect.get is used to safely probe for keys removed from the enum.
    expect(Reflect.get(capabilities, 'customers')).toBeUndefined();
    expect(Reflect.get(capabilities, 'products')).toBeUndefined();
    expect(Reflect.get(capabilities, 'prices')).toBeUndefined();
    expect(Reflect.get(capabilities, 'subscriptions')).toBeUndefined();
    expect(Reflect.get(capabilities, 'invoices')).toBeUndefined();
  });
});

// ─── Capability interfaces ─────────────────────────────────────────────────────

describe('StripePaymentProvider — capability interfaces', () => {
  it('DOES implement IPaymentConnectionProvider — validateConnection is live', () => {
    expect(isConnectionProvider(stripe)).toBe(true);
    expect(typeof Reflect.get(stripe, 'validateConnection')).toBe('function');
  });

  it('supportsConnection is true', () => {
    expect(stripe.supportsConnection).toBe(true);
  });

  it('does NOT implement IPaymentTransactionProvider (no transaction operations yet)', () => {
    expect(isTransactionProvider(stripe)).toBe(false);
  });

  it('does NOT implement IPaymentCheckoutProvider (no checkout operations yet)', () => {
    expect(isCheckoutProvider(stripe)).toBe(false);
  });

  it('DOES implement IPaymentRefundProvider — refund operations are live', () => {
    expect(isRefundProvider(stripe)).toBe(true);
    expect(typeof Reflect.get(stripe, 'listRefunds')).toBe('function');
    expect(typeof Reflect.get(stripe, 'getRefund')).toBe('function');
    expect(typeof Reflect.get(stripe, 'createRefund')).toBe('function');
  });

  it('does NOT implement IPaymentWebhookProvider (no webhook operations yet)', () => {
    expect(isWebhookProvider(stripe)).toBe(false);
  });
});

// ─── Stripe SDK isolation ─────────────────────────────────────────────────────

describe('StripePaymentProvider — SDK isolation', () => {
  it('provider instance does not expose a Stripe SDK client object', () => {
    // The provider holds no Stripe client state — a new Stripe client is created
    // per validateConnection() call using the request-scoped decrypted API key.
    expect(Reflect.get(stripe, 'customers')).toBeUndefined();
    expect(Reflect.get(stripe, 'paymentIntents')).toBeUndefined();
    expect(Reflect.get(stripe, 'checkout')).toBeUndefined();
    expect(Reflect.get(stripe, 'subscriptions')).toBeUndefined();
    expect(Reflect.get(stripe, 'invoices')).toBeUndefined();
  });

  it('getCapabilities() returns only common Payments types — no Stripe SDK shapes', () => {
    const caps = stripe.getCapabilities();
    expect(Reflect.get(caps, 'currency_options')).toBeUndefined();
    expect(Reflect.get(caps, 'tax_code')).toBeUndefined();
    expect(Reflect.get(caps, 'stripe')).toBeUndefined();
  });

  it('getMetadata() contains no Stripe SDK types or secret values', () => {
    const meta = stripe.getMetadata();
    expect(Reflect.get(meta, 'secretKey')).toBeUndefined();
    expect(Reflect.get(meta, 'apiVersion')).toBeUndefined();
  });
});

// ─── Registry integration ─────────────────────────────────────────────────────

describe('StripePaymentProvider — registry participation', () => {
  it('can be registered in PaymentProviderRegistry without throwing', () => {
    expect(() => new PaymentProviderRegistry([stripe])).not.toThrow();
  });

  it('resolves from the registry by "stripe" key', () => {
    const registry = new PaymentProviderRegistry([stripe]);
    const resolved = registry.resolve('stripe');
    expect(resolved).toBe(stripe);
    expect(resolved.providerKey).toBe('stripe');
  });

  it('appears in registry.listAll()', () => {
    const registry = new PaymentProviderRegistry([stripe]);
    const list = registry.listAll();
    expect(list).toHaveLength(1);
    expect(list[0].providerKey).toBe('stripe');
  });
});
