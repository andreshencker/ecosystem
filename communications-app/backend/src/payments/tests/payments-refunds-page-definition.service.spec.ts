// src/payments/tests/payments-refunds-page-definition.service.spec.ts
//
// Focused unit tests for PaymentsRefundsPageDefinitionService.
// All dependencies (PaymentsService, provider adapters) are fully mocked.

import { Types } from 'mongoose';
import { PaymentsRefundsPageDefinitionService } from '../services/payments-refunds-page-definition.service';
import { PaymentsService } from '../services/payments.service';
import { CapabilityStatus, PaymentCapability } from '../enums/payment.enums';
import {
  PaymentProviderNotFoundError,
  PaymentProviderCredentialsUnavailableError,
} from '../errors/payment.errors';
import type { RefundsPageDefinition } from '../contracts/refunds-page-definition.contract';
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
    [PaymentCapability.Refunds]: CapabilityStatus.Available,
    [PaymentCapability.RefundListing]: CapabilityStatus.Available,
    [PaymentCapability.RefundDetail]: CapabilityStatus.Available,
    [PaymentCapability.RefundCreation]: CapabilityStatus.Available,
    [PaymentCapability.PartialRefunds]: CapabilityStatus.Available,
    [PaymentCapability.RefundReasons]: CapabilityStatus.Available,
    [PaymentCapability.PaymentUnits]: CapabilityStatus.Available,
    ...overrides,
  };
}

function makeProvider(
  overrides: Partial<
    IPaymentProvider & {
      supportsRefundsPageDefinition?: true;
      getRefundsPageDefinition?: jest.Mock;
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

function makeStripeDefinition(): RefundsPageDefinition {
  return {
    providerKey: 'stripe',
    connectionId: CONNECTION_ID,
    version: '1.0',
    capabilities: {},
    toolbarActions: [
      { key: 'refresh', label: 'Refresh', type: 'refresh' },
      {
        key: 'create_refund',
        label: 'New Refund',
        type: 'create_refund',
        capability: PaymentCapability.RefundCreation,
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
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        queryParam: 'status',
        optionsSource: 'refund_statuses',
        resetOnProviderChange: true,
        resetOnConnectionChange: false,
      },
    ],
    columns: [
      { key: 'id', label: 'Refund', type: 'identifier', field: 'providerRefundId' },
      { key: 'reason', label: 'Reason', type: 'reason', field: 'reason' },
      { key: 'status', label: 'Status', type: 'status', field: 'status' },
      { key: 'actions', label: '', type: 'actions' },
    ],
    rowActions: [{ key: 'view', label: 'View details', type: 'view' }],
    createForm: {
      supported: true,
      title: 'Create Refund',
      submitLabel: 'Create Refund',
      fields: [
        { key: 'paymentId', label: 'Payment ID', type: 'payment_reference', required: true },
      ],
    },
    list: {
      supported: true,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },
    emptyState: { title: 'No refunds', description: '' },
  };
}

function makeCoinGateDefinition(): RefundsPageDefinition {
  return {
    providerKey: 'coingate',
    connectionId: CONNECTION_ID,
    version: '1.0',
    capabilities: {},
    toolbarActions: [
      { key: 'refresh', label: 'Refresh', type: 'refresh' },
      {
        key: 'create_refund',
        label: 'New Refund',
        type: 'create_refund',
        capability: PaymentCapability.RefundCreation,
      },
    ],
    filters: [
      {
        key: 'search',
        label: 'Order ID',
        type: 'search',
        queryParam: 'search',
        resetOnProviderChange: true,
        resetOnConnectionChange: true,
      },
    ],
    columns: [
      { key: 'id', label: 'Refund', type: 'identifier', field: 'providerRefundId' },
      { key: 'currency', label: 'Asset', type: 'payment_unit', field: 'currency' },
      { key: 'status', label: 'Status', type: 'status', field: 'status' },
      { key: 'actions', label: '', type: 'actions' },
    ],
    rowActions: [{ key: 'view', label: 'View details', type: 'view' }],
    createForm: {
      supported: true,
      title: 'Create Refund',
      submitLabel: 'Create Refund',
      fields: [
        { key: 'paymentId', label: 'Order ID', type: 'payment_reference', required: true },
        {
          key: 'currency_id',
          label: 'Destination Asset',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
          providerExtension: true,
          providerMetadataMapping: { currencyId: 'currency_id', platformId: 'platform_id' },
        },
        { key: 'address', label: 'Wallet Address', type: 'text', required: true, providerExtension: true },
        { key: 'email', label: 'Email', type: 'email', required: true, providerExtension: true },
        { key: 'ledger_account_id', label: 'Ledger Account', type: 'text', required: true, providerExtension: true },
      ],
    },
    list: {
      supported: true,
      defaultPageSize: 20,
      allowedPageSizes: [20, 50],
      paginationType: 'cursor',
    },
    emptyState: { title: 'No refunds found', description: '' },
  };
}

// ─── Test 1: Company ownership validation ─────────────────────────────────────

describe('Test 1: Company ownership validation', () => {
  it('resolveRuntime is called with the authenticated companyId', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(svc.resolveRuntime).toHaveBeenCalledWith(COMPANY_A, CONNECTION_ID);
  });

  it('Test 11: another company cannot access the definition — resolveRuntime enforces isolation', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(
          new PaymentProviderCredentialsUnavailableError('stripe'),
        ),
      assertCapability: jest.fn(),
    };

    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    await expect(
      service.getRefundsPageDefinition(COMPANY_B, CONNECTION_ID),
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
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    await expect(
      service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderCredentialsUnavailableError);
  });

  it('throws when the provider is not registered', async () => {
    const svc = {
      resolveRuntime: jest
        .fn()
        .mockRejectedValue(new PaymentProviderNotFoundError('unknown')),
      assertCapability: jest.fn(),
    };
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    await expect(
      service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID),
    ).rejects.toThrow(PaymentProviderNotFoundError);
  });
});

