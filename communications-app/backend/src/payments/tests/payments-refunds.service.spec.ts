// src/payments/tests/payments-refunds.service.spec.ts
//
// Unit tests for PaymentsRefundsService.
// PaymentsService and the provider adapter are fully mocked.

import { Types } from 'mongoose';
import { PaymentsRefundsService } from '../services/payments-refunds.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { IPaymentProvider } from '../interfaces/payment-provider.interface';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import type {
  RefundListResult,
  RefundDetail,
} from '../contracts/payment-refund-list.contract';
import type { ListRefundsQueryDto } from '../dto/list-refunds.dto';
import type { CreateRefundDto } from '../dto/create-refund.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toString();
const ACCOUNT_ID = new Types.ObjectId().toString();
const REFUND_ID = 're_test_001';
const PAYMENT_INTENT_ID = 'pi_test_001';

function makeRefundSummary() {
  return {
    id: REFUND_ID,
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    providerRefundId: REFUND_ID,
    providerPaymentId: PAYMENT_INTENT_ID,
    amountMinor: 2500,
    currency: 'aud',
    status: 'succeeded' as const,
    providerStatus: 'succeeded',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };
}

function makeListResult(
  overrides: Partial<RefundListResult> = {},
): RefundListResult {
  return {
    data: [makeRefundSummary()],
    hasMore: false,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<RefundDetail> = {}): RefundDetail {
  return {
    ...makeRefundSummary(),
    paymentAmountMinor: 5000,
    refundedAmountMinor: 2500,
    remainingRefundableAmountMinor: 2500,
    ...overrides,
  };
}

function makeRefundProvider(
  listFn: jest.Mock = jest.fn(),
  getFn: jest.Mock = jest.fn(),
  createFn: jest.Mock = jest.fn(),
) {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe provider',
    supportsRefundListing: true as const,
    listRefunds: listFn,
    getRefund: getFn,
    createRefund: createFn,
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

function makeNoRefundProvider(): IPaymentProvider {
  return {
    providerKey: 'no-refund',
    displayName: 'No Refund',
    description: 'Provider without refund support',
    getCapabilities: () => ({ capabilities: {} }),
    getMetadata: () => ({
      providerKey: 'no-refund',
      displayName: 'No Refund',
      description: '',
      connectionType: 'api_key',
    }),
  };
}

type MockPaymentsService = {
  resolveRuntime: jest.Mock;
};

function makePaymentsService(
  provider: unknown = makeRefundProvider(),
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
  };
}

function makeQuery(
  overrides: Partial<ListRefundsQueryDto> = {},
): ListRefundsQueryDto {
  return { limit: 20, ...overrides };
}

function makeCreateDto(
  overrides: Partial<CreateRefundDto> = {},
): CreateRefundDto {
  return { paymentId: PAYMENT_INTENT_ID, ...overrides };
}

// ─── listRefunds tests ────────────────────────────────────────────────────────

describe('PaymentsRefundsService.listRefunds()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeRefundProvider(listFn));
    const service = new PaymentsRefundsService(paymentsService as never);

    await service.listRefunds(COMPANY_ID, ACCOUNT_ID, makeQuery());

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns the RefundListResult from the provider', async () => {
    const listResult = makeListResult({ hasMore: true, nextCursor: 're_next' });
    const listFn = jest.fn().mockResolvedValue(listResult);
    const paymentsService = makePaymentsService(makeRefundProvider(listFn));
    const service = new PaymentsRefundsService(paymentsService as never);

    const result = await service.listRefunds(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery(),
    );

    expect(result).toBe(listResult);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks refund capability', async () => {
    const paymentsService = makePaymentsService(makeNoRefundProvider());
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.listRefunds(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('passes correct params to provider.listRefunds', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeRefundProvider(listFn));
    const service = new PaymentsRefundsService(paymentsService as never);

    await service.listRefunds(
      COMPANY_ID,
      ACCOUNT_ID,
      makeQuery({
        limit: 10,
        currency: 'usd',
        search: 're_test',
      }),
    );

    const [, params] = listFn.mock.calls[0] as [
      unknown,
      { limit?: number; currency?: string; search?: string },
    ];
    expect(params.limit).toBe(10);
    expect(params.currency).toBe('usd');
    expect(params.search).toBe('re_test');
  });

  it('no refund records are persisted locally (no DB call)', async () => {
    const listFn = jest.fn().mockResolvedValue(makeListResult());
    const paymentsService = makePaymentsService(makeRefundProvider(listFn));
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.listRefunds(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).resolves.toBeDefined();

    expect(paymentsService.resolveRuntime).toHaveBeenCalledTimes(1);
    expect(listFn).toHaveBeenCalledTimes(1);
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const listFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(makeRefundProvider(listFn));
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.listRefunds(COMPANY_ID, ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });
});

