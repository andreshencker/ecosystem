// src/payments/payments-infrastructure.spec.ts
//
// Focused unit tests for the Payments common infrastructure.
// No real provider API calls. No real database. No real credentials.

import { Types } from 'mongoose';

import { PaymentProviderRegistry } from './registry/payment-provider.registry';
import {
  DuplicateProviderRegistrationError,
  PaymentProviderNotFoundError,
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
} from './errors/payment.errors';
import { PaymentErrorCode } from './errors/payment-error-codes';
import type { IPaymentProvider } from './interfaces/payment-provider.interface';
import { PaymentCapability, CapabilityStatus } from './enums/payment.enums';
import { PaymentAccountStatus } from './enums/payment-account-status.enum';
import { PaymentMethodType } from './enums/payment-method-type.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentSessionStatus } from './enums/payment-session-status.enum';
import {
  PaymentRefundStatus,
  PaymentRefundReason,
} from './enums/payment-refund-status.enum';
import {
  PaymentPayoutStatus,
  PayoutDestinationType,
} from './enums/payment-payout-status.enum';
import type { PaymentMoney } from './types/payment.types';
import type { PaymentAccount } from './contracts/payment-account.contract';
import type { PaymentBalance } from './contracts/payment-balance.contract';
import type { Payment } from './contracts/payment.contract';
import type { PaymentRefund } from './contracts/payment-refund.contract';
import type { PaymentWebhookEvent } from './contracts/payment-webhook-event.contract';
import { PaymentsService } from './services/payments.service';
import { PaymentsResolverService } from './services/payments-resolver.service';
import { StripePaymentProvider } from './providers/stripe/stripe.provider';
import { PaymentProviderKey } from './providers/payment-provider.tokens';

// ─── Shared test doubles ──────────────────────────────────────────────────────

function makeProvider(
  key: string,
  capabilityStatus: CapabilityStatus = CapabilityStatus.Planned,
): IPaymentProvider {
  return {
    providerKey: key,
    displayName: `${key} Test Provider`,
    description: `Test double for ${key}`,
    getCapabilities: () => ({
      capabilities: Object.fromEntries(
        Object.values(PaymentCapability).map((cap) => [cap, capabilityStatus]),
      ) as Partial<Record<PaymentCapability, CapabilityStatus>>,
    }),
    getMetadata: () => ({
      providerKey: key,
      displayName: `${key} Test Provider`,
      description: `Test double for ${key}`,
      connectionType: 'api_key',
    }),
  };
}

const stripeDouble = makeProvider('stripe');
const paypalDouble = makeProvider('paypal');

// ─── Test 1: Registry resolves Stripe ─────────────────────────────────────────

describe('PaymentProviderRegistry — resolve', () => {
  it('resolves a registered provider by providerKey', () => {
    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolved = registry.resolve('stripe');
    expect(resolved.providerKey).toBe('stripe');
    expect(resolved).toBe(stripeDouble);
  });

  it('resolves "stripe" using the canonical PaymentProviderKey constant', () => {
    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolved = registry.resolve(PaymentProviderKey.Stripe);
    expect(resolved.providerKey).toBe(PaymentProviderKey.Stripe);
  });

  it('resolves multiple registered providers independently', () => {
    const registry = new PaymentProviderRegistry([stripeDouble, paypalDouble]);
    expect(registry.resolve('stripe')).toBe(stripeDouble);
    expect(registry.resolve('paypal')).toBe(paypalDouble);
    expect(registry.size).toBe(2);
  });
});

// ─── Test 2: Registry rejects unknown providers ────────────────────────────────

describe('PaymentProviderRegistry — unknown provider', () => {
  it('throws PaymentProviderNotFoundError for an unregistered providerKey', () => {
    const registry = new PaymentProviderRegistry([stripeDouble]);
    expect(() => registry.resolve('adyen')).toThrow(
      PaymentProviderNotFoundError,
    );
  });

  it('error message includes the unknown providerKey', () => {
    const registry = new PaymentProviderRegistry([stripeDouble]);
    expect(() => registry.resolve('unknown-provider')).toThrow(
      'unknown-provider',
    );
  });

  it('is case-sensitive — "Stripe" does not resolve "stripe"', () => {
    const registry = new PaymentProviderRegistry([stripeDouble]);
    expect(() => registry.resolve('Stripe')).toThrow(
      PaymentProviderNotFoundError,
    );
  });
});

