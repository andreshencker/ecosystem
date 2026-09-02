// src/payments/tests/payments-testing-page-definition.service.spec.ts
//
// Focused unit tests for PaymentsTestingPageDefinitionService.
// All dependencies (PaymentsService, provider adapters) are fully mocked.

import { Types } from 'mongoose';
import { PaymentsTestingPageDefinitionService } from '../services/payments-testing-page-definition.service';
import { PaymentsService } from '../services/payments.service';
import { CapabilityStatus, PaymentCapability } from '../enums/payment.enums';
import {
  PaymentProviderNotFoundError,
  PaymentProviderCredentialsUnavailableError,
} from '../errors/payment.errors';
import type { PaymentTestingPageDefinition } from '../contracts/payment-testing-page-definition.contract';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_A = new Types.ObjectId().toHexString();
const COMPANY_B = new Types.ObjectId().toHexString();
const CONNECTION_ID = new Types.ObjectId().toHexString();

function baseCapabilities(
  overrides: Partial<Record<string, CapabilityStatus>> = {},
) {
  return {
    [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
    [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,
    ...overrides,
  };
}

function makeProvider(
  overrides: Partial<
    IPaymentProvider & {
      supportsPaymentTestingPageDefinition?: true;
      getPaymentTestingPageDefinition?: jest.Mock;
    }
  > = {},
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe',
    getCapabilities: jest
      .fn()
      .mockReturnValue({ capabilities: baseCapabilities() }),
    getMetadata: jest.fn().mockReturnValue({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: '',
      connectionType: 'api_key',
    }),
    ...overrides,
  };
}

function makeRuntime(
  provider: ReturnType<typeof makeProvider>,
  credentials: Record<string, unknown> = {
    secretKey: 'sk_test_x',
    mode: 'test',
  },
): PaymentProviderRuntimeContext {
  return {
    accountId: CONNECTION_ID,
    companyId: COMPANY_A,
    providerKey: provider.providerKey,
    environment: null,
    provider: provider as unknown as IPaymentProvider,
    credentials,
  };
}

function makePaymentsService(
  runtime: PaymentProviderRuntimeContext,
): jest.Mocked<Pick<PaymentsService, 'resolveRuntime' | 'assertCapability'>> {
  return {
    resolveRuntime: jest.fn().mockResolvedValue(runtime),
    assertCapability: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<PaymentsService, 'resolveRuntime' | 'assertCapability'>
  >;
}

function makeStripeDefinition(): PaymentTestingPageDefinition {
  return {
    providerKey: 'stripe',
    connectionId: CONNECTION_ID,
    environment: 'test',
    version: '1.0',
    capabilities: {},
    form: {
      supported: true,
      title: 'Run a payment test',
      submitLabel: 'Run payment test',
      fields: [
        {
          key: 'paymentMethodKey',
          label: 'Payment Method',
          type: 'select',
          required: true,
          optionsSource: 'provider',
        },
        {
          key: 'scenario',
          label: 'Scenario',
          type: 'scenario',
          required: true,
          optionsSource: 'test_scenarios',
        },
        {
          key: 'amount',
          label: 'Amount',
          type: 'amount',
          required: true,
          defaultValue: 10,
        },
        {
          key: 'currency',
          label: 'Currency',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
        },
      ],
    },
    result: {
      presentationType: 'none',
      successTitle: 'Test completed',
    },
    instructions: ['All Stripe test payments use test card numbers.'],
  };
}

function makeCoinGateDefinition(): PaymentTestingPageDefinition {
  return {
    providerKey: 'coingate',
    connectionId: CONNECTION_ID,
    environment: 'test',
    version: '1.0',
    capabilities: {},
    form: {
      supported: true,
      title: 'Create a sandbox payment',
      submitLabel: 'Create sandbox payment',
      fields: [
        {
          key: 'amount',
          label: 'Amount',
          type: 'amount',
          required: true,
          defaultValue: 10,
        },
        {
          key: 'price_currency',
          label: 'Price Currency',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
        },
        {
          key: 'description',
          label: 'Description (optional)',
          type: 'text',
          required: false,
        },
      ],
    },
    result: {
      presentationType: 'redirect',
      successTitle: 'Sandbox order created',
    },
    instructions: [
      'CoinGate sandbox orders are created in the CoinGate test environment.',
    ],
    limitations: ['CoinGate supports only a single test flow.'],
  };
}

// ─── Test 1: Company ownership validation ─────────────────────────────────────

describe('Test 1: Company ownership validation', () => {
  it('resolveRuntime is called with the authenticated companyId', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    await service.getTestingPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(svc.resolveRuntime).toHaveBeenCalledWith(COMPANY_A, CONNECTION_ID);
  });

  it('another company cannot access the definition — resolveRuntime enforces isolation', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(
          new PaymentProviderCredentialsUnavailableError('stripe'),
        ),
      assertCapability: jest.fn(),
    };

    const service = new PaymentsTestingPageDefinitionService(svc as never);

    await expect(
      service.getTestingPageDefinition(COMPANY_B, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderCredentialsUnavailableError);
  });
});