// ─── Test 3: Provider adapter resolution ──────────────────────────────────────

describe('Test 3: Provider adapter resolution', () => {
  it('uses the provider returned by resolveRuntime', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.providerKey).toBe('stripe');
    expect(provider.getCapabilities).toHaveBeenCalled();
  });
});

// ─── Test 4: Effective refund capabilities ────────────────────────────────────

describe('Test 4: Effective refund capabilities', () => {
  it('RefundCreation available in capabilities', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities(),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.RefundCreation]).toBe(
      CapabilityStatus.Available,
    );
  });

  it('RefundCreation unsupported when provider declares it unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.RefundCreation]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.capabilities[PaymentCapability.RefundCreation]).toBe(
      CapabilityStatus.Unsupported,
    );
  });
});

// ─── Test 5: Generic default definition ──────────────────────────────────────

describe('Test 5: Generic default definition', () => {
  it('uses the generic default when provider has no custom refund definition', async () => {
    const provider = makeProvider(); // no supportsRefundsPageDefinition
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.filters.some((f) => f.key === 'status')).toBe(true);
    expect(result.columns.some((c) => c.type === 'identifier')).toBe(true);
    expect(result.rowActions.some((a) => a.type === 'view')).toBe(true);
  });

  it('generic default providerKey matches the runtime providerKey', async () => {
    const provider = makeProvider({ providerKey: 'some-future-provider' });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.providerKey).toBe('some-future-provider');
  });

  it('generic default includes Refresh toolbar action', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.toolbarActions.some((a) => a.type === 'refresh')).toBe(true);
  });

  it('generic default includes create_refund when RefundCreation is available', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.toolbarActions.some((a) => a.type === 'create_refund'),
    ).toBe(true);
  });

  it('generic default omits create_refund when RefundCreation is unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.RefundCreation]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.toolbarActions.some((a) => a.type === 'create_refund'),
    ).toBe(false);
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
    (prov as any).supportsRefundsPageDefinition = true;
    (prov as any).getRefundsPageDefinition = jest.fn().mockResolvedValue(defn);
    return prov;
  }

  it('calls provider.getRefundsPageDefinition when supportsRefundsPageDefinition is true', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect((provider as any).getRefundsPageDefinition).toHaveBeenCalledTimes(1);
  });

  it('Stripe definition includes reason column', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.columns.some((c) => c.type === 'reason')).toBe(true);
  });

  it('Stripe definition does not include payment_unit column', async () => {
    const provider = makeStripeProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.columns.some((c) => c.type === 'payment_unit')).toBe(false);
  });
});

// ─── Test 7: CoinGate definition ─────────────────────────────────────────────

describe('Test 7: CoinGate definition', () => {
  function makeCoinGateProvider() {
    const prov = makeProvider({ providerKey: 'coingate' });
    const defn = makeCoinGateDefinition();
    (prov as any).supportsRefundsPageDefinition = true;
    (prov as any).getRefundsPageDefinition = jest.fn().mockResolvedValue(defn);
    return prov;
  }

  it('CoinGate definition has payment_unit column for asset display', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.columns.some((c) => c.type === 'payment_unit')).toBe(true);
  });

  it('CoinGate definition does not have a reason column', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.columns.some((c) => c.type === 'reason')).toBe(false);
  });

  it('CoinGate create form includes currency_id payment_unit field with providerExtension=true', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    const currencyField = result.createForm?.fields.find(
      (f) => f.key === 'currency_id',
    );
    expect(currencyField).toBeDefined();
    expect(currencyField?.providerExtension).toBe(true);
    expect(currencyField?.type).toBe('payment_unit');
  });

  it('CoinGate create form address field has providerExtension=true', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    const addressField = result.createForm?.fields.find((f) => f.key === 'address');
    expect(addressField).toBeDefined();
    expect(addressField?.providerExtension).toBe(true);
  });

  it('CoinGate search filter is labeled Order ID', async () => {
    const provider = makeCoinGateProvider();
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    const searchFilter = result.filters.find((f) => f.key === 'search');
    expect(searchFilter?.label).toBe('Order ID');
  });
});

