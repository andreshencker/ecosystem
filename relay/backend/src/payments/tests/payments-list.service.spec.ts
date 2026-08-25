// src/payments/tests/payments-list.service.spec.ts
//
// Unit tests for PaymentsListService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsListService } from '../services/payments-list.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type {
  PaymentListResult,
  PaymentDetail,
} from '../contracts/payment-list.contract';
import { PaymentCanonicalStatus } from '../enums/payment-canonical-status.enum';
import type { ListPaymentsQueryDto } from '../dto/list-payments.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();

function makeListResult(
  overrides: Partial<PaymentListResult> = {},
): PaymentListResult {
  return {
    data: [
      {
        id: 'pi_001',
        accountId: ACCOUNT_ID,
        providerKey: 'stripe',
        providerPaymentId: 'pi_001',
        amountMinor: 5000,
        currency: 'aud',
        status: PaymentCanonicalStatus.Succeeded,
        providerStatus: 'succeeded',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        requiresUserAction: false,
      },
    ],
    hasMore: false,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    id: 'pi_detail_001',
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    providerPaymentId: 'pi_detail_001',
    amountMinor: 10000,
    currency: 'usd',
    status: PaymentCanonicalStatus.Succeeded,
    providerStatus: 'succeeded',
    createdAt: new Date('2025-01-02T00:00:00.000Z'),
    requiresUserAction: false,
    captureMethod: 'automatic',
    amountReceivedMinor: 10000,
    ...overrides,
  };
}

function makeListProvider(
  listFn: jest.Mock = jest.fn(),
  getFn: jest.Mock = jest.fn(),
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsPaymentListing: true as const,
    listPayments: listFn,
    getPayment: getFn,
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

function makeNoListProvider(): IPaymentProvider {
  return {
    providerKey: 'no-list',
    displayName: 'No List',
    description: 'Provider without listing',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-list',
      displayName: 'No List',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

type MockPaymentsService = {
  resolveRuntime: jest.Mock;
  assertCapability: jest.Mock;
};

function makePaymentsService(
  provider: unknown = makeListProvider(),
): MockPaymentsService {
  return {
    resolveRuntime: jest.fn().mockResolvedValue({
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test',
      provider,
      credentials: {
        secretKey: 'sk_test_mock',
        mode: 'test',
      },
    } as unknown as PaymentProviderRuntimeContext),
    assertCapability: jest.fn(),
  };
}

function makeQuery(
  overrides: Partial<ListPaymentsQueryDto> = {},
): ListPaymentsQueryDto {
  return { limit: 20, ...overrides };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsListService.listPayments()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeListProvider(listFn));
    const service = new PaymentsListService(paymentsService as never);

    await service.listPayments(COMPANY_ID, ACCOUNT_ID, makeQuery());

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns the PaymentListResult from the provider', async () => {
    const listResult = makeListResult({ hasMore: true, nextCursor: 'pi_next' });
    const listFn = jest.fn().mockResolvedValue(listResult);
    const paymentsService = makePaymentsService(makeListProvider(listFn));
    const service = new PaymentsListService(paymentsService as never);

    const result = await service.listPayments(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery(),
    );

    expect(result).toBe(listResult);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks listing capability', async () => {
    const paymentsService = makePaymentsService(makeNoListProvider());
    const service = new PaymentsListService(paymentsService as never);

    await expect(
      service.listPayments(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('passes correct params to provider.listPayments', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeListProvider(listFn));
    const service = new PaymentsListService(paymentsService as never);

    await service.listPayments(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery({
        limit: 10,
        currency: 'usd',
        status: 'succeeded',
      }),
    );

    const [, params] = listFn.mock.calls[0] as [
      unknown,
      { limit?: number; currency?: string; status?: string },
    ];
    expect(params.limit).toBe(10);
    expect(params.currency).toBe('usd');
    expect(params.status).toBe('succeeded');
  });

  it('no payment records are persisted locally (no DB call)', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeListProvider(listFn));
    const service = new PaymentsListService(paymentsService as never);

    // The service has no DB injection — just check it doesn't error
    await expect(
      service.listPayments(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).resolves.toBeDefined();

    // No save/create/insert calls possible since no repo injected
    expect(paymentsService.resolveRuntime).toHaveBeenCalledTimes(1);
    expect(listFn).toHaveBeenCalledTimes(1);
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const listFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(makeListProvider(listFn));
    const service = new PaymentsListService(paymentsService as never);

    await expect(
      service.listPayments(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });
});

describe('PaymentsListService.getPayment()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const getFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeListProvider(jest.fn(), getFn),
    );
    const service = new PaymentsListService(paymentsService as never);

    await service.getPayment(COMPANY_ID, ACCOUNT_ID, 'pi_001');

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns PaymentDetail from the provider', async () => {
    const detail = makeDetail();
    const getFn = jest.fn().mockResolvedValue(detail);
    const paymentsService = makePaymentsService(
      makeListProvider(jest.fn(), getFn),
    );
    const service = new PaymentsListService(paymentsService as never);

    const result = await service.getPayment(COMPANY_ID, ACCOUNT_ID, 'pi_001');

    expect(result).toBe(detail);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks listing capability', async () => {
    const paymentsService = makePaymentsService(makeNoListProvider());
    const service = new PaymentsListService(paymentsService as never);

    await expect(
      service.getPayment(COMPANY_ID, ACCOUNT_ID, 'pi_001'),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('returned detail does not contain credential values', async () => {
    const getFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeListProvider(jest.fn(), getFn),
    );
    const service = new PaymentsListService(paymentsService as never);

    const result = await service.getPayment(COMPANY_ID, ACCOUNT_ID, 'pi_001');
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock');
  });
});
