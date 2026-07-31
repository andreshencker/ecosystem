// src/payments/tests/payments-balance.controller.spec.ts
//
// Unit tests for PaymentsBalanceController.
// PaymentsBalanceService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentsBalanceController } from '../controllers/payments-balance.controller';
import { PaymentsBalanceService } from '../services/payments-balance.service';
import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentBalance } from '../contracts/payment-balance.contract';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COMPANY_ID = 'company-abc-123';
const ACCOUNT_ID = '6776e4f1a0c1234567890abc';

function makeAuthContext(companyId: string = COMPANY_ID): AuthContext {
  return { companyId } as unknown as AuthContext;
}

function makeNoCompanyContext(): AuthContext {
  return {} as unknown as AuthContext;
}

type ServiceMock = {
  getBalance: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return { getBalance: jest.fn() };
}

function makeBalance(overrides: Partial<PaymentBalance> = {}): PaymentBalance {
  return {
    accountId: ACCOUNT_ID,
    available: [{ amountMinor: 10000, currency: 'aud', sourceType: 'card' }],
    pending: [],
    reserved: [],
    retrievedAt: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsBalanceController.getBalance()', () => {
  it('returns balance with retrievedAt serialised as ISO string', async () => {
    const service = makeServiceMock();
    service.getBalance.mockResolvedValueOnce(makeBalance());

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );
    const result = await controller.getBalance(makeAuthContext(), ACCOUNT_ID);

    expect(result.accountId).toBe(ACCOUNT_ID);
    expect(typeof result.retrievedAt).toBe('string');
    expect(result.retrievedAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('calls service with companyId from AuthContext', async () => {
    const service = makeServiceMock();
    service.getBalance.mockResolvedValueOnce(makeBalance());

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );
    await controller.getBalance(makeAuthContext(), ACCOUNT_ID);

    expect(service.getBalance).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('never accepts companyId from the URL params — only from AuthContext', async () => {
    const service = makeServiceMock();
    service.getBalance.mockResolvedValueOnce(makeBalance());

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );
    await controller.getBalance(makeAuthContext('trusted-company'), ACCOUNT_ID);

    const [calledCompanyId] = service.getBalance.mock.calls[0] as [
      string,
      string,
    ];
    expect(calledCompanyId).toBe('trusted-company');
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeNoCompanyContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('serialises available balance lines correctly', async () => {
    const service = makeServiceMock();
    service.getBalance.mockResolvedValueOnce(
      makeBalance({
        available: [
          { amountMinor: 5000, currency: 'aud', sourceType: 'card' },
          { amountMinor: 3000, currency: 'usd', sourceType: 'bank_transfer' },
        ],
      }),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );
    const result = await controller.getBalance(makeAuthContext(), ACCOUNT_ID);

    expect(result.available).toHaveLength(2);
    expect(result.available[0].amountMinor).toBe(5000);
    expect(result.available[0].currency).toBe('aud');
  });

  // ─── Error → HTTP mapping ──────────────────────────────────────────────────

  it('maps PaymentProviderNotFoundError to 404', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderNotConfiguredError to 422', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError to 422', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'balance'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialsInvalidError to 422', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError(),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to 503', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to 422', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to 422', async () => {
    const service = makeServiceMock();
    service.getBalance.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(ACCOUNT_ID, 'payment'),
    );

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rethrows unknown errors without modification', async () => {
    const service = makeServiceMock();
    const unknownError = new TypeError('Unexpected type error');
    service.getBalance.mockRejectedValueOnce(unknownError);

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );

    await expect(
      controller.getBalance(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(TypeError);
  });

  it('response does not contain credential values', async () => {
    const service = makeServiceMock();
    service.getBalance.mockResolvedValueOnce(makeBalance());

    const controller = new PaymentsBalanceController(
      service as unknown as PaymentsBalanceService,
    );
    const result = await controller.getBalance(makeAuthContext(), ACCOUNT_ID);
    const json = JSON.stringify(result);

    expect(json).not.toContain('secretKey');
    expect(json).not.toContain('credentials');
    expect(json).not.toContain('sk_');
  });
});
