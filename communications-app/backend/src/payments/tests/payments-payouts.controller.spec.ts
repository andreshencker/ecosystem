// src/payments/tests/payments-payouts.controller.spec.ts
//
// Unit tests for PaymentsPayoutsController.
// PaymentsPayoutsService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsPayoutsController } from '../controllers/payments-payouts.controller';
import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type {
  PayoutSummary,
  PayoutDetail,
  PayoutListResult,
} from '../contracts/payment-payout-list.contract';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Fixed IDs prevent random ObjectId values from accidentally containing
// 8+ consecutive decimal digits, which would trip the bank-account-number guard test.
const COMPANY_ID = '5af3b2c4d1e6f7a8b9c0d1e2';
const ACCOUNT_ID = '5af3b2c4d1e6f7a8b9c0d1e3';

function makeAuthCtx(companyId?: string): AuthContext {
  return {
    actorType: 'user',
    companyId: companyId ?? COMPANY_ID,
  } as unknown as AuthContext;
}

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
    createdAt: new Date('2025-06-01T00:00:00.000Z'),
  };
}

function makePayoutDetail(id = 'po_001'): PayoutDetail {
  return {
    ...makePayoutSummary(id),
    balanceTransactionId: 'txn_001',
    destinationLabel: 'STRIPE TEST BANK •••• 6789',
  };
}

function makeListResult(overrides: Partial<PayoutListResult> = {}): PayoutListResult {
  return {
    data: [makePayoutSummary()],
    hasMore: false,
    ...overrides,
  };
}

type ServiceMock = {
  listPayouts: jest.Mock;
  getPayout: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    listPayouts: jest.fn(),
    getPayout: jest.fn(),
  };
}

// ─── listPayouts ──────────────────────────────────────────────────────────────

describe('PaymentsPayoutsController.listPayouts()', () => {
  it('returns serialised payout list with ISO string dates', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockResolvedValue(makeListResult());
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {});

    expect(result.data).toHaveLength(1);
    expect(typeof result.data[0].createdAt).toBe('string');
    expect(result.data[0].createdAt).toBe('2025-06-01T00:00:00.000Z');
  });

  it('throws UnauthorizedException when companyId is missing', async () => {
    const service = makeServiceMock();
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(
      ctrl.listPayouts({ actorType: 'user' } as AuthContext, ACCOUNT_ID, {}),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes companyId and accountId to the service', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockResolvedValue(makeListResult());
    const ctrl = new PaymentsPayoutsController(service as never);

    await ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {});

    expect(service.listPayouts).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID, {});
  });

  it('serialises estimatedArrivalAt to ISO string when present', async () => {
    const arrival = new Date('2025-06-05T00:00:00.000Z');
    const payout: PayoutSummary = {
      ...makePayoutSummary(),
      estimatedArrivalAt: arrival,
    };
    const service = makeServiceMock();
    service.listPayouts.mockResolvedValue({ data: [payout], hasMore: false });
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {});

    expect(result.data[0].estimatedArrivalAt).toBe(arrival.toISOString());
  });

  it('maps PaymentProviderNotFoundError → NotFoundException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentProviderNotFoundError('stripe'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps PaymentProviderNotConfiguredError → UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentProviderNotConfiguredError('stripe'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('maps PaymentCapabilityNotSupportedError → UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentCapabilityNotSupportedError('stripe', 'payoutListing'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('maps PaymentProviderCredentialsUnavailableError → UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('maps PaymentCredentialChannelMismatchError → UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentCredentialChannelMismatchError('cred_001', 'payment'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('maps PaymentCredentialsInvalidError → UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentCredentialsInvalidError('Invalid credentials'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('maps PaymentProviderUnavailableError → ServiceUnavailableException', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockRejectedValue(
      new PaymentProviderUnavailableError('stripe'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {})).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.listPayouts.mockResolvedValue(makeListResult());
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {});
    const json = JSON.stringify(result);
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_');
  });

  it('response does not contain full bank account numbers', async () => {
    const payout: PayoutSummary = {
      ...makePayoutSummary(),
      destinationLabel: 'BANK •••• 6789',
    };
    const service = makeServiceMock();
    service.listPayouts.mockResolvedValue({ data: [payout], hasMore: false });
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.listPayouts(makeAuthCtx(), ACCOUNT_ID, {});
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/\d{8,}/);
  });
});

// ─── getPayout ────────────────────────────────────────────────────────────────

describe('PaymentsPayoutsController.getPayout()', () => {
  it('returns serialised payout detail with ISO string dates', async () => {
    const service = makeServiceMock();
    service.getPayout.mockResolvedValue(makePayoutDetail());
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.getPayout(makeAuthCtx(), ACCOUNT_ID, 'po_001');

    expect(typeof result.createdAt).toBe('string');
  });

  it('throws UnauthorizedException when companyId is missing', async () => {
    const service = makeServiceMock();
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(
      ctrl.getPayout({ actorType: 'user' } as AuthContext, ACCOUNT_ID, 'po_001'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes companyId, accountId and payoutId to the service', async () => {
    const service = makeServiceMock();
    service.getPayout.mockResolvedValue(makePayoutDetail());
    const ctrl = new PaymentsPayoutsController(service as never);

    await ctrl.getPayout(makeAuthCtx(), ACCOUNT_ID, 'po_001');

    expect(service.getPayout).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID, 'po_001');
  });

  it('maps PaymentProviderNotFoundError → NotFoundException', async () => {
    const service = makeServiceMock();
    service.getPayout.mockRejectedValue(new PaymentProviderNotFoundError('stripe'));
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(
      ctrl.getPayout(makeAuthCtx(), ACCOUNT_ID, 'po_001'),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderUnavailableError → ServiceUnavailableException', async () => {
    const service = makeServiceMock();
    service.getPayout.mockRejectedValue(
      new PaymentProviderUnavailableError('stripe'),
    );
    const ctrl = new PaymentsPayoutsController(service as never);

    await expect(
      ctrl.getPayout(makeAuthCtx(), ACCOUNT_ID, 'po_001'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.getPayout.mockResolvedValue(makePayoutDetail());
    const ctrl = new PaymentsPayoutsController(service as never);

    const result = await ctrl.getPayout(makeAuthCtx(), ACCOUNT_ID, 'po_001');
    const json = JSON.stringify(result);
    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_test_');
  });
});
