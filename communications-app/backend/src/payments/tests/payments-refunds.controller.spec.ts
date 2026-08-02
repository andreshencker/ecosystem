// src/payments/tests/payments-refunds.controller.spec.ts
//
// Unit tests for PaymentsRefundsController.
// PaymentsRefundsService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentsRefundsController } from '../controllers/payments-refunds.controller';
import { PaymentsRefundsService } from '../services/payments-refunds.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type {
  RefundListResult,
  RefundDetail,
} from '../contracts/payment-refund-list.contract';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { ListRefundsQueryDto } from '../dto/list-refunds.dto';
import type { CreateRefundDto } from '../dto/create-refund.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-abc-123';
const ACCOUNT_ID = '6776e4f1a0c1234567890abc';
const REFUND_ID = 're_3OxQ1ELkdIwHu7ix0abc';
const PAYMENT_INTENT_ID = 'pi_3OxQ1ELkdIwHu7ix0DLkiKpA';

function makeAuthContext(companyId: string = COMPANY_ID): AuthContext {
  return { companyId } as unknown as AuthContext;
}

function makeNoCompanyContext(): AuthContext {
  return {} as unknown as AuthContext;
}

type ServiceMock = {
  listRefunds: jest.Mock;
  getRefund: jest.Mock;
  createRefund: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    listRefunds: jest.fn(),
    getRefund: jest.fn(),
    createRefund: jest.fn(),
  };
}

const CREATED_AT = new Date('2025-06-01T12:00:00.000Z');

function makeListResult(
  overrides: Partial<RefundListResult> = {},
): RefundListResult {
  return {
    data: [
      {
        id: REFUND_ID,
        accountId: ACCOUNT_ID,
        providerKey: 'stripe',
        providerRefundId: REFUND_ID,
        providerPaymentId: PAYMENT_INTENT_ID,
        amountMinor: 2500,
        currency: 'aud',
        status: 'succeeded',
        providerStatus: 'succeeded',
        createdAt: CREATED_AT,
      },
    ],
    hasMore: false,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<RefundDetail> = {}): RefundDetail {
  return {
    id: REFUND_ID,
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    providerRefundId: REFUND_ID,
    providerPaymentId: PAYMENT_INTENT_ID,
    amountMinor: 2500,
    currency: 'aud',
    status: 'succeeded',
    providerStatus: 'succeeded',
    createdAt: CREATED_AT,
    paymentAmountMinor: 5000,
    refundedAmountMinor: 2500,
    remainingRefundableAmountMinor: 2500,
    ...overrides,
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

// ─── listRefunds tests ─────────────────────────────────────────────────────────

describe('PaymentsRefundsController.listRefunds()', () => {
  it('returns serialized result with ISO dates', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.listRefunds(
      makeAuthContext(),
      ACCOUNT_ID,
      makeQuery(),
    );

    expect(result.data).toHaveLength(1);
    expect(typeof result.data[0].createdAt).toBe('string');
    expect(result.data[0].createdAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext only', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    await controller.listRefunds(
      makeAuthContext('trusted-company'),
      ACCOUNT_ID,
      makeQuery(),
    );

    const [calledCompanyId] = service.listRefunds.mock.calls[0] as [string];
    expect(calledCompanyId).toBe('trusted-company');
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeNoCompanyContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'refundListing'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialsInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps PaymentProviderNotConfiguredError to 422', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to 422', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(ACCOUNT_ID, 'payment'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to 422', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rethrows unknown errors without modification', async () => {
    const service = makeServiceMock();
    const unknownError = new TypeError('unexpected type error');
    service.listRefunds.mockRejectedValueOnce(unknownError);

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.listRefunds(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(TypeError);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.listRefunds.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.listRefunds(
      makeAuthContext(),
      ACCOUNT_ID,
      makeQuery(),
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('credentials');
    expect(json).not.toContain('sk_');
  });
});

// ─── getRefund tests ───────────────────────────────────────────────────────────

describe('PaymentsRefundsController.getRefund()', () => {
  it('returns serialized detail with ISO date', async () => {
    const service = makeServiceMock();
    service.getRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.getRefund(
      makeAuthContext(),
      ACCOUNT_ID,
      REFUND_ID,
    );

    expect(result.id).toBe(REFUND_ID);
    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.getRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    await controller.getRefund(makeAuthContext(), ACCOUNT_ID, REFUND_ID);

    expect(service.getRefund).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
      REFUND_ID,
    );
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.getRefund(makeNoCompanyContext(), ACCOUNT_ID, REFUND_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.getRefund.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.getRefund(makeAuthContext(), ACCOUNT_ID, REFUND_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.getRefund.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.getRefund(makeAuthContext(), ACCOUNT_ID, REFUND_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.getRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.getRefund(
      makeAuthContext(),
      ACCOUNT_ID,
      REFUND_ID,
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_');
  });
});

// ─── createRefund tests ────────────────────────────────────────────────────────

describe('PaymentsRefundsController.createRefund()', () => {
  it('returns serialized detail with ISO date', async () => {
    const service = makeServiceMock();
    service.createRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.createRefund(
      makeAuthContext(),
      ACCOUNT_ID,
      makeCreateDto(),
    );

    expect(result.id).toBe(REFUND_ID);
    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.createRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    await controller.createRefund(
      makeAuthContext(),
      ACCOUNT_ID,
      makeCreateDto(),
    );

    expect(service.createRefund).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
      expect.objectContaining({ paymentId: PAYMENT_INTENT_ID }),
    );
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.createRefund(
        makeNoCompanyContext(),
        ACCOUNT_ID,
        makeCreateDto(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentCredentialsInvalidError (over-refund) to 422', async () => {
    const service = makeServiceMock();
    service.createRefund.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(
        'Refund amount exceeds the remaining refundable amount.',
      ),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.createRefund(makeAuthContext(), ACCOUNT_ID, makeCreateDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.createRefund.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'refundCreation'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.createRefund(makeAuthContext(), ACCOUNT_ID, makeCreateDto()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.createRefund.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );

    await expect(
      controller.createRefund(makeAuthContext(), ACCOUNT_ID, makeCreateDto()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.createRefund.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsRefundsController(
      service as unknown as PaymentsRefundsService,
    );
    const result = await controller.createRefund(
      makeAuthContext(),
      ACCOUNT_ID,
      makeCreateDto(),
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_');
  });
});
