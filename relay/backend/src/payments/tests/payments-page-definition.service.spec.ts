// src/payments/tests/payments-page-definition.service.spec.ts
//
// Focused unit tests for PaymentsPageDefinitionService.
// All dependencies (PaymentsService, provider adapters) are fully mocked.

import { Types } from 'mongoose';
import { PaymentsPageDefinitionService } from '../services/payments-page-definition.service';
import { PaymentsService } from '../services/payments.service';
import { CapabilityStatus, PaymentCapability } from '../enums/payment.enums';
import {
  PaymentProviderNotFoundError,
  PaymentProviderCredentialsUnavailableError,
} from '../errors/payment.errors';
import type {
  PaymentsPageDefinition,
  PaymentsPageDefinitionContext,
} from '../contracts/payments-page-definition.contract';
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
    [PaymentCapability.Payments]: CapabilityStatus.Available,
    [PaymentCapability.Balance]: CapabilityStatus.Available,
    [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,
    ...overrides,
  };
}

function makeProvider(
  overrides: Partial<
    IPaymentProvider & {
      supportsPaymentsPageDefinition?: true;
      getPaymentsPageDefinition?: jest.Mock;
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

// ─── Test 1: Company ownership validation ─────────────────────────────────────

describe('Test 1: Company ownership validation', () => {
  it('resolveRuntime is called with the authenticated companyId — never from request body', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsPageDefinitionService(svc as never);

    await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(svc.resolveRuntime).toHaveBeenCalledWith(COMPANY_A, CONNECTION_ID);
  });

  it('Test 12: another company cannot access the definition — resolveRuntime enforces company isolation', async () => {
    // resolveRuntime throws when the credential doesn't belong to the company.
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(
          new PaymentProviderCredentialsUnavailableError('stripe'),
        ),
      assertCapability: jest.fn(),
    };

    const service = new PaymentsPageDefinitionService(svc as never);

    await expect(
      service.getPageDefinition(COMPANY_B, CONNECTION_ID),
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
    const service = new PaymentsPageDefinitionService(svc as never);

    await expect(
      service.getPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderCredentialsUnavailableError);
  });

  it('throws when the provider is not registered', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(new PaymentProviderNotFoundError('unknown')),
      assertCapability: jest.fn(),
    };
    const service = new PaymentsPageDefinitionService(svc as never);

    await expect(
      service.getPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderNotFoundError);
  });
});

// ─── Test 3: Provider adapter resolution ──────────────────────────────────────

describe('Test 3: Provider adapter resolution', () => {
  it('uses the provider returned by resolveRuntime — no separate registry lookup', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.providerKey).toBe('stripe');
    expect(provider.getCapabilities).toHaveBeenCalled();
  });
});

// ─── Test 4: Provider capability resolution ───────────────────────────────────

describe('Test 4: Provider capability resolution', () => {
  it('includes balance capability when provider declares it available', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Available,
        },
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('reflects unsupported balance in the definition capabilities', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Unsupported,
        },
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Unsupported,
    );
  });
});

// ─── Test 5: Connection capability resolution ─────────────────────────────────

describe('Test 5: Connection capability resolution', () => {
  it('restricts paymentTesting to unsupported in live mode', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
        },
      }),
    });
    const runtime = makeRuntime(provider, {
      secretKey: 'sk_live_x',
      mode: 'live',
    });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('keeps paymentTesting available in test mode', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
        },
      }),
    });
    const runtime = makeRuntime(provider, {
      secretKey: 'sk_test_x',
      mode: 'test',
    });
    const svc = makePaymentsService(runtime);
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.PaymentTesting]).toBe(
      CapabilityStatus.Available,
    );
  });
});

// ─── Test 6: Effective capability intersection ────────────────────────────────

describe('Test 6: Effective capability intersection', () => {
  it('provider unsupported takes precedence over connection available', async () => {
    // Balance is unsupported at provider level; connection would allow it.
    // Effective result must be unsupported.
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Unsupported,
        },
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Unsupported,
    );
  });

  it('planned at provider level results in planned in effective', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: { [PaymentCapability.Balance]: CapabilityStatus.Planned },
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.Balance]).toBe(
      CapabilityStatus.Planned,
    );
  });
});

// ─── Test 7: Generic default definition ──────────────────────────────────────

describe('Test 7: Generic default definition', () => {
  it('uses the generic default when provider has no custom definition', async () => {
    const provider = makeProvider(); // no supportsPaymentsPageDefinition
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    // Generic definition always includes a status filter and identifier column
    expect(result.filters.some((f) => f.key === 'status')).toBe(true);
    expect(result.columns.some((c) => c.type === 'identifier')).toBe(true);
    expect(result.rowActions.some((a) => a.type === 'view')).toBe(true);
  });

  it('generic default providerKey matches the runtime providerKey', async () => {
    const provider = makeProvider({ providerKey: 'some-future-provider' });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.providerKey).toBe('some-future-provider');
  });
});

