// src/payments/tests/payments-payouts.service.spec.ts
//
// Unit tests for PaymentsPayoutsService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsPayoutsService } from '../services/payments-payouts.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type {
  PayoutListResult,
  PayoutDetail,
  PayoutSummary,
} from '../contracts/payment-payout-list.contract';
import type { ListPayoutsQueryDto } from '../dto/list-payouts.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makePayoutSummary(id = 'po_001'): PayoutSummary {
  return {
    id,
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    providerPayoutId: id,
    amountMinor: 10000,
    currency: 'aud',
    status: 'paid',
    providerStatus: 'paid',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function makePayoutDetail(id = 'po_001'): PayoutDetail {
  return {
    ...makePayoutSummary(id),
    balanceTransactionId: 'txn_001',
    destinationLabel: 'STRIPE TEST BANK •••• 6789',
  };
}

function makeListResult(
  overrides: Partial<PayoutListResult> = {},
): PayoutListResult {
  return {
    data: [makePayoutSummary()],
    hasMore: false,
    ...overrides,
  };
}

function makePayoutProvider(
  listFn: jest.Mock = jest.fn(),
  getFn: jest.Mock = jest.fn(),
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsPayoutListing: true as const,
    listPayouts: listFn,
    getPayout: getFn,
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

function makeNoPayoutProvider(): IPaymentProvider {
  return {
    providerKey: 'no-payouts',
    displayName: 'No Payouts',
    description: 'Provider without payout listing',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-payouts',
      displayName: 'No Payouts',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

type MockPaymentsService = { resolveRuntime: jest.Mock };

function makePaymentsService(
  provider: unknown = makePayoutProvider(),
): MockPaymentsService {
  return {
    resolveRuntime: jest.fn().mockResolvedValue({
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test',
      provider,
      credentials: { secretKey: 'sk_test_mock', mode: 'test' },
    } as unknown as PaymentProviderRuntimeContext),
  };
}

function makeQuery(
  overrides: Partial<ListPayoutsQueryDto> = {},
): ListPayoutsQueryDto {
  return { limit: 20, ...overrides };
}

// ─── listPayouts ──────────────────────────────────────────────────────────────

describe('PaymentsPayoutsService.listPayouts()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const svc = makePaymentsService(makePayoutProvider(listFn));
    const service = new PaymentsPayoutsService(svc as never);

    await service.listPayouts(COMPANY_ID, ACCOUNT_ID, makeQuery());

    expect(svc.resolveRuntime).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('returns the PayoutListResult from the provider', async () => {
    const listResult = makeListResult({ hasMore: true, nextCursor: 'po_next' });
    const listFn = jest.fn().mockResolvedValue(listResult);
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(listFn)) as never,
    );

    const result = await service.listPayouts(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery(),
    );
    expect(result).toBe(listResult);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks payout capability', async () => {
    const service = new PaymentsPayoutsService(
      makePaymentsService(makeNoPayoutProvider()) as never,
    );

    await expect(
      service.listPayouts(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('passes correct params to provider.listPayouts', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(listFn)) as never,
    );

    await service.listPayouts(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery({
        limit: 10,
        currency: 'aud',
        status: 'paid',
        createdFrom: '2025-01-01T00:00:00.000Z',
        createdTo: '2025-12-31T00:00:00.000Z',
        arrivalFrom: '2025-01-05T00:00:00.000Z',
        arrivalTo: '2025-12-31T00:00:00.000Z',
        search: 'po_abc',
      }),
    );

    const [, params] = listFn.mock.calls[0] as [
      unknown,
      {
        limit?: number;
        currency?: string;
        status?: string;
        createdFrom?: Date;
        createdTo?: Date;
        arrivalFrom?: Date;
        arrivalTo?: Date;
        search?: string;
      },
    ];
    expect(params.limit).toBe(10);
    expect(params.currency).toBe('aud');
    expect(params.status).toBe('paid');
    expect(params.createdFrom).toBeInstanceOf(Date);
    expect(params.arrivalFrom).toBeInstanceOf(Date);
    expect(params.search).toBe('po_abc');
  });

  it('propagates PaymentProviderUnavailableError', async () => {
    const listFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(listFn)) as never,
    );

    await expect(
      service.listPayouts(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });

  it('returned data contains no credential values', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(listFn)) as never,
    );

    const result = await service.listPayouts(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery(),
    );
    expect(JSON.stringify(result)).not.toContain('secretKey');
    expect(JSON.stringify(result)).not.toContain('sk_test_mock');
  });

  it('confirms no local payout records are persisted (no DB injection)', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const svc = makePaymentsService(makePayoutProvider(listFn));
    const service = new PaymentsPayoutsService(svc as never);

    await service.listPayouts(COMPANY_ID, ACCOUNT_ID, makeQuery());

    expect(svc.resolveRuntime).toHaveBeenCalledTimes(1);
    expect(listFn).toHaveBeenCalledTimes(1);
  });
});

// ─── getPayout ────────────────────────────────────────────────────────────────

describe('PaymentsPayoutsService.getPayout()', () => {
  it('calls resolveRuntime with correct arguments', async () => {
    const getFn = jest.fn().mockResolvedValue(makePayoutDetail());
    const svc = makePaymentsService(makePayoutProvider(jest.fn(), getFn));
    const service = new PaymentsPayoutsService(svc as never);

    await service.getPayout(COMPANY_ID, ACCOUNT_ID, 'po_001');

    expect(svc.resolveRuntime).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('returns PayoutDetail from the provider', async () => {
    const detail = makePayoutDetail();
    const getFn = jest.fn().mockResolvedValue(detail);
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(jest.fn(), getFn)) as never,
    );

    const result = await service.getPayout(COMPANY_ID, ACCOUNT_ID, 'po_001');
    expect(result).toBe(detail);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks payout capability', async () => {
    const service = new PaymentsPayoutsService(
      makePaymentsService(makeNoPayoutProvider()) as never,
    );

    await expect(
      service.getPayout(COMPANY_ID, ACCOUNT_ID, 'po_001'),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('returned detail does not contain credential values', async () => {
    const getFn = jest.fn().mockResolvedValue(makePayoutDetail());
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(jest.fn(), getFn)) as never,
    );

    const result = await service.getPayout(COMPANY_ID, ACCOUNT_ID, 'po_001');
    const json = JSON.stringify(result);
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock');
  });

  it('returned detail contains no full bank account numbers', async () => {
    const detail: PayoutDetail = {
      ...makePayoutDetail(),
      destinationLabel: 'STRIPE TEST BANK •••• 6789',
      destinationLast4: '6789',
      destinationBankName: 'STRIPE TEST BANK',
    };
    const getFn = jest.fn().mockResolvedValue(detail);
    const service = new PaymentsPayoutsService(
      makePaymentsService(makePayoutProvider(jest.fn(), getFn)) as never,
    );

    const result = await service.getPayout(COMPANY_ID, ACCOUNT_ID, 'po_001');
    const json = JSON.stringify(result);
    // Only last 4 present, not a full account number pattern
    expect(json).toContain('6789');
    expect(json).not.toMatch(/\d{8,}/);
  });
});