// ─── getRefund tests ──────────────────────────────────────────────────────────

describe('PaymentsRefundsService.getRefund()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const getFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), getFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    await service.getRefund(COMPANY_ID, ACCOUNT_ID, REFUND_ID);

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns RefundDetail from the provider', async () => {
    const detail = makeDetail();
    const getFn = jest.fn().mockResolvedValue(detail);
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), getFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    const result = await service.getRefund(COMPANY_ID, ACCOUNT_ID, REFUND_ID);

    expect(result).toBe(detail);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks refund capability', async () => {
    const paymentsService = makePaymentsService(makeNoRefundProvider());
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.getRefund(COMPANY_ID, ACCOUNT_ID, REFUND_ID),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('returned detail does not contain credential values', async () => {
    const getFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), getFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    const result = await service.getRefund(COMPANY_ID, ACCOUNT_ID, REFUND_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_mock');
  });
});

// ─── createRefund tests ───────────────────────────────────────────────────────

describe('PaymentsRefundsService.createRefund()', () => {
  it('calls resolveRuntime with correct companyId and accountId', async () => {
    const createFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), jest.fn(), createFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    await service.createRefund(COMPANY_ID, ACCOUNT_ID, makeCreateDto());

    expect(paymentsService.resolveRuntime).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
    );
  });

  it('returns RefundDetail from the provider', async () => {
    const detail = makeDetail();
    const createFn = jest.fn().mockResolvedValue(detail);
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), jest.fn(), createFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    const result = await service.createRefund(
      COMPANY_ID,
      ACCOUNT_ID,
      makeCreateDto(),
    );

    expect(result).toBe(detail);
  });

  it('throws PaymentCapabilityNotSupportedError when provider lacks refund capability', async () => {
    const paymentsService = makePaymentsService(makeNoRefundProvider());
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.createRefund(COMPANY_ID, ACCOUNT_ID, makeCreateDto()),
    ).rejects.toThrow(PaymentCapabilityNotSupportedError);
  });

  it('passes dto fields to provider.createRefund', async () => {
    const createFn = jest.fn().mockResolvedValue(makeDetail());
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), jest.fn(), createFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    await service.createRefund(
      COMPANY_ID,
      ACCOUNT_ID,
      makeCreateDto({ amountMinor: 1000, reason: 'duplicate' }),
    );

    const [, params] = createFn.mock.calls[0] as [
      unknown,
      { paymentId: string; amountMinor?: number; reason?: string },
    ];
    expect(params.paymentId).toBe(PAYMENT_INTENT_ID);
    expect(params.amountMinor).toBe(1000);
    expect(params.reason).toBe('duplicate');
  });

  it('propagates PaymentProviderUnavailableError from the provider', async () => {
    const createFn = jest
      .fn()
      .mockRejectedValue(new PaymentProviderUnavailableError('stripe'));
    const paymentsService = makePaymentsService(
      makeRefundProvider(jest.fn(), jest.fn(), createFn),
    );
    const service = new PaymentsRefundsService(paymentsService as never);

    await expect(
      service.createRefund(COMPANY_ID, ACCOUNT_ID, makeCreateDto()),
    ).rejects.toThrow(PaymentProviderUnavailableError);
  });
});