// ─── Test 3: Registry prevents duplicate registration ─────────────────────────

describe('PaymentProviderRegistry — duplicate registration', () => {
  it('throws DuplicateProviderRegistrationError for duplicate providerKey', () => {
    const duplicate = makeProvider('stripe');
    expect(
      () => new PaymentProviderRegistry([stripeDouble, duplicate]),
    ).toThrow(DuplicateProviderRegistrationError);
  });

  it('error message includes the duplicate providerKey', () => {
    const duplicate = makeProvider('stripe');
    expect(
      () => new PaymentProviderRegistry([stripeDouble, duplicate]),
    ).toThrow('stripe');
  });

  it('empty registry construction does not throw', () => {
    expect(() => new PaymentProviderRegistry([])).not.toThrow();
  });
});

// ─── Test 4: Runtime resolution rejects another company's credentials ──────────

describe('PaymentsResolverService — company isolation', () => {
  it('throws when ChannelsRuntimeResolverService detects a companyId mismatch', async () => {
    // The existing ChannelsRuntimeResolverService throws HttpException(404)
    // when the credential's companyId does not match the JWT companyId.
    // We mock it to simulate that behaviour.
    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest
        .fn()
        .mockRejectedValueOnce(
          new Error('Provider credential does not belong to this company'),
        ),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);

    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    await expect(
      resolver.resolveByCredentialId('company-A', 'some-credential-id'),
    ).rejects.toThrow('does not belong to this company');
  });

  it('resolver forwards companyId to the runtime resolver unchanged', async () => {
    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest
        .fn()
        .mockRejectedValueOnce(new Error('sentinel')),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    await resolver
      .resolveByCredentialId('target-company-id', 'cred-abc')
      .catch(() => {});

    expect(
      mockRuntimeResolver.resolveByProviderCredentialsId,
    ).toHaveBeenCalledWith({
      companyId: 'target-company-id',
      providerCredentialsId: 'cred-abc',
    });
  });
});

// ─── Test 5: Runtime resolution rejects non-payment-channel credentials ────────

describe('PaymentsResolverService — channel guard', () => {
  it('throws PaymentCredentialChannelMismatchError when channelKey is not "payment"', async () => {
    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest.fn().mockResolvedValueOnce({
        channelKey: 'calendar', // wrong channel
        channelId: 'channel-calendar-id',
        providerKey: 'google_calendar',
        providerId: null,
        connectionType: 'oauth',
        companyChannelProviderId: 'ccp-calendar-id',
        providerCredentialsId: 'cred-xyz',
        tag: 'default',
        isActive: true,
        credentialsIsActive: true,
        credentials: { clientId: 'gc-client', clientSecret: 'REDACTED' },
      }),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    await expect(
      resolver.resolveByCredentialId('company-A', 'calendar-credential-id'),
    ).rejects.toThrow(PaymentCredentialChannelMismatchError);
  });

  it('error message identifies the mismatched credential and expected channel', async () => {
    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest.fn().mockResolvedValueOnce({
        channelKey: 'email',
        channelId: 'channel-email-id',
        providerKey: 'gmail',
        providerId: null,
        connectionType: 'smtp',
        companyChannelProviderId: 'ccp-email-id',
        providerCredentialsId: 'email-cred-id',
        tag: 'default',
        isActive: true,
        credentialsIsActive: true,
        credentials: { user: 'x', pass: 'REDACTED' },
      }),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    await expect(
      resolver.resolveByCredentialId('company-A', 'email-cred-id'),
    ).rejects.toThrow('payment');
  });

  it('succeeds when channelKey is "payment" and providerKey is registered', async () => {
    const decryptedCreds = {
      secretKey: 'sk_test_mock',
      publishableKey: 'pk_test_mock',
      mode: 'test',
    };

    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest.fn().mockResolvedValueOnce({
        channelKey: 'payment',
        channelId: 'channel-payment-id',
        providerKey: 'stripe',
        providerId: new Types.ObjectId().toString(),
        connectionType: 'api_key',
        companyChannelProviderId: 'ccp-payment-stripe-id',
        providerCredentialsId: 'stripe-cred-id',
        tag: 'default',
        isActive: true,
        credentialsIsActive: true,
        credentials: decryptedCreds,
      }),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    const { adapter, context } = await resolver.resolveByCredentialId(
      'company-A',
      'stripe-cred-id',
    );

    expect(adapter.providerKey).toBe('stripe');
    expect(context.providerKey).toBe('stripe');
    expect(context.credentialsId).toBe('stripe-cred-id');
  });
});