// ─── Test 2: Active connection validation ─────────────────────────────────────

describe('Test 2: Active connection validation', () => {
  it('throws when resolveRuntime signals the credential is unavailable', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(
          new PaymentProviderCredentialsUnavailableError('stripe'),
        ),
      assertCapability: jest.fn(),
    };
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    await expect(
      service.getTestingPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderCredentialsUnavailableError);
  });

  it('throws when the provider is not registered', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(new PaymentProviderNotFoundError('unknown')),
      assertCapability: jest.fn(),
    };
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    await expect(
      service.getTestingPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderNotFoundError);
  });
});

// ─── Test 3: Provider adapter resolution ──────────────────────────────────────

describe('Test 3: Provider adapter resolution', () => {
  it('uses the provider returned by resolveRuntime', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.providerKey).toBe('stripe');
    expect(provider.getCapabilities).toHaveBeenCalled();
  });
});

// ─── Test 4: Environment detection ───────────────────────────────────────────

describe('Test 4: Environment detection', () => {
  it('detects test environment from secretKey prefix (Stripe sk_test_)', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider, { secretKey: 'sk_test_abc123' });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('test');
  });

  it('detects live environment from secretKey prefix (Stripe sk_live_)', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider, { secretKey: 'sk_live_abc123' });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('live');
  });

  it('detects test environment from mode field (CoinGate mode: test)', async () => {
    const provider = makeProvider({ providerKey: 'coingate' });
    const runtime = makeRuntime(provider, {
      token: 'cg-sandbox-token',
      mode: 'test',
    });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('test');
  });

  it('detects live environment from mode field (CoinGate mode: live)', async () => {
    const provider = makeProvider({ providerKey: 'coingate' });
    const runtime = makeRuntime(provider, {
      token: 'cg-live-token',
      mode: 'live',
    });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('live');
  });

  it('mode field takes precedence over secretKey prefix when both are present', async () => {
    // If mode='test' is explicitly set, it should win over secretKey prefix
    const provider = makeProvider();
    const runtime = makeRuntime(provider, {
      secretKey: 'sk_live_xyz',
      mode: 'test',
    });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('test');
  });

  it('returns unknown environment when neither mode nor secretKey resolves', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider, { someOtherField: 'value' });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.environment).toBe('unknown');
  });
});

// ─── Test 5: Generic default definition ──────────────────────────────────────

describe('Test 5: Generic default definition', () => {
  it('uses the generic default when provider has no custom testing definition', async () => {
    const provider = makeProvider(); // no supportsPaymentTestingPageDefinition
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.fields.some((f) => f.type === 'amount')).toBe(true);
    expect(result.form.fields.some((f) => f.type === 'scenario')).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('generic default providerKey matches the runtime providerKey', async () => {
    const provider = makeProvider({ providerKey: 'some-future-provider' });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.providerKey).toBe('some-future-provider');
  });

  it('generic default form.supported is true', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.supported).toBe(true);
  });

  it('generic default form includes amount field', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    const amountField = result.form.fields.find((f) => f.key === 'amount');
    expect(amountField).toBeDefined();
    expect(amountField?.type).toBe('amount');
    expect(amountField?.required).toBe(true);
  });
});

// ─── Test 6: Stripe definition ────────────────────────────────────────────────

describe('Test 6: Stripe definition', () => {
  function makeStripeProvider() {
    const prov = makeProvider({
      providerKey: 'stripe',
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities(),
      }),
    });
    const defn = makeStripeDefinition();
    (prov as any).supportsPaymentTestingPageDefinition = true;
    (prov as any).getPaymentTestingPageDefinition = jest
      .fn()
      .mockResolvedValue(defn);
    return prov;
  }

  it('calls provider.getPaymentTestingPageDefinition when supportsPaymentTestingPageDefinition is true', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    await service.getTestingPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      (provider as any).getPaymentTestingPageDefinition,
    ).toHaveBeenCalledTimes(1);
  });

  it('Stripe definition includes scenario field', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.fields.some((f) => f.type === 'scenario')).toBe(true);
  });

  it('Stripe definition result.presentationType is none', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.result.presentationType).toBe('none');
  });

  it('Stripe definition includes paymentMethodKey field', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.fields.some((f) => f.key === 'paymentMethodKey')).toBe(
      true,
    );
  });
});

// ─── Test 7: CoinGate definition ─────────────────────────────────────────────

