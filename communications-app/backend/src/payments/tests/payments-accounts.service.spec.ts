// src/payments/tests/payments-accounts.service.spec.ts
//
// Unit tests for PaymentsAccountsService.
// All DB models and PaymentsService are fully mocked.

import { Types } from 'mongoose';
import { PaymentsAccountsService } from '../services/payments-accounts.service';
import { PaymentsService } from '../services/payments.service';
import { PaymentAccountStatus } from '../enums/payment-account-status.enum';
import { PaymentCapability, CapabilityStatus } from '../enums/payment.enums';
import {
  PaymentCapabilityNotSupportedError,
  PaymentCredentialsInvalidError,
  PaymentProviderUnavailableError,
} from '../errors/payment.errors';
import type { PaymentAccount } from '../contracts/payment-account.contract';
import type { PaymentAccountVerificationResult } from '../types/payment-account-verification.types';
import type { PaymentProviderRuntimeContext } from '../types/payment.types';
import { ListPaymentAccountsQueryDto } from '../dto/list-payment-accounts.dto';

// ─── Test doubles ─────────────────────────────────────────────────────────────

const COMPANY_ID = new Types.ObjectId().toHexString();
const ACCOUNT_ID = new Types.ObjectId().toHexString();
const CCP_ID = new Types.ObjectId();
const CRED_ID = new Types.ObjectId();

function makeMockCcpModel(docs: unknown[] = []) {
  const execFn = jest.fn().mockResolvedValue(docs);
  const leanFn = jest.fn().mockReturnValue({ exec: execFn });
  const populateFn = jest.fn().mockReturnThis();
  return {
    find: jest.fn().mockReturnValue({
      populate: populateFn,
      lean: leanFn,
    }),
    _execFn: execFn,
    _populateFn: populateFn,
  };
}

function makeMockCredModel(
  findDocs: unknown[] = [],
  countResult = 0,
  findByIdResult: unknown = null,
) {
  const execFind = jest.fn().mockResolvedValue(findDocs);
  const execFindById = jest.fn().mockResolvedValue(findByIdResult);

  return {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue({ exec: execFind }),
    }),
    countDocuments: jest.fn().mockResolvedValue(countResult),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue({ exec: execFindById }),
    }),
  };
}

function makeAccountProvider() {
  return {
    providerKey: 'stripe',
    displayName: 'Stripe',
    description: 'Test',
    supportsAccount: true as const,
    getCapabilities: () => ({
      capabilities: { [PaymentCapability.Account]: CapabilityStatus.Available },
    }),
    getMetadata: () => ({
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: 'Test',
      connectionType: 'api_key',
    }),
    getAccount: jest.fn(),
    verifyConnection: jest.fn(),
    validateConnection: jest.fn(),
    supportsConnection: true as const,
  };
}

function makeRuntime(
  provider: ReturnType<typeof makeAccountProvider>,
): PaymentProviderRuntimeContext {
  return {
    accountId: ACCOUNT_ID,
    companyId: COMPANY_ID,
    providerKey: 'stripe',
    environment: 'test' as const,
    provider,
    credentials: { secretKey: 'sk_test_x', mode: 'test' },
  };
}

function makePaymentsService(resolveRuntime: jest.Mock): PaymentsService {
  return {
    resolveRuntime,
    assertCapability: jest.fn(),
    listProviders: jest.fn(),
    getCapabilities: jest.fn(),
    resolveProvider: jest.fn(),
  } as unknown as PaymentsService;
}

// ─── listAccounts ─────────────────────────────────────────────────────────────

