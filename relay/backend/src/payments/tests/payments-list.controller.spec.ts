// src/payments/tests/payments-list.controller.spec.ts
//
// Unit tests for PaymentsListController.
// PaymentsListService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentsListController } from '../controllers/payments-list.controller';
import { PaymentsListService } from '../services/payments-list.service';
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
  PaymentListResult,
  PaymentDetail,
} from '../contracts/payment-list.contract';
import { PaymentCanonicalStatus } from '../enums/payment-canonical-status.enum';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import type { ListPaymentsQueryDto } from '../dto/list-payments.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-abc-123';
const ACCOUNT_ID = '6776e4f1a0c1234567890abc';
const PAYMENT_ID = 'pi_3OxQ1ELkdIwHu7ix0DLkiKpA';

function makeAuthContext(companyId: string = COMPANY_ID): AuthContext {
  return { companyId } as unknown as AuthContext;
}

function makeNoCompanyContext(): AuthContext {
  return {} as unknown as AuthContext;
}

type ServiceMock = {
  listPayments: jest.Mock;
  getPayment: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    listPayments: jest.fn(),
    getPayment: jest.fn(),
  };
}

const CREATED_AT = new Date('2025-06-01T12:00:00.000Z');

function makeListResult(
  overrides: Partial<PaymentListResult> = {},
): PaymentListResult {
  return {
    data: [
      {
        id: PAYMENT_ID,
        accountId: ACCOUNT_ID,
        providerKey: 'stripe',
        providerPaymentId: PAYMENT_ID,
        amountMinor: 5000,
        currency: 'aud',
        status: PaymentCanonicalStatus.Succeeded,
        providerStatus: 'succeeded',
        createdAt: CREATED_AT,
        requiresUserAction: false,
      },
    ],
    hasMore: false,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    id: PAYMENT_ID,
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    providerPaymentId: PAYMENT_ID,
    amountMinor: 5000,
    currency: 'aud',
    status: PaymentCanonicalStatus.Succeeded,
    providerStatus: 'succeeded',
    createdAt: CREATED_AT,
    requiresUserAction: false,
    captureMethod: 'automatic',
    amountReceivedMinor: 5000,
    ...overrides,
  };
}

function makeQuery(
  overrides: Partial<ListPaymentsQueryDto> = {},
): ListPaymentsQueryDto {
  return { limit: 20, ...overrides };
}

// ─── listPayments tests ───────────────────────────────────────────────────────

describe('PaymentsListController.listPayments()', () => {
  it('returns serialized result with ISO dates', async () => {
    const service = makeServiceMock();
    service.listPayments.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    const result = await controller.listPayments(
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
    service.listPayments.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    await controller.listPayments(
      makeAuthContext('trusted-company'),
      ACCOUNT_ID,
      makeQuery(),
    );

    const [calledCompanyId] = service.listPayments.mock.calls[0] as [
      string,
      string,
    ];
    expect(calledCompanyId).toBe('trusted-company');
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeNoCompanyContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'paymentListing'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialsInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps PaymentProviderNotConfiguredError to 422', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to 422', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(ACCOUNT_ID, 'payment'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to 422', async () => {
    const service = makeServiceMock();
    service.listPayments.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rethrows unknown errors without modification', async () => {
    const service = makeServiceMock();
    const unknownError = new TypeError('unexpected type error');
    service.listPayments.mockRejectedValueOnce(unknownError);

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.listPayments(makeAuthContext(), ACCOUNT_ID, makeQuery()),
    ).rejects.toThrow(TypeError);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.listPayments.mockResolvedValueOnce(makeListResult());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    const result = await controller.listPayments(
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

// ─── getPayment tests ─────────────────────────────────────────────────────────

describe('PaymentsListController.getPayment()', () => {
  it('returns serialized detail with ISO date', async () => {
    const service = makeServiceMock();
    service.getPayment.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    const result = await controller.getPayment(
      makeAuthContext(),
      ACCOUNT_ID,
      PAYMENT_ID,
    );

    expect(result.id).toBe(PAYMENT_ID);
    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.getPayment.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    await controller.getPayment(makeAuthContext(), ACCOUNT_ID, PAYMENT_ID);

    expect(service.getPayment).toHaveBeenCalledWith(
      COMPANY_ID,
      ACCOUNT_ID,
      PAYMENT_ID,
    );
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.getPayment(makeNoCompanyContext(), ACCOUNT_ID, PAYMENT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.getPayment.mockResolvedValueOnce(makeDetail());

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );
    const result = await controller.getPayment(
      makeAuthContext(),
      ACCOUNT_ID,
      PAYMENT_ID,
    );
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('sk_');
  });

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.getPayment.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.getPayment(makeAuthContext(), ACCOUNT_ID, PAYMENT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.getPayment.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsListController(
      service as unknown as PaymentsListService,
    );

    await expect(
      controller.getPayment(makeAuthContext(), ACCOUNT_ID, PAYMENT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
