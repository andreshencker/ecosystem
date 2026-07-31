// coingate.capabilities.spec.ts
//
// Verifies CoinGate capability declarations reflect the actual implementation.
// Updated to match Phase 1–3 implementation: orders, refunds, callbacks, gateway.

import { CoingatePaymentProvider } from './coingate.provider';
import { COINGATE_CAPABILITIES } from './coingate.capabilities';
import { STRIPE_CAPABILITIES } from '../stripe/stripe.capabilities';
import { PaymentCapability, CapabilityStatus } from '../../enums/payment.enums';

describe('CoinGate capabilities', () => {
  const provider = new CoingatePaymentProvider();

  // ── Provider identity ──────────────────────────────────────────────────────

  it('getCapabilities() returns COINGATE_CAPABILITIES', () => {
    expect(provider.getCapabilities()).toBe(COINGATE_CAPABILITIES);
  });

  it('providerKey is "coingate"', () => {
    expect(provider.providerKey).toBe('coingate');
  });

  it('connectionType in metadata is "token"', () => {
    expect(provider.getMetadata().connectionType).toBe('token');
  });

  // ── Page-level capabilities ────────────────────────────────────────────────

  describe('page-level capabilities reflect implementation', () => {
    it('dashboard is available (provider+connection metadata shown without API call)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Dashboard]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('gateway is available', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Gateway]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('payments is available (order list/detail implemented)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Payments]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('paymentTesting is available (sandbox order creation implemented)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.PaymentTesting]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('paymentMethods is unsupported (crypto assets ≠ configurable payment methods)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.PaymentMethods]).toBe(
        CapabilityStatus.Unsupported,
      );
    });

    it('refunds is available (list/detail/create implemented)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Refunds]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('payouts is planned (requires account feature activation)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Payouts]).toBe(
        CapabilityStatus.Planned,
      );
    });

    it('webhooks is available (callback delivery monitoring implemented)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Webhooks]).toBe(
        CapabilityStatus.Available,
      );
    });

    it('webhookEndpointListing is unsupported (CoinGate uses per-order callback URLs)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.WebhookEndpointListing]).toBe(
        CapabilityStatus.Unsupported,
      );
    });

    it('balance is unsupported (no authoritative balance endpoint in CoinGate API)', () => {
      expect(COINGATE_CAPABILITIES.capabilities[PaymentCapability.Balance]).toBe(
        CapabilityStatus.Unsupported,
      );
    });
  });

  // ── Synchronous methods return static data without network calls ───────────

  it('getGatewayGuide() is synchronous and returns static data', () => {
    const guide = provider.getGatewayGuide();
    expect(guide.providerKey).toBe('coingate');
    expect(guide.displayName).toBe('CoinGate');
  });

  it('getCapabilities() is synchronous — no Promise returned', () => {
    const result = provider.getCapabilities();
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.capabilities).toBeDefined();
  });

  it('getMetadata() is synchronous — no Promise returned', () => {
    const result = provider.getMetadata();
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.providerKey).toBe('coingate');
  });

  it('getSupportedTestScenarios() is synchronous — no Promise returned', () => {
    const result = provider.getSupportedTestScenarios('crypto');
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result)).toBe(true);
  });

  // ── No credential exposure ─────────────────────────────────────────────────

  it('getCapabilities response contains no credential fields', () => {
    const json = JSON.stringify(provider.getCapabilities());
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('password');
  });

  it('getMetadata response contains no credential fields', () => {
    const json = JSON.stringify(provider.getMetadata());
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('password');
  });

  // ── Interface conformance ──────────────────────────────────────────────────

  it('implements IPaymentProvider interface', () => {
    expect(typeof provider.providerKey).toBe('string');
    expect(typeof provider.displayName).toBe('string');
    expect(typeof provider.getCapabilities).toBe('function');
    expect(typeof provider.getMetadata).toBe('function');
  });

  it('supportsConnection: implements IPaymentConnectionProvider', () => {
    expect(provider.supportsConnection).toBe(true);
    expect(typeof provider.validateConnection).toBe('function');
  });

  it('supportsPaymentListing: implements IPaymentListProvider', () => {
    expect(provider.supportsPaymentListing).toBe(true);
    expect(typeof provider.listPayments).toBe('function');
    expect(typeof provider.getPayment).toBe('function');
  });

  it('supportsRefundListing: implements IPaymentRefundProvider', () => {
    expect(provider.supportsRefundListing).toBe(true);
    expect(typeof provider.listRefunds).toBe('function');
    expect(typeof provider.getRefund).toBe('function');
    expect(typeof provider.createRefund).toBe('function');
  });

  it('supportsGatewayGuide: implements IGatewayGuideProvider', () => {
    expect(provider.supportsGatewayGuide).toBe(true);
    expect(typeof provider.getGatewayGuide).toBe('function');
  });

  it('supportsPaymentTesting: implements IPaymentTestingProvider', () => {
    expect(provider.supportsPaymentTesting).toBe(true);
    expect(typeof provider.getSupportedTestScenarios).toBe('function');
    expect(typeof provider.createPaymentTest).toBe('function');
  });
});

// ── Stripe capabilities accuracy (unchanged) ──────────────────────────────────

describe('Stripe capabilities accuracy', () => {
  it('page-level capabilities match implementation reality', () => {
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Dashboard]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Payments]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.PaymentTesting]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Gateway]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.PaymentMethods]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Refunds]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Payouts]).toBe(CapabilityStatus.Available);
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.Webhooks]).toBe(CapabilityStatus.Available);
  });

  it('OneTimePayments is still planned (payment session creation not yet implemented)', () => {
    expect(STRIPE_CAPABILITIES.capabilities[PaymentCapability.OneTimePayments]).toBe(CapabilityStatus.Planned);
  });
});