describe('PaymentsAccountsService.listAccounts()', () => {
  it('returns empty data when no payment CCPs exist', async () => {
    const ccpModel = makeMockCcpModel([]);
    const credModel = makeMockCredModel();
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as Parameters<
        typeof PaymentsAccountsService.prototype.listAccounts
      >[0] extends never
        ? never
        : never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns empty data when CCPs exist but none are for the payment channel', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'email' },
        providerId: { providerKey: 'smtp', connectionType: 'smtp' },
      },
    ]);
    const credModel = makeMockCredModel();
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data).toHaveLength(0);
  });

  it('returns summaries for payment-channel credentials', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    const credDoc = {
      _id: CRED_ID,
      tag: 'default',
      isActive: true,
      displayIdentifier: 'acct_test123',
      mode: 'test',
      createdAt: new Date('2025-01-01'),
      companyChannelProviderId: CCP_ID,
    };
    const credModel = makeMockCredModel([credDoc], 1, null);
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);

    const summary = result.data[0];
    expect(summary.id).toBe(CRED_ID.toHexString());
    expect(summary.providerKey).toBe('stripe');
    expect(summary.connectionType).toBe('api_key');
    expect(summary.tag).toBe('default');
    expect(summary.displayIdentifier).toBe('acct_test123');
    expect(summary.isActive).toBe(true);
    expect(summary.connectedAt).toEqual(new Date('2025-01-01'));
    // environment comes directly from the stored mode field — never from displayIdentifier
    expect(summary.environment).toBe('test');
  });

  it('environment is "test" when mode field is "test"', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    const credModel = makeMockCredModel(
      [
        {
          _id: CRED_ID,
          tag: 'default',
          isActive: true,
          mode: 'test',
          createdAt: new Date(),
          companyChannelProviderId: CCP_ID,
        },
      ],
      1,
      null,
    );
    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      makePaymentsService(jest.fn()),
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data[0].environment).toBe('test');
  });

  it('environment is "live" when mode field is "live"', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    const credModel = makeMockCredModel(
      [
        {
          _id: CRED_ID,
          tag: 'live',
          isActive: true,
          mode: 'live',
          createdAt: new Date(),
          companyChannelProviderId: CCP_ID,
        },
      ],
      1,
      null,
    );
    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      makePaymentsService(jest.fn()),
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data[0].environment).toBe('live');
  });

  it('environment is null when mode field is absent (legacy credential)', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    // Simulate a legacy credential that has no mode field (displayIdentifier only)
    const credModel = makeMockCredModel(
      [
        {
          _id: CRED_ID,
          tag: 'default',
          isActive: true,
          displayIdentifier: 'pk_test_some_key', // displayIdentifier is NOT used for environment
          // mode is intentionally absent
          createdAt: new Date(),
          companyChannelProviderId: CCP_ID,
        },
      ],
      1,
      null,
    );
    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      makePaymentsService(jest.fn()),
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    // displayIdentifier is NOT used for environment — mode must be the source
    expect(result.data[0].environment).toBeNull();
  });

  it('applies default limit=50 and offset=0', async () => {
    const ccpModel = makeMockCcpModel([]);
    const credModel = makeMockCredModel();
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it('uses query.isActive filter when provided', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    const credModel = makeMockCredModel([], 0, null);
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const query = new ListPaymentAccountsQueryDto();
    query.isActive = false;

    await service.listAccounts(COMPANY_ID, query);

    // isActive filter was passed — the find() was called with isActive:false filter
    const findCallArgs = credModel.find.mock.calls[0] as unknown[];
    const findArgs = findCallArgs[0] as Record<string, unknown>;
    expect(findArgs['isActive']).toBe(false);
  });

  it('treats missing isActive on credential doc as active=true', async () => {
    const ccpModel = makeMockCcpModel([
      {
        _id: CCP_ID,
        channelId: { channelKey: 'payment' },
        providerId: { providerKey: 'stripe', connectionType: 'api_key' },
      },
    ]);
    const credDoc = {
      _id: CRED_ID,
      tag: 'legacy',
      // isActive intentionally absent
      createdAt: new Date(),
      companyChannelProviderId: CCP_ID,
    };
    const credModel = makeMockCredModel([credDoc], 1, null);
    const paymentsService = makePaymentsService(jest.fn());

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.listAccounts(
      COMPANY_ID,
      new ListPaymentAccountsQueryDto(),
    );

    expect(result.data[0].isActive).toBe(true);
  });
});

// ─── getAccount ───────────────────────────────────────────────────────────────