// ─── Test 6: Runtime resolution does not leak encrypted credential values ──────

describe('PaymentsResolverService — credential security', () => {
  it('credentials in context are the decrypted values, not the encrypted blob', async () => {
    const decryptedPayload = {
      secretKey: 'sk_test_decrypted_value',
      publishableKey: 'pk_test_decrypted',
      mode: 'test',
    };

    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest.fn().mockResolvedValueOnce({
        channelKey: 'payment',
        channelId: 'channel-payment-id',
        providerKey: 'stripe',
        providerId: null,
        connectionType: 'api_key',
        companyChannelProviderId: 'ccp-payment-id',
        providerCredentialsId: 'cred-123',
        tag: 'default',
        isActive: true,
        credentialsIsActive: true,
        credentials: decryptedPayload,
      }),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    const { context } = await resolver.resolveByCredentialId(
      'company-A',
      'cred-123',
    );

    // The context credentials must be the decrypted object — not the AES blob.
    expect(context.credentials).not.toHaveProperty('alg');
    expect(context.credentials).not.toHaveProperty('ivBase64');
    expect(context.credentials).not.toHaveProperty('tagBase64');
    expect(context.credentials).not.toHaveProperty('dataBase64');

    // And the decrypted values must be present.
    expect(context.credentials).toHaveProperty('secretKey');
    expect(context.credentials['secretKey']).toBe('sk_test_decrypted_value');
  });

  it('resolver never logs the secretKey (no credential leak in logger calls)', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockRuntimeResolver = {
      resolveByProviderCredentialsId: jest.fn().mockResolvedValueOnce({
        channelKey: 'payment',
        channelId: 'channel-payment-id',
        providerKey: 'stripe',
        providerId: null,
        connectionType: 'api_key',
        companyChannelProviderId: 'ccp-payment-id',
        providerCredentialsId: 'cred-123',
        tag: 'default',
        isActive: true,
        credentialsIsActive: true,
        credentials: {
          secretKey: 'sk_test_SUPER_SECRET',
          publishableKey: 'pk_test_x',
          mode: 'test',
        },
      }),
    };

    const registry = new PaymentProviderRegistry([stripeDouble]);
    const resolver = new PaymentsResolverService(
      mockRuntimeResolver as any,
      registry,
    );

    await resolver.resolveByCredentialId('company-A', 'cred-123');

    const allLogs = logSpy.mock.calls.flat().join(' ');
    expect(allLogs).not.toContain('sk_test_SUPER_SECRET');

    logSpy.mockRestore();
  });
});

// ─── Test 7: Unsupported capabilities produce canonical error ─────────────────

describe('PaymentsService — assertCapability', () => {
  function makePaymentsService(provider: IPaymentProvider): PaymentsService {
    const registry = new PaymentProviderRegistry([provider]);

    // Minimal resolver mock for PaymentsService constructor
    const resolverMock = {
      resolveByCredentialId: jest.fn(),
      resolveForCompany: jest.fn(),
    } as unknown as PaymentsResolverService;

    return new PaymentsService(registry, resolverMock);
  }

  it('throws PaymentCapabilityNotSupportedError when capability is "planned"', () => {
    const provider = makeProvider('stripe', CapabilityStatus.Planned);
    const service = makePaymentsService(provider);

    expect(() =>
      service.assertCapability(provider, PaymentCapability.Refunds),
    ).toThrow(PaymentCapabilityNotSupportedError);
  });

  it('throws PaymentCapabilityNotSupportedError when capability is "unsupported"', () => {
    const provider = makeProvider('paypal', CapabilityStatus.Unsupported);
    const service = makePaymentsService(provider);

    expect(() =>
      service.assertCapability(provider, PaymentCapability.Payouts),
    ).toThrow(PaymentCapabilityNotSupportedError);
  });

  it('throws when the capability is absent from the provider declaration', () => {
    const providerWithNoCapabilities: IPaymentProvider = {
      providerKey: 'minimal',
      displayName: 'Minimal',
      description: 'No capabilities',
      getCapabilities: () => ({ capabilities: {} }),
      getMetadata: () => ({
        providerKey: 'minimal',
        displayName: 'Minimal',
        description: '',
        connectionType: 'api_key',
      }),
    };
    const service = makePaymentsService(providerWithNoCapabilities);

    expect(() =>
      service.assertCapability(
        providerWithNoCapabilities,
        PaymentCapability.Checkout,
      ),
    ).toThrow(PaymentCapabilityNotSupportedError);
  });

  it('does NOT throw when the capability is "available"', () => {
    const provider = makeProvider('stripe', CapabilityStatus.Available);
    const service = makePaymentsService(provider);

    expect(() =>
      service.assertCapability(provider, PaymentCapability.Account),
    ).not.toThrow();
  });

  it('error message names both provider and capability', () => {
    const provider = makeProvider('stripe', CapabilityStatus.Planned);
    const service = makePaymentsService(provider);

    expect(() =>
      service.assertCapability(provider, PaymentCapability.Disputes),
    ).toThrow('stripe');
  });
});