// ─── Test 8: Stripe definition ────────────────────────────────────────────────

describe('Test 8: Stripe definition', () => {
  function makeStripeProvider() {
    const prov = makeProvider({
      providerKey: 'stripe',
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Payments]: CapabilityStatus.Available,
          [PaymentCapability.Balance]: CapabilityStatus.Available,
          [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,
          [PaymentCapability.PaymentTesting]: CapabilityStatus.Available,
        },
      }),
    });
    const defn: PaymentsPageDefinition = {
      providerKey: 'stripe',
      connectionId: CONNECTION_ID,
      version: '1.0',
      capabilities: {},
      summaryCards: [
        {
          key: 'balance_available',
          label: 'Available Balance',
          type: 'amount',
          source: 'balance.available',
          capability: PaymentCapability.Balance,
          scope: 'connection',
          unavailableBehaviour: 'not_supported',
        },
      ],
      filters: [
        {
          key: 'search',
          label: 'Search',
          type: 'search',
          queryParam: 'search',
          resetOnProviderChange: true,
          resetOnConnectionChange: true,
        },
      ],
      columns: [
        {
          key: 'id',
          label: 'Payment',
          type: 'identifier',
          field: 'providerPaymentId',
        },
      ],
      rowActions: [{ key: 'view', label: 'View', type: 'view' }],
      list: {
        supported: true,
        defaultPageSize: 20,
        allowedPageSizes: [20],
        paginationType: 'cursor',
      },
      emptyState: { title: 'No payments', description: '' },
    };
    (prov as any).supportsPaymentsPageDefinition = true;
    (prov as any).getPaymentsPageDefinition = jest.fn().mockResolvedValue(defn);
    return prov;
  }

  it('calls provider.getPaymentsPageDefinition when supportsPaymentsPageDefinition is true', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect((provider as any).getPaymentsPageDefinition).toHaveBeenCalledTimes(
      1,
    );
  });

  it('balance cards are present in the Stripe definition (balance is available)', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.summaryCards.some((c) => c.source === 'balance.available'),
    ).toBe(true);
  });
});

// ─── Test 9: CoinGate definition ──────────────────────────────────────────────

describe('Test 9: CoinGate definition', () => {
  function makeCoinGateProvider() {
    const prov = makeProvider({ providerKey: 'coingate' });
    const defn: PaymentsPageDefinition = {
      providerKey: 'coingate',
      connectionId: CONNECTION_ID,
      version: '1.0',
      capabilities: {},
      summaryCards: [
        {
          key: 'succeeded',
          label: 'Paid',
          type: 'count',
          source: 'page.status',
          status: 'succeeded',
          scope: 'current_page',
          unavailableBehaviour: 'hide',
        },
        {
          key: 'requires_action',
          label: 'Awaiting Payment',
          type: 'count',
          source: 'page.status',
          status: 'requires_action',
          scope: 'current_page',
          unavailableBehaviour: 'hide',
        },
        {
          key: 'failed',
          label: 'Failed',
          type: 'count',
          source: 'page.status',
          status: 'failed',
          scope: 'current_page',
          unavailableBehaviour: 'hide',
        },
        {
          key: 'expired',
          label: 'Expired',
          type: 'count',
          source: 'page.status',
          status: 'expired',
          scope: 'current_page',
          unavailableBehaviour: 'hide',
        },
      ],
      filters: [],
      columns: [
        {
          key: 'currency',
          label: 'Asset',
          type: 'payment_unit',
          field: 'currency',
        },
      ],
      rowActions: [
        { key: 'view', label: 'View', type: 'view' },
        {
          key: 'open_payment_url',
          label: 'Open',
          type: 'open_url',
          field: 'paymentUrl',
        },
      ],
      list: {
        supported: true,
        defaultPageSize: 20,
        allowedPageSizes: [20],
        paginationType: 'cursor',
      },
      emptyState: { title: 'No orders', description: '' },
    };
    (prov as any).supportsPaymentsPageDefinition = true;
    (prov as any).getPaymentsPageDefinition = jest.fn().mockResolvedValue(defn);
    return prov;
  }

  it('CoinGate definition has status-based cards (not balance cards)', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.summaryCards.some((c) => c.source === 'balance.available'),
    ).toBe(false);
    expect(
      result.summaryCards.some((c) => c.source === 'balance.pending'),
    ).toBe(false);
    expect(result.summaryCards.some((c) => c.status === 'succeeded')).toBe(
      true,
    );
    expect(result.summaryCards.some((c) => c.status === 'expired')).toBe(true);
  });

  it('CoinGate definition includes open_url action', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    const openUrl = result.rowActions.find((a) => a.type === 'open_url');
    expect(openUrl).toBeDefined();
    expect(openUrl?.field).toBe('paymentUrl');
  });

  it('CoinGate definition has payment_unit column for asset display', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.columns.some((c) => c.type === 'payment_unit')).toBe(true);
  });
});