describe('PaymentsAccountsService.getAccount()', () => {
  it('calls resolveRuntime with companyId and accountId', async () => {
    const provider = makeAccountProvider();
    const mockAccount: PaymentAccount = {
      id: ACCOUNT_ID,
      providerKey: 'stripe',
      environment: 'test',
      displayName: 'Acme',
      country: 'AU',
      defaultCurrency: 'aud',
      status: PaymentAccountStatus.Active,
      capabilities: [],
      connectedAt: null,
      verifiedAt: null,
    };
    provider.getAccount.mockResolvedValueOnce(mockAccount);

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel([], 0, {
      createdAt: new Date('2025-01-01'),
    });
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await service.getAccount(COMPANY_ID, ACCOUNT_ID);

    expect(resolveRuntime).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('enriches connectedAt from ProviderCredentials.createdAt', async () => {
    const provider = makeAccountProvider();
    const createdAt = new Date('2024-06-15');
    const mockAccount: PaymentAccount = {
      id: ACCOUNT_ID,
      providerKey: 'stripe',
      environment: 'test',
      displayName: 'Acme',
      country: 'AU',
      defaultCurrency: 'aud',
      status: PaymentAccountStatus.Active,
      capabilities: [],
      connectedAt: null,
      verifiedAt: null,
    };
    provider.getAccount.mockResolvedValueOnce(mockAccount);

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel([], 0, { createdAt });
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.getAccount(COMPANY_ID, ACCOUNT_ID);

    expect(result.connectedAt).toEqual(createdAt);
  });

  it('connectedAt is null when credential doc has no createdAt', async () => {
    const provider = makeAccountProvider();
    const mockAccount: PaymentAccount = {
      id: ACCOUNT_ID,
      providerKey: 'stripe',
      environment: 'test',
      displayName: null,
      country: null,
      defaultCurrency: null,
      status: PaymentAccountStatus.Pending,
      capabilities: [],
      connectedAt: null,
      verifiedAt: null,
    };
    provider.getAccount.mockResolvedValueOnce(mockAccount);

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel([], 0, null);
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.getAccount(COMPANY_ID, ACCOUNT_ID);

    expect(result.connectedAt).toBeNull();
  });

  it('throws PaymentCapabilityNotSupportedError when provider does not support account', async () => {
    const nonAccountProvider = {
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: 'Test',
      getCapabilities: () => ({ capabilities: {} }),
      getMetadata: () => ({
        providerKey: 'stripe',
        displayName: 'Stripe',
        description: 'Test',
        connectionType: 'api_key',
      }),
    };

    const runtime: PaymentProviderRuntimeContext = {
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test' as const,
      provider: nonAccountProvider,
      credentials: {},
    };

    const resolveRuntime = jest.fn().mockResolvedValueOnce(runtime);
    const credModel = makeMockCredModel();
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await expect(service.getAccount(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );
  });

  it('propagates PaymentCredentialsInvalidError from provider', async () => {
    const provider = makeAccountProvider();
    provider.getAccount.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError('bad key'),
    );

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel([], 0, null);
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await expect(service.getAccount(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });

  it('propagates PaymentProviderUnavailableError from provider', async () => {
    const provider = makeAccountProvider();
    provider.getAccount.mockRejectedValueOnce(
      new PaymentProviderUnavailableError('stripe', 'timeout'),
    );

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel([], 0, null);
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await expect(service.getAccount(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentProviderUnavailableError,
    );
  });
});

// ─── verifyAccount ────────────────────────────────────────────────────────────

describe('PaymentsAccountsService.verifyAccount()', () => {
  it('returns a valid verification result', async () => {
    const provider = makeAccountProvider();
    const mockResult: PaymentAccountVerificationResult = {
      accountId: ACCOUNT_ID,
      providerKey: 'stripe',
      valid: true,
      status: PaymentAccountStatus.Active,
      verifiedAt: new Date(),
    };
    provider.verifyConnection.mockResolvedValueOnce(mockResult);

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel();
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    const result = await service.verifyAccount(COMPANY_ID, ACCOUNT_ID);

    expect(result.valid).toBe(true);
    expect(result.accountId).toBe(ACCOUNT_ID);
    expect(result.providerKey).toBe('stripe');
    expect(result.verifiedAt).toBeInstanceOf(Date);
  });

  it('calls resolveRuntime with companyId and accountId', async () => {
    const provider = makeAccountProvider();
    const mockResult: PaymentAccountVerificationResult = {
      accountId: ACCOUNT_ID,
      providerKey: 'stripe',
      valid: true,
      status: PaymentAccountStatus.Active,
      verifiedAt: new Date(),
    };
    provider.verifyConnection.mockResolvedValueOnce(mockResult);

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel();
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await service.verifyAccount(COMPANY_ID, ACCOUNT_ID);

    expect(resolveRuntime).toHaveBeenCalledWith(COMPANY_ID, ACCOUNT_ID);
  });

  it('throws PaymentCapabilityNotSupportedError when provider does not support account', async () => {
    const nonAccountProvider = {
      providerKey: 'stripe',
      displayName: 'Stripe',
      description: 'Test',
      getCapabilities: () => ({ capabilities: {} }),
      getMetadata: () => ({
        providerKey: 'stripe',
        displayName: 'Stripe',
        description: 'Test',
        connectionType: 'api_key',
      }),
    };

    const runtime: PaymentProviderRuntimeContext = {
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      providerKey: 'stripe',
      environment: 'test' as const,
      provider: nonAccountProvider,
      credentials: {},
    };

    const resolveRuntime = jest.fn().mockResolvedValueOnce(runtime);
    const credModel = makeMockCredModel();
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await expect(service.verifyAccount(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCapabilityNotSupportedError,
    );
  });

  it('propagates PaymentCredentialsInvalidError from provider', async () => {
    const provider = makeAccountProvider();
    provider.verifyConnection.mockRejectedValueOnce(
      new PaymentCredentialsInvalidError('revoked'),
    );

    const resolveRuntime = jest
      .fn()
      .mockResolvedValueOnce(makeRuntime(provider));
    const credModel = makeMockCredModel();
    const ccpModel = makeMockCcpModel();
    const paymentsService = makePaymentsService(resolveRuntime);

    const service = new PaymentsAccountsService(
      ccpModel as unknown as never,
      credModel as unknown as never,
      paymentsService,
    );

    await expect(service.verifyAccount(COMPANY_ID, ACCOUNT_ID)).rejects.toThrow(
      PaymentCredentialsInvalidError,
    );
  });
});