// ─── Test 8: Monetary contracts use integer minor units ───────────────────────

describe('PaymentMoney — monetary contract', () => {
  it('accepts integer amountMinor values correctly', () => {
    const amount: PaymentMoney = { amountMinor: 5000, currency: 'aud' };
    expect(amount.amountMinor).toBe(5000);
    expect(Number.isInteger(amount.amountMinor)).toBe(true);
  });

  it('represents AUD 50.00 as { amountMinor: 5000, currency: "aud" }', () => {
    const aud50: PaymentMoney = { amountMinor: 5000, currency: 'aud' };
    expect(aud50.amountMinor).toBe(5000);
    expect(aud50.currency).toBe('aud');
  });

  it('represents JPY 5000 as { amountMinor: 5000, currency: "jpy" } (zero decimal places)', () => {
    const jpy5000: PaymentMoney = { amountMinor: 5000, currency: 'jpy' };
    expect(jpy5000.amountMinor).toBe(5000);
    expect(jpy5000.currency).toBe('jpy');
  });

  it('contract does not include a floating-point "amount" field', () => {
    const amount: PaymentMoney = { amountMinor: 1250, currency: 'usd' };
    expect(amount).not.toHaveProperty('amount');
    expect(amount).not.toHaveProperty('amountFloat');
    expect(amount).not.toHaveProperty('amountDecimal');
  });

  it('canonical Payment contract uses PaymentMoney for its amount', () => {
    const payment: Payment = {
      id: 'pay_test',
      accountId: 'cred_test',
      status: PaymentStatus.Succeeded,
      amount: { amountMinor: 9900, currency: 'usd' },
      captureMethod: 'automatic',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(Number.isInteger(payment.amount.amountMinor)).toBe(true);
    expect(payment.amount).not.toHaveProperty('amount');
  });

  it('canonical PaymentBalance uses integer minor units in each line', () => {
    const balance: PaymentBalance = {
      accountId: 'cred_test',
      available: [{ amountMinor: 10000, currency: 'aud', sourceType: 'card' }],
      pending: [
        { amountMinor: 2500, currency: 'aud', sourceType: 'bank_transfer' },
      ],
      reserved: [],
      retrievedAt: new Date(),
    };
    expect(Number.isInteger(balance.available[0].amountMinor)).toBe(true);
    expect(Number.isInteger(balance.pending[0].amountMinor)).toBe(true);
  });
});

// ─── Test 9: Stripe SDK types do not appear in shared contracts ───────────────

describe('Canonical contracts — Stripe isolation', () => {
  it('PaymentAccount contract has no Stripe-specific fields', () => {
    const account: PaymentAccount = {
      id: 'cred_123',
      providerKey: 'stripe',
      environment: 'test',
      displayName: 'Acme Corp',
      country: 'AU',
      defaultCurrency: 'aud',
      status: PaymentAccountStatus.Active,
      capabilities: [],
      connectedAt: new Date(),
      verifiedAt: null,
    };

    // Stripe-specific fields must not exist on the canonical type
    expect(account).not.toHaveProperty('charges_enabled');
    expect(account).not.toHaveProperty('payouts_enabled');
    expect(account).not.toHaveProperty('business_type');
    expect(account).not.toHaveProperty('object'); // Stripe always returns object:'account'
    expect(account).not.toHaveProperty('tos_acceptance');
    expect(account).not.toHaveProperty('type'); // Stripe account type (custom/express/standard)
  });

  it('Payment contract has no Stripe-specific fields', () => {
    const payment: Payment = {
      id: 'pay_graphify_123',
      accountId: 'cred_456',
      status: PaymentStatus.Succeeded,
      amount: { amountMinor: 5000, currency: 'aud' },
      captureMethod: 'automatic',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Stripe PaymentIntent fields must not appear
    expect(payment).not.toHaveProperty('payment_intent');
    expect(payment).not.toHaveProperty('payment_method_options');
    expect(payment).not.toHaveProperty('confirmation_method');
    expect(payment).not.toHaveProperty('client_secret');
    expect(payment).not.toHaveProperty('livemode');
    expect(payment).not.toHaveProperty('charges');
    expect(payment).not.toHaveProperty('object');
  });

  it('PaymentRefund contract has no Stripe-specific fields', () => {
    const refund: PaymentRefund = {
      id: 'refund_graphify_123',
      paymentId: 'pay_graphify_456',
      accountId: 'cred_789',
      status: PaymentRefundStatus.Succeeded,
      amount: { amountMinor: 2500, currency: 'aud' },
      reason: PaymentRefundReason.RequestedByCustomer,
      createdAt: new Date(),
    };

    expect(refund).not.toHaveProperty('charge');
    expect(refund).not.toHaveProperty('payment_intent');
    expect(refund).not.toHaveProperty('object');
    expect(refund).not.toHaveProperty('metadata'); // Stripe metadata = flat string dict
  });

  it('PaymentWebhookEvent contract has no raw Stripe event payload', () => {
    const event: PaymentWebhookEvent = {
      id: 'evt_graphify_001',
      accountId: 'cred_123',
      providerKey: 'stripe',
      eventType: 'payment.succeeded',
      resourceType: 'payment',
      resourceId: 'pay_graphify_001',
      data: { status: 'succeeded', amountMinor: 5000, currency: 'aud' },
      occurredAt: new Date(),
      receivedAt: new Date(),
      providerEventId: 'evt_stripe_original_id',
    };

    // The event envelope itself must not carry Stripe-specific event structure
    expect(event).not.toHaveProperty('type'); // Stripe event.type
    expect(event).not.toHaveProperty('livemode'); // Stripe event.livemode
    expect(event).not.toHaveProperty('api_version'); // Stripe event.api_version
    expect(event).not.toHaveProperty('pending_webhooks'); // Stripe internal field

    // data must not contain Stripe SDK object shapes
    const data = event.data;
    expect(data).not.toHaveProperty('payment_intent');
    expect(data).not.toHaveProperty('payment_method_options');
    expect(data).not.toHaveProperty('client_secret');
  });

  it('StripePaymentProvider does not expose Stripe SDK types through IPaymentProvider', () => {
    const provider = new StripePaymentProvider();

    // getMetadata() must return only canonical PaymentProviderMetadata
    const meta = provider.getMetadata();
    expect(meta).not.toHaveProperty('apiVersion');
    expect(meta).not.toHaveProperty('stripeAccount');
    expect(meta).not.toHaveProperty('charges_enabled');

    // getCapabilities() must return only canonical PaymentProviderCapabilities
    const caps = provider.getCapabilities();
    expect(caps).not.toHaveProperty('stripe');
    expect(caps).not.toHaveProperty('tax_code');
    expect(caps).not.toHaveProperty('currency_options');

    // The instance itself must not expose a Stripe SDK client
    expect(Reflect.get(provider, 'customers')).toBeUndefined();
    expect(Reflect.get(provider, 'paymentIntents')).toBeUndefined();
    expect(Reflect.get(provider, 'checkout')).toBeUndefined();
  });
});

// ─── Test 10: PaymentsModule compiles with no live Stripe credentials ──────────

describe('StripePaymentProvider — no live credentials required', () => {
  it('can be instantiated without constructor arguments', () => {
    expect(() => new StripePaymentProvider()).not.toThrow();
  });

  it('does not hold a Stripe client in its instance state', () => {
    const provider = new StripePaymentProvider();
    // Stripe client is created per validateConnection() call, not at construction.
    expect(Reflect.get(provider, '_stripeClient')).toBeUndefined();
    expect(Reflect.get(provider, 'stripe')).toBeUndefined();
    expect(Reflect.get(provider, 'client')).toBeUndefined();
  });

  it('returns metadata without any network call', () => {
    const provider = new StripePaymentProvider();
    const meta = provider.getMetadata();
    expect(meta.providerKey).toBe('stripe');
    expect(meta.connectionType).toBe('api_key');
  });

  it('returns capabilities without any network call', () => {
    const provider = new StripePaymentProvider();
    const caps = provider.getCapabilities();
    expect(caps.capabilities).toBeDefined();
    expect(typeof caps.capabilities).toBe('object');
  });
});

// ─── Test bonus: Error codes are stable string constants ───────────────────────

describe('PaymentErrorCode — canonical error codes', () => {
  it('all error codes are non-empty strings', () => {
    for (const code of Object.values(PaymentErrorCode)) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('all error codes use the PAYMENT_ prefix', () => {
    for (const code of Object.values(PaymentErrorCode)) {
      expect(code).toMatch(/^PAYMENT_/);
    }
  });

  it('includes all required canonical codes', () => {
    expect(PaymentErrorCode.PAYMENT_ACCOUNT_NOT_FOUND).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_ACCOUNT_ACCESS_DENIED).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_PROVIDER_NOT_FOUND).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_CREDENTIALS_INVALID).toBeDefined();
    expect(
      PaymentErrorCode.PAYMENT_CREDENTIALS_DECRYPTION_FAILED,
    ).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_CAPABILITY_NOT_SUPPORTED).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_PROVIDER_UNAVAILABLE).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_CONFIGURATION_INVALID).toBeDefined();
    expect(PaymentErrorCode.PAYMENT_OPERATION_NOT_IMPLEMENTED).toBeDefined();
  });
});

