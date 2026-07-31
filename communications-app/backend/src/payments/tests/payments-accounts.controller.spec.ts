// src/payments/tests/payments-accounts.controller.spec.ts
//
// Unit tests for PaymentsAccountsController.
// PaymentsAccountsService is fully mocked.

import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PaymentsAccountsController } from '../controllers/payments-accounts.controller';
import { PaymentsAccountsService } from '../services/payments-accounts.service';
import { PaymentAccountStatus } from '../enums/payment-account-status.enum';
import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialChannelMismatchError,
  PaymentCredentialsInvalidError,
  PaymentProviderCredentialsUnavailableError,
  PaymentProviderNotConfiguredError,
  PaymentProviderNotFoundError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentAccount } from '../contracts/payment-account.contract';
import type {
  PaymentAccountSummary,
  PaymentAccountVerificationResult,
} from '../types/payment-account-verification.types';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { ListPaymentAccountsQueryDto } from '../dto/list-payment-accounts.dto';

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
  listAccounts: jest.Mock;
  getAccount: jest.Mock;
  verifyAccount: jest.Mock;
};

function makeServiceMock(): ServiceMock {
  return {
    listAccounts: jest.fn(),
    getAccount: jest.fn(),
    verifyAccount: jest.fn(),
  };
}