describe('Test 7: CoinGate definition', () => {
  function makeCoinGateProvider() {
    const prov = makeProvider({ providerKey: 'coingate' });
    const defn = makeCoinGateDefinition();
    (prov as any).supportsPaymentTestingPageDefinition = true;
    (prov as any).getPaymentTestingPageDefinition = jest
      .fn()
      .mockResolvedValue(defn);
    return prov;
  }

  it('CoinGate definition does NOT include a scenario field', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.fields.some((f) => f.type === 'scenario')).toBe(false);
  });

  it('CoinGate definition includes price_currency payment_unit field', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    const currencyField = result.form.fields.find(
      (f) => f.key === 'price_currency',
    );
    expect(currencyField).toBeDefined();
    expect(currencyField?.type).toBe('payment_unit');
    expect(currencyField?.optionsSource).toBe('payment_units');
  });

  it('CoinGate definition result.presentationType is redirect', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.result.presentationType).toBe('redirect');
  });

  it('CoinGate definition has limitations', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.limitations).toBeDefined();
    expect(result.limitations!.length).toBeGreaterThan(0);
  });

  it('CoinGate definition has instructions', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.instructions).toBeDefined();
    expect(result.instructions!.length).toBeGreaterThan(0);
  });

  it('CoinGate submitLabel is different from Stripe (sandbox vs test)', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.submitLabel).toContain('sandbox');
  });
});

// ─── Test 8: Capabilities in definition ──────────────────────────────────────

describe('Test 8: Capabilities in definition', () => {
  it('PaymentTesting capability is available in returned capabilities', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities(),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('PaymentTesting capability is unsupported when provider declares it unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.PaymentTesting]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('PaymentTesting capability is unsupported for live connections (environment restriction)', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities(),
      }),
    });
    // Live connection — PaymentTesting should be restricted
    const runtime = makeRuntime(provider, { secretKey: 'sk_live_abc123' });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Unsupported,
    );
  });
});

// ─── Test 9: Secrets never returned ──────────────────────────────────────────

describe('Test 9: Secrets never returned', () => {
  it('the returned definition does not contain credential values from runtime', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(
      makeRuntime(provider, {
        secretKey: 'sk_test_DO_NOT_EXPOSE',
        token: 'cg-token-DO_NOT_EXPOSE',
        mode: 'test',
      }),
    );
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_DO_NOT_EXPOSE');
    expect(json).not.toContain('cg-token-DO_NOT_EXPOSE');
    expect(json).not.toContain('secretKey');
  });

  it('definition does not reference the raw credentials object', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result).not.toHaveProperty('credentials');
    expect(JSON.stringify(result)).not.toContain('sk_test_x');
  });
});

// ─── Test 10: Definition structure ───────────────────────────────────────────

describe('Test 10: Definition structure', () => {
  it('definition always has providerKey, connectionId, environment, version, capabilities, form, result', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.providerKey).toBeDefined();
    expect(result.connectionId).toBe(CONNECTION_ID);
    expect(result.environment).toBeDefined();
    expect(result.version).toBeDefined();
    expect(result.capabilities).toBeDefined();
    expect(result.form).toBeDefined();
    expect(result.result).toBeDefined();
  });

  it('form.fields is always an array', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(Array.isArray(result.form.fields)).toBe(true);
  });

  it('result.presentationType is one of redirect, embedded, none', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(['redirect', 'embedded', 'none']).toContain(
      result.result.presentationType,
    );
  });
});

// ─── Test 11: Capability filtering ───────────────────────────────────────────

describe('Test 11: Capability-gated fields filtering', () => {
  it('capability-gated fields are removed when capability is unavailable', async () => {
    // Create a definition with a capability-gated field
    const gatedDefinition: PaymentTestingPageDefinition = {
      providerKey: 'stripe',
      connectionId: CONNECTION_ID,
      environment: 'test',
      version: '1.0',
      capabilities: {},
      form: {
        supported: true,
        title: 'Test',
        submitLabel: 'Run',
        fields: [
          { key: 'amount', label: 'Amount', type: 'amount', required: true },
          {
            key: 'gated_field',
            label: 'Gated Field',
            type: 'text',
            required: false,
            capability: PaymentCapability.PaymentUnits,
          },
        ],
      },
      result: { presentationType: 'none' },
    };

    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.PaymentUnits]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    (provider as any).supportsPaymentTestingPageDefinition = true;
    (provider as any).getPaymentTestingPageDefinition = jest
      .fn()
      .mockResolvedValue(gatedDefinition);

    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    expect(result.form.fields.some((f) => f.key === 'gated_field')).toBe(false);
    expect(result.form.fields.some((f) => f.key === 'amount')).toBe(true);
  });

  it('fields without a capability guard are always included', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsTestingPageDefinitionService(svc as never);

    const result = await service.getTestingPageDefinition(
      COMPANY_A,
      CONNECTION_ID,
    );

    const ungatedFields = result.form.fields.filter((f) => !f.capability);
    expect(ungatedFields.length).toBeGreaterThan(0);
  });
});