// ─── Enum completeness ─────────────────────────────────────────────────────────

describe('Domain enums — completeness', () => {
  it('PaymentStatus includes all canonical lifecycle states', () => {
    const required = [
      'pending',
      'processing',
      'requires_action',
      'authorised',
      'partially_captured',
      'succeeded',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded',
      'disputed',
    ];
    const actual = Object.values(PaymentStatus) as string[];
    for (const s of required) {
      expect(actual).toContain(s);
    }
  });

  it('PaymentMethodType includes all canonical method types', () => {
    const required = [
      'card',
      'bank_transfer',
      'wallet',
      'buy_now_pay_later',
      'voucher',
      'direct_debit',
      'crypto',
      'other',
    ];
    const actual = Object.values(PaymentMethodType) as string[];
    for (const t of required) {
      expect(actual).toContain(t);
    }
  });

  it('PaymentAccountStatus has all lifecycle states', () => {
    expect(Object.values(PaymentAccountStatus)).toContain('active');
    expect(Object.values(PaymentAccountStatus)).toContain('restricted');
    expect(Object.values(PaymentAccountStatus)).toContain('pending');
    expect(Object.values(PaymentAccountStatus)).toContain('disconnected');
  });

  it('PaymentRefundReason has all canonical reasons', () => {
    expect(Object.values(PaymentRefundReason)).toContain('duplicate');
    expect(Object.values(PaymentRefundReason)).toContain('fraudulent');
    expect(Object.values(PaymentRefundReason)).toContain(
      'requested_by_customer',
    );
    expect(Object.values(PaymentRefundReason)).toContain('other');
  });

  it('PaymentSessionStatus has all session states', () => {
    expect(Object.values(PaymentSessionStatus)).toContain('created');
    expect(Object.values(PaymentSessionStatus)).toContain('active');
    expect(Object.values(PaymentSessionStatus)).toContain('completed');
    expect(Object.values(PaymentSessionStatus)).toContain('expired');
    expect(Object.values(PaymentSessionStatus)).toContain('cancelled');
  });

  it('PaymentPayoutStatus and PayoutDestinationType are defined', () => {
    expect(Object.values(PaymentPayoutStatus)).toContain('paid');
    expect(Object.values(PaymentPayoutStatus)).toContain('failed');
    expect(Object.values(PayoutDestinationType)).toContain('bank_account');
    expect(Object.values(PayoutDestinationType)).toContain('debit_card');
  });
});