function makeAccount(overrides: Partial<PaymentAccount> = {}): PaymentAccount {
  return {
    id: ACCOUNT_ID,
    providerKey: 'stripe',
    environment: 'test',
    displayName: 'Acme Corp',
    country: 'AU',
    defaultCurrency: 'aud',
    status: PaymentAccountStatus.Active,
    capabilities: [],
    connectedAt: new Date('2025-01-15T10:00:00.000Z'),
    verifiedAt: null,
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<PaymentAccountSummary> = {},
): PaymentAccountSummary {
  return {
    id: ACCOUNT_ID,
    providerKey: 'stripe',
    connectionType: 'api_key',
    tag: 'default',
    displayIdentifier: 'acct_test123',
    isActive: true,
    connectedAt: new Date('2025-01-15T10:00:00.000Z'),
    environment: null,
    ...overrides,
  };
}

function makeVerificationResult(
  overrides: Partial<PaymentAccountVerificationResult> = {},
): PaymentAccountVerificationResult {
  return {
    accountId: ACCOUNT_ID,
    providerKey: 'stripe',
    valid: true,
    status: PaymentAccountStatus.Active,
    verifiedAt: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

// ─── listAccounts ─────────────────────────────────────────────────────────────

describe('PaymentsAccountsController.listAccounts()', () => {
  it('returns paginated account summaries with ISO date strings', async () => {
    const service = makeServiceMock();
    const summary = makeSummary();
    service.listAccounts.mockResolvedValueOnce({
      data: [summary],
      total: 1,
      limit: 50,
      offset: 0,
    });

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.listAccounts(
      makeAuthContext(),
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.total).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(ACCOUNT_ID);
    expect(typeof result.data[0].connectedAt).toBe('string');
    expect(result.data[0].connectedAt).toBe('2025-01-15T10:00:00.000Z');
  });

  it('serialises null connectedAt as null', async () => {
    const service = makeServiceMock();
    service.listAccounts.mockResolvedValueOnce({
      data: [makeSummary({ connectedAt: null })],
      total: 1,
      limit: 50,
      offset: 0,
    });

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.listAccounts(
      makeAuthContext(),
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data[0].connectedAt).toBeNull();
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.listAccounts(
        makeNoCompanyContext(),
        new ListPaymentAccountsQueryDto(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes query parameters to the service', async () => {
    const service = makeServiceMock();
    service.listAccounts.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 10,
      offset: 20,
    });

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const query = new ListPaymentAccountsQueryDto();
    query.limit = 10;
    query.offset = 20;
    query.isActive = true;

    await controller.listAccounts(makeAuthContext(), query);

    expect(service.listAccounts).toHaveBeenCalledWith(COMPANY_ID, query);
  });
});

// ─── getAccount ───────────────────────────────────────────────────────────────

describe('PaymentsAccountsController.getAccount()', () => {
  it('returns live account data with ISO date strings', async () => {
    const service = makeServiceMock();
    const account = makeAccount({
      connectedAt: new Date('2025-01-15T10:00:00.000Z'),
      verifiedAt: new Date('2025-06-01T12:00:00.000Z'),
    });
    service.getAccount.mockResolvedValueOnce(account);

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.getAccount(makeAuthContext(), ACCOUNT_ID);

    expect(result.id).toBe(ACCOUNT_ID);
    expect(result.providerKey).toBe('stripe');
    expect(result.environment).toBe('test');
    expect(result.status).toBe(PaymentAccountStatus.Active);
    expect(result.connectedAt).toBe('2025-01-15T10:00:00.000Z');
    expect(result.verifiedAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('serialises null connectedAt and verifiedAt as null', async () => {
    const service = makeServiceMock();
    service.getAccount.mockResolvedValueOnce(
      makeAccount({ connectedAt: null, verifiedAt: null }),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.getAccount(makeAuthContext(), ACCOUNT_ID);

    expect(result.connectedAt).toBeNull();
    expect(result.verifiedAt).toBeNull();
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeNoCompanyContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to NotFoundException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentProviderNotConfiguredError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentProviderNotConfiguredError('stripe'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderCredentialsUnavailableError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentProviderCredentialsUnavailableError('stripe'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialChannelMismatchError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentCredentialChannelMismatchError(ACCOUNT_ID, 'payment'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCapabilityNotSupportedError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentCapabilityNotSupportedError('stripe', 'account'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentCredentialsInvalidError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError('bad key'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to ServiceUnavailableException', async () => {
    const service = makeServiceMock();
    service.getAccount.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe', 'timeout'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rethrows unknown errors', async () => {
    const service = makeServiceMock();
    const unknownError = new Error('Totally unexpected');
    service.getAccount.mockRejectedValueOnce(unknownError);

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.getAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow('Totally unexpected');
  });
});

// ─── verifyAccount ────────────────────────────────────────────────────────────

describe('PaymentsAccountsController.verifyAccount()', () => {
  it('returns verification result with ISO verifiedAt string', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockResolvedValueOnce(makeVerificationResult());

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.verifyAccount(
      makeAuthContext(),
      ACCOUNT_ID,
    );

    expect(result.valid).toBe(true);
    expect(result.accountId).toBe(ACCOUNT_ID);
    expect(result.providerKey).toBe('stripe');
    expect(result.status).toBe(PaymentAccountStatus.Active);
    expect(typeof result.verifiedAt).toBe('string');
    expect(result.verifiedAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('throws UnauthorizedException when ctx has no companyId', async () => {
    const service = makeServiceMock();
    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.verifyAccount(makeNoCompanyContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('maps PaymentProviderNotFoundError to NotFoundException', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockRejectedValueOnce(
      new PaymentProviderNotFoundError('unknown'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.verifyAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps PaymentCredentialsInvalidError to UnprocessableEntityException', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError('expired key'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.verifyAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps PaymentProviderUnavailableError to ServiceUnavailableException', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe', 'connection refused'),
    );

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.verifyAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('calls service with companyId and accountId', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockResolvedValueOnce(makeVerificationResult());

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    await controller.verifyAccount(makeAuthContext(), ACCOUNT_ID);

    expect(service.verifyAccount).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('rethrows unknown errors', async () => {
    const service = makeServiceMock();
    const unknownError = new TypeError('Unexpected type error');
    service.verifyAccount.mockRejectedValueOnce(unknownError);

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );

    await expect(
      controller.verifyAccount(makeAuthContext(), ACCOUNT_ID),
    ).rejects.toThrow(TypeError);
  });
});

// ─── HTTP response serialisation ──────────────────────────────────────────────

describe('HTTP response serialisation', () => {
  it('getAccount response does not include raw Date objects', async () => {
    const service = makeServiceMock();
    service.getAccount.mockResolvedValueOnce(makeAccount());

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.getAccount(makeAuthContext(), ACCOUNT_ID);

    // connectedAt and verifiedAt must be strings, not Date objects
    expect(result.connectedAt).not.toBeInstanceOf(Date);
    expect(result.verifiedAt).not.toBeInstanceOf(Date);
  });

  it('verifyAccount response verifiedAt is an ISO string', async () => {
    const service = makeServiceMock();
    service.verifyAccount.mockResolvedValueOnce(makeVerificationResult());

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.verifyAccount(
      makeAuthContext(),
      ACCOUNT_ID,
    );

    expect(typeof result.verifiedAt).toBe('string');
    expect(new Date(result.verifiedAt).toISOString()).toBe(result.verifiedAt);
  });

  it('listAccounts response connectedAt fields are ISO strings or null', async () => {
    const service = makeServiceMock();
    service.listAccounts.mockResolvedValueOnce({
      data: [
        makeSummary({ connectedAt: new Date('2025-03-01T00:00:00.000Z') }),
        makeSummary({ id: 'other-id', connectedAt: null }),
      ],
      total: 2,
      limit: 50,
      offset: 0,
    });

    const controller = new PaymentsAccountsController(
      service as unknown as PaymentsAccountsService,
    );
    const result = await controller.listAccounts(
      makeAuthContext(),
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data[0].connectedAt).toBe('2025-03-01T00:00:00.000Z');
    expect(result.data[1].connectedAt).toBeNull();
  });
});