// ─── Test 8: Unsupported toolbar controls removed ─────────────────────────────

describe('Test 8: Unsupported toolbar controls removed', () => {
  it('create_refund toolbar action is removed when RefundCreation is unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.RefundCreation]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    const defn = makeStripeDefinition();
    (provider as any).supportsRefundsPageDefinition = true;
    (provider as any).getRefundsPageDefinition = jest.fn().mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(
      result.toolbarActions.find((a) => a.type === 'create_refund'),
    ).toBeUndefined();
  });

  it('Refresh toolbar action is always present', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.toolbarActions.find((a) => a.type === 'refresh')).toBeDefined();
  });
});

// ─── Test 9: CoinGate provider extension fields mapped safely ─────────────────

describe('Test 9: CoinGate provider extension fields mapped safely', () => {
  it('providerMetadataMapping is defined for currency_id field', async () => {
    const provider = makeProvider({ providerKey: 'coingate' });
    const defn = makeCoinGateDefinition();
    (provider as any).supportsRefundsPageDefinition = true;
    (provider as any).getRefundsPageDefinition = jest.fn().mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    const field = result.createForm?.fields.find((f) => f.key === 'currency_id');
    expect(field?.providerMetadataMapping).toBeDefined();
    expect(field?.providerMetadataMapping?.['currencyId']).toBe('currency_id');
    expect(field?.providerMetadataMapping?.['platformId']).toBe('platform_id');
  });

  it('all CoinGate provider extension fields have providerExtension=true', async () => {
    const provider = makeProvider({ providerKey: 'coingate' });
    const defn = makeCoinGateDefinition();
    (provider as any).supportsRefundsPageDefinition = true;
    (provider as any).getRefundsPageDefinition = jest.fn().mockResolvedValue(defn);
    const svc = makePaymentsService(makeRuntime(provider as any));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    const extensionFields = result.createForm?.fields.filter(
      (f) => f.providerExtension,
    );
    const extensionKeys = extensionFields?.map((f) => f.key);
    expect(extensionKeys).toContain('currency_id');
    expect(extensionKeys).toContain('address');
    expect(extensionKeys).toContain('email');
    expect(extensionKeys).toContain('ledger_account_id');
  });
});

// ─── Test 10: Secrets never returned ─────────────────────────────────────────

describe('Test 10: Secrets never returned', () => {
  it('the returned definition does not contain credential values from runtime', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(
      makeRuntime(provider, {
        secretKey: 'sk_test_DO_NOT_EXPOSE',
        token: 'cg-token-DO_NOT_EXPOSE',
        mode: 'test',
      }),
    );
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('sk_test_DO_NOT_EXPOSE');
    expect(json).not.toContain('cg-token-DO_NOT_EXPOSE');
    expect(json).not.toContain('secretKey');
  });

  it('definition does not reference the raw credentials object', async () => {
    const provider = makeProvider();
    const runtime = makeRuntime(provider);
    const svc = makePaymentsService(runtime);
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result).not.toHaveProperty('credentials');
    expect(JSON.stringify(result)).not.toContain('sk_test_x');
  });
});

// ─── Test 11: Filters rendered from definition ────────────────────────────────

describe('Test 11: Filters rendered from definition', () => {
  it('status filter is always present in definitions with refund listing', async () => {
    const provider = makeProvider();
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.filters.some((f) => f.key === 'status')).toBe(true);
  });

  it('currency filter is absent when PaymentUnits capability is unsupported', async () => {
    const provider = makeProvider({
      getCapabilities: jest.fn().mockReturnValue({
        capabilities: baseCapabilities({
          [PaymentCapability.PaymentUnits]: CapabilityStatus.Unsupported,
        }),
      }),
    });
    const svc = makePaymentsService(makeRuntime(provider));
    const service = new PaymentsRefundsPageDefinitionService(svc as never);

    const result = await service.getRefundsPageDefinition(COMPANY_A, CONNECTION_ID);

    expect(result.filters.find((f) => f.key === 'currency')).toBeUndefined();
  });
});