// ─── Test 10: Unsupported components removed ──────────────────────────────────

describe('Test 10: Unsupported components removed', () => {
  it('cards with unavailableBehaviour=hide and unsupported capability are removed', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Unsupported,
        },
      }),
    });
    const defn: PaymentsPageDefinition = {
      providerKey: 'stripe',
      connectionId: CONNECTION_ID,
      version: '1.0',
      capabilities: {},
      summaryCards: [
        {
          key: 'balance_available',
          label: 'Available Balance',
          type: 'amount',
          source: 'balance.available',
          capability: PaymentCapability.Balance,
          scope: 'connection',
          unavailableBehaviour: 'hide',
        },
        {
          key: 'succeeded',
          label: 'Succeeded',
          type: 'count',
          source: 'page.status',
          status: 'succeeded',
          scope: 'current_page',
          unavailableBehaviour: 'hide',
        },
      ],
      filters: [],
      columns: [],
      rowActions: [],
      list: {
        supported: true,
        defaultPageSize: 20,
        allowedPageSizes: [20],
        paginationType: 'cursor',
      },
      emptyState: { title: 'No payments', description: '' },
    };
    (provider as any).supportsPaymentsPageDefinition = true;
    (provider as any).getPaymentsPageDefinition = jest
      .fn()
      .mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.summaryCards.find((c) => c.key === 'balance_available'),
    ).toBeUndefined();
    expect(
      result.summaryCards.find((c) => c.key === 'succeeded'),
    ).toBeDefined();
  });

  it('cards with unavailableBehaviour=not_supported are kept even when capability is unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.Balance]: CapabilityStatus.Unsupported,
        },
      }),
    });
    const defn: PaymentsPageDefinition = {
      providerKey: 'stripe',
      connectionId: CONNECTION_ID,
      version: '1.0',
      capabilities: {},
      summaryCards: [
        {
          key: 'balance_available',
          label: 'Available Balance',
          type: 'amount',
          source: 'balance.available',
          capability: PaymentCapability.Balance,
          scope: 'connection',
          unavailableBehaviour: 'not_supported',
        },
      ],
      filters: [],
      columns: [],
      rowActions: [],
      list: {
        supported: true,
        defaultPageSize: 20,
        allowedPageSizes: [20],
        paginationType: 'cursor',
      },
      emptyState: { title: '', description: '' },
    };
    (provider as any).supportsPaymentsPageDefinition = true;
    (provider as any).getPaymentsPageDefinition = jest
      .fn()
      .mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.summaryCards.find((c) => c.key === 'balance_available'),
    ).toBeDefined();
  });

  it('filters with unsupported capability are removed', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: {
          [PaymentCapability.PaymentUnits]: CapabilityStatus.Unsupported,
        },
      }),
    });
    const defn: PaymentsPageDefinition = {
      providerKey: 'test',
      connectionId: CONNECTION_ID,
      version: '1.0',
      capabilities: {},
      summaryCards: [],
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          queryParam: 'status',
          resetOnProviderChange: true,
          resetOnConnectionChange: false,
        },
        {
          key: 'currency',
          label: 'Currency',
          type: 'select',
          queryParam: 'currency',
          capability: PaymentCapability.PaymentUnits,
          resetOnProviderChange: true,
          resetOnConnectionChange: true,
        },
      ],
      columns: [],
      rowActions: [],
      list: {
        supported: true,
        defaultPageSize: 20,
        allowedPageSizes: [20],
        paginationType: 'cursor',
      },
      emptyState: { title: '', description: '' },
    };
    (provider as any).supportsPaymentsPageDefinition = true;
    (provider as any).getPaymentsPageDefinition = jest
      .fn()
      .mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.filters.find((f) => f.key === 'currency')).toBeUndefined();
    expect(result.filters.find((f) => f.key === 'status')).toBeDefined();
  });
});

// ─── Test 11: Secrets never returned ─────────────────────────────────────────

describe('Test 11: Secrets never returned', () => {
  it('the returned definition does not contain credential values from runtime', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(
      makeRuntime(provider, {
        secretKey: 'sk_test_DO_NOT_EXPOSE',
        mode: 'test',
      }),
    );
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_DO_NOT_EXPOSE');
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('token');
    expect(json).not.toContain('apiKey');
  });

  it('definition does not reference the raw credentials object', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsPageDefinitionService(svc as never);

    const result = await service.getPageDefinition(COMPANY_A, CONNECTION_ID);

    // The credentials object from runtime must not appear in the result.
    expect(result).not.toHaveProperty('credentials');
    expect(JSON.stringify(result)).not.toContain('sk_test_x');
  });
});
