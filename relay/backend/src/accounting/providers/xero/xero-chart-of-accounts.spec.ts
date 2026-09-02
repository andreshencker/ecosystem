// src/accounting/providers/xero/xero-chart-of-accounts.spec.ts
//
// Unit tests for XeroAccountingProvider — Chart of Accounts operations.
//
// All Xero HTTP calls are mocked via jest.spyOn(global, 'fetch').
// XeroConnectionService and XeroOrganisationsService are fully mocked.
// No real network calls, database writes, or credential values.

import { Test, TestingModule } from '@nestjs/testing';

import { XeroAccountingProvider } from './xero-accounting.provider';
import { XeroConnectionService } from './xero.connection.service';
import { XeroOrganisationsService } from './xero-organisations.service';
import {
  AccountingResourceNotFoundError,
  AccountingProviderUnavailableError,
  AccountingSystemAccountError,
  AccountingAccountCannotBeDeletedError,
  AccountingValidationError,
  AccountingDuplicateCodeError,
  AccountingReauthorisationRequiredError,
} from '../../errors/accounting.errors';
import type { AccountingProviderContext } from '../../types/accounting.types';
import { XERO_ACCOUNTING_BASE_URL } from './xero.oauth.types';

// ─── Mock factories ────────────────────────────────────────────────────────────

const mockConnectionService = () => ({
  ensureFreshAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
});

const mockOrgService = () => ({
  resolveOrganisation: jest.fn().mockResolvedValue({
    tenantId: 'mock-tenant-id',
    tenantName: 'Mock Org',
  }),
});

// ─── Context factory ──────────────────────────────────────────────────────────

function makeContext(
  overrides: Partial<AccountingProviderContext> = {},
): AccountingProviderContext {
  return {
    providerKey: 'xero',
    connectionType: 'oauth',
    credentialsId: 'cred-123',
    isActive: true,
    credentials: {
      tenantId: 'mock-tenant-id',
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      // accounting.settings is the write scope — present by default so write tests pass.
      scopes:
        'accounting.reports.banksummary.read accounting.settings offline_access openid',
    },
    ...overrides,
  };
}

/** Context that lacks accounting.settings write scope (read-only token). */
function makeReadOnlyContext(
  overrides: Partial<AccountingProviderContext> = {},
): AccountingProviderContext {
  return makeContext({
    ...overrides,
    credentials: {
      tenantId: 'mock-tenant-id',
      accessToken: 'read-only-token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      // Only read scope — what tokens issued before the write-scope upgrade look like.
      scopes:
        'accounting.reports.banksummary.read accounting.settings.read offline_access openid',
    },
  });
}

// ─── Sample Xero API response data ────────────────────────────────────────────

const sampleXeroAccount = {
  AccountID: 'acc-uuid-1234',
  Code: '200',
  Name: 'Sales',
  Type: 'REVENUE',
  Class: 'REVENUE',
  TaxType: 'OUTPUT2',
  Status: 'ACTIVE',
  Description: 'Revenue from sales',
  CurrencyCode: 'AUD',
  EnablePaymentsToAccount: false,
  ShowInExpenseClaims: false,
  SystemAccount: '',
};

const sampleXeroSystemAccount = {
  AccountID: 'sys-uuid-9999',
  Code: 'RETAINED',
  Name: 'Retained Earnings',
  Type: 'EQUITY',
  Class: 'EQUITY',
  Status: 'ACTIVE',
  SystemAccount: 'RETAINEDEARNINGS',
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(''),
  } as any);
}

function mockFetchStatus(status: number, body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any);
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('XeroAccountingProvider — Chart of Accounts', () => {
  let provider: XeroAccountingProvider;
  let connectionService: ReturnType<typeof mockConnectionService>;
  let orgService: ReturnType<typeof mockOrgService>;

  beforeEach(async () => {
    connectionService = mockConnectionService();
    orgService = mockOrgService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroAccountingProvider,
        { provide: XeroConnectionService, useFactory: () => connectionService },
        { provide: XeroOrganisationsService, useFactory: () => orgService },
      ],
    }).compile();

    provider = module.get<XeroAccountingProvider>(XeroAccountingProvider);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── 1. supportsChartOfAccounts flag ──────────────────────────────────────────

  describe('supportsChartOfAccounts', () => {
    it('is true', () => {
      expect(provider.supportsChartOfAccounts).toBe(true);
    });
  });

  // ─── 2. listAccounts — happy path ─────────────────────────────────────────────

  describe('listAccounts', () => {
    it('returns mapped AccountSummary array', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data).toHaveLength(1);
      const account = result.data[0];
      expect(account.id).toBe('acc-uuid-1234');
      expect(account.code).toBe('200');
      expect(account.name).toBe('Sales');
      expect(account.type).toBe('REVENUE');
      expect(account.class).toBe('REVENUE');
      expect(account.taxType).toBe('OUTPUT2');
      expect(account.status).toBe('active');
    });

    it('does not include tenantId in AccountSummary', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = await provider.listAccounts(makeContext(), {});

      const account = result.data[0] as any;
      expect(account.tenantId).toBeUndefined();
      expect(account.accessToken).toBeUndefined();
      expect(account.refreshToken).toBeUndefined();
    });

    it('sets hasMore when results exceed limit', async () => {
      const accounts = Array.from({ length: 6 }, (_, i) => ({
        ...sampleXeroAccount,
        AccountID: `acc-${i}`,
        Name: `Account ${i}`,
      }));
      mockFetchOk({ Accounts: accounts });

      const result = await provider.listAccounts(makeContext(), { limit: 5 });

      expect(result.data).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('adds includeArchived=true when status is all', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), { status: 'all' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('includeArchived=true');
    });

    it('adds Status==ARCHIVED where clause when status is archived', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), { status: 'archived' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('ARCHIVED');
    });

    it('adds type filter when type param is provided', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), { type: 'BANK' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('BANK');
    });

    it('adds searchTerm when search param is provided', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), { search: 'sales' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('searchTerm');
    });

    it('returns empty data when Accounts is undefined', async () => {
      mockFetchOk({});

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('sends Authorization header with Bearer token', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), {});

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['Authorization']).toBe('Bearer mock-access-token');
    });

    it('sends xero-tenant-id header', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), {});

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['xero-tenant-id']).toBe('mock-tenant-id');
    });
  });

  // ─── 3. getAccount ────────────────────────────────────────────────────────────

  describe('getAccount', () => {
    it('returns AccountDetail for a known account', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = await provider.getAccount(makeContext(), 'acc-uuid-1234');

      expect(result.id).toBe('acc-uuid-1234');
      expect(result.name).toBe('Sales');
      expect(result.description).toBe('Revenue from sales');
      expect(result.currency).toBe('AUD');
    });

    it('throws AccountingResourceNotFoundError when account not found', async () => {
      mockFetchOk({ Accounts: [] });

      await expect(
        provider.getAccount(makeContext(), 'nonexistent-id'),
      ).rejects.toThrow(AccountingResourceNotFoundError);
    });

    it('does not include tenantId in AccountDetail', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = (await provider.getAccount(
        makeContext(),
        'acc-uuid-1234',
      )) as any;

      expect(result.tenantId).toBeUndefined();
      expect(result.accessToken).toBeUndefined();
    });

    it('URL contains the accountId (URL-encoded)', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.getAccount(makeContext(), 'acc-uuid-1234');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('acc-uuid-1234');
    });
  });

  // ─── 4. createAccount ─────────────────────────────────────────────────────────

  describe('createAccount', () => {
    it('sends PUT request to /Accounts', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'Sales',
        type: 'REVENUE',
      });

      expect(fetchSpy.mock.calls[0][1]?.method).toBe('PUT');
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/Accounts');
      expect(url).not.toContain('/Accounts/');
    });

    it('sends correct body with Name and Type', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'My Revenue',
        type: 'revenue',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.Accounts[0].Name).toBe('My Revenue');
      expect(body.Accounts[0].Type).toBe('REVENUE'); // uppercased
    });

    it('includes optional Code field when provided', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'Sales',
        type: 'REVENUE',
        code: '200',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.Accounts[0].Code).toBe('200');
    });

    it('does NOT include Code field when code is undefined', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'Sales',
        type: 'REVENUE',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect('Code' in body.Accounts[0]).toBe(false);
    });

    it('includes optional taxType, description, currency when provided', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'Sales',
        type: 'REVENUE',
        taxType: 'OUTPUT2',
        description: 'My desc',
        currency: 'USD',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      const acc = body.Accounts[0];
      expect(acc.TaxType).toBe('OUTPUT2');
      expect(acc.Description).toBe('My desc');
      expect(acc.CurrencyCode).toBe('USD');
    });

    it('returns AccountDetail of created account', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = await provider.createAccount(makeContext(), {
        name: 'Sales',
        type: 'REVENUE',
      });

      expect(result.id).toBe('acc-uuid-1234');
    });

    it('throws AccountingProviderUnavailableError when response has no accounts', async () => {
      mockFetchOk({ Accounts: [] });

      await expect(
        provider.createAccount(makeContext(), { name: 'X', type: 'REVENUE' }),
      ).rejects.toThrow(AccountingProviderUnavailableError);
    });
  });

  // ─── 5. updateAccount ─────────────────────────────────────────────────────────

  describe('updateAccount', () => {
    it('sends POST request to /Accounts/:accountId', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.updateAccount(makeContext(), 'acc-uuid-1234', {
        name: 'Updated Sales',
      });

      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('acc-uuid-1234');
    });

    it('sends correct body with only provided fields', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.updateAccount(makeContext(), 'acc-uuid-1234', {
        name: 'Updated Name',
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.Name).toBe('Updated Name');
      // Code was not provided — must not appear
      expect('Code' in body).toBe(false);
    });

    it('returns AccountDetail of updated account', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });

      const result = await provider.updateAccount(
        makeContext(),
        'acc-uuid-1234',
        {
          name: 'Updated',
        },
      );

      expect(result.id).toBe('acc-uuid-1234');
    });

    it('throws AccountingResourceNotFoundError when account not returned', async () => {
      mockFetchOk({ Accounts: [] });

      await expect(
        provider.updateAccount(makeContext(), 'acc-uuid-1234', { name: 'X' }),
      ).rejects.toThrow(AccountingResourceNotFoundError);
    });
  });

  // ─── 6. archiveAccount ────────────────────────────────────────────────────────

  describe('archiveAccount', () => {
    it('sends POST with Status=ARCHIVED body', async () => {
      const fetchSpy = mockFetchOk({
        Accounts: [{ ...sampleXeroAccount, Status: 'ARCHIVED' }],
      });

      await provider.archiveAccount(makeContext(), 'acc-uuid-1234');

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.Status).toBe('ARCHIVED');
    });

    it('returns { id, archived: true }', async () => {
      mockFetchOk({ Accounts: [{ ...sampleXeroAccount, Status: 'ARCHIVED' }] });

      const result = await provider.archiveAccount(
        makeContext(),
        'acc-uuid-1234',
      );

      expect(result.id).toBe('acc-uuid-1234');
      expect(result.archived).toBe(true);
    });
  });

  // ─── 7. deleteAccount — success ───────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('returns { deleted: true } on 204', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue({}),
      } as any);

      const result = await provider.deleteAccount(
        makeContext(),
        'acc-uuid-1234',
      );

      expect(result.deleted).toBe(true);
    });

    it('returns { deleted: true } on 200', async () => {
      mockFetchStatus(200, {});

      const result = await provider.deleteAccount(
        makeContext(),
        'acc-uuid-1234',
      );

      expect(result.deleted).toBe(true);
    });

    it('sends DELETE method', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue({}),
      } as any);

      await provider.deleteAccount(makeContext(), 'acc-uuid-1234');

      expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
    });

    it('throws AccountingAccountCannotBeDeletedError on 400', async () => {
      mockFetchStatus(400, {
        Title: 'Bad Request',
        Detail: 'Account has existing transactions',
      });

      await expect(
        provider.deleteAccount(makeContext(), 'acc-uuid-1234'),
      ).rejects.toThrow(AccountingAccountCannotBeDeletedError);
    });

    it('throws AccountingSystemAccountError on 403 when system account language', async () => {
      mockFetchStatus(403, {
        Detail: 'You cannot delete a system account',
      });

      await expect(
        provider.deleteAccount(makeContext(), 'sys-uuid-9999'),
      ).rejects.toThrow(AccountingSystemAccountError);
    });

    it('throws AccountingSystemAccountError on 400 with system account message', async () => {
      mockFetchStatus(400, {
        Detail: 'This is a system account and cannot be deleted',
      });

      await expect(
        provider.deleteAccount(makeContext(), 'sys-uuid-9999'),
      ).rejects.toThrow(AccountingSystemAccountError);
    });

    it('throws AccountingProviderUnavailableError on 500', async () => {
      mockFetchStatus(500, { Detail: 'Internal server error' });

      await expect(
        provider.deleteAccount(makeContext(), 'acc-uuid-1234'),
      ).rejects.toThrow(AccountingProviderUnavailableError);
    });
  });

  // ─── 8. xeroWrite error handling ──────────────────────────────────────────────

  describe('xeroWrite error handling', () => {
    it('throws AccountingDuplicateCodeError on 400 with code-duplicate message', async () => {
      mockFetchStatus(400, {
        Elements: [
          {
            ValidationErrors: [{ Message: 'Account code already exists' }],
          },
        ],
      });

      await expect(
        provider.createAccount(makeContext(), {
          name: 'X',
          type: 'REVENUE',
          code: '200',
        }),
      ).rejects.toThrow(AccountingDuplicateCodeError);
    });

    it('throws AccountingValidationError on generic 400', async () => {
      mockFetchStatus(400, {
        Elements: [
          {
            ValidationErrors: [{ Message: 'Name is required' }],
          },
        ],
      });

      await expect(
        provider.createAccount(makeContext(), { name: '', type: 'REVENUE' }),
      ).rejects.toThrow(AccountingValidationError);
    });

    it('throws AccountingSystemAccountError on 403 in write', async () => {
      mockFetchStatus(403, {
        Detail: 'Forbidden: cannot modify this account',
      });

      await expect(
        provider.updateAccount(makeContext(), 'sys-account-id', { name: 'X' }),
      ).rejects.toThrow(AccountingSystemAccountError);
    });

    it('throws AccountingProviderUnavailableError on network error', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        provider.createAccount(makeContext(), { name: 'X', type: 'REVENUE' }),
      ).rejects.toThrow(AccountingProviderUnavailableError);
    });
  });

  // ─── 9. status mapping ────────────────────────────────────────────────────────

  describe('Account status mapping', () => {
    it('maps ACTIVE Xero status to "active"', async () => {
      mockFetchOk({ Accounts: [{ ...sampleXeroAccount, Status: 'ACTIVE' }] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data[0].status).toBe('active');
    });

    it('maps ARCHIVED Xero status to "archived"', async () => {
      mockFetchOk({ Accounts: [{ ...sampleXeroAccount, Status: 'ARCHIVED' }] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data[0].status).toBe('archived');
    });

    it('maps missing status to "active"', async () => {
      const { Status: _removed, ...noStatus } = sampleXeroAccount;
      mockFetchOk({ Accounts: [noStatus] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data[0].status).toBe('active');
    });
  });

  // ─── 10. systemAccount flag ───────────────────────────────────────────────────

  describe('systemAccount flag', () => {
    it('returns systemAccount: true when SystemAccount is a non-empty string', async () => {
      mockFetchOk({ Accounts: [sampleXeroSystemAccount] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data[0].systemAccount).toBe(true);
    });

    it('returns systemAccount: false when SystemAccount is empty string', async () => {
      mockFetchOk({ Accounts: [{ ...sampleXeroAccount, SystemAccount: '' }] });

      const result = await provider.listAccounts(makeContext(), {});

      expect(result.data[0].systemAccount).toBe(false);
    });
  });

  // ─── 11. organisationId resolution ────────────────────────────────────────────

  describe('organisationId resolution', () => {
    it('calls orgService.resolveOrganisation when context has organisationId', async () => {
      mockFetchOk({ Accounts: [] });

      await provider.listAccounts(
        makeContext({ organisationId: 'org-abc-123' }),
        {},
      );

      expect(orgService.resolveOrganisation).toHaveBeenCalledWith({
        organisationId: 'org-abc-123',
        credentialId: 'cred-123',
      });
    });

    it('uses tenantId from credential when no organisationId is present', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [] });

      await provider.listAccounts(makeContext(), {});

      // Should not call org service — uses credential tenantId directly
      expect(orgService.resolveOrganisation).not.toHaveBeenCalled();
      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['xero-tenant-id']).toBe('mock-tenant-id');
    });

    it('throws AccountingProviderUnavailableError when organisation is not found', async () => {
      orgService.resolveOrganisation.mockResolvedValueOnce(null);

      await expect(
        provider.listAccounts(
          makeContext({ organisationId: 'nonexistent-org' }),
          {},
        ),
      ).rejects.toThrow(AccountingProviderUnavailableError);
    });
  });

  // ─── 12. extractXeroErrorMessage ──────────────────────────────────────────────

  describe('Xero error message extraction', () => {
    it('prefers ValidationErrors[].Message over Detail', async () => {
      mockFetchStatus(400, {
        Detail: 'Generic detail',
        Elements: [
          {
            ValidationErrors: [
              { Message: 'First validation error' },
              { Message: 'Second validation error' },
            ],
          },
        ],
      });

      await expect(
        provider.createAccount(makeContext(), { name: 'X', type: 'REVENUE' }),
      ).rejects.toThrow('First validation error');
    });

    it('falls back to Detail when no ValidationErrors', async () => {
      mockFetchStatus(400, {
        Detail: 'Something went wrong',
      });

      let error: Error | undefined;
      try {
        await provider.createAccount(makeContext(), {
          name: 'X',
          type: 'REVENUE',
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error!.message).toContain('Something went wrong');
    });
  });

  // ─── 13. xeroWrite sends correct Content-Type ─────────────────────────────────

  describe('xeroWrite headers', () => {
    it('sends Content-Type: application/json', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'X',
        type: 'REVENUE',
      });

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['Content-Type']).toBe('application/json');
    });

    it('sends Accept: application/json', async () => {
      const fetchSpy = mockFetchOk({ Accounts: [sampleXeroAccount] });

      await provider.createAccount(makeContext(), {
        name: 'X',
        type: 'REVENUE',
      });

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers?.['Accept']).toBe('application/json');
    });
  });

  // ─── 14. assertWriteScope — pre-flight scope gate ─────────────────────────────

  describe('assertWriteScope — pre-flight scope gate', () => {
    // createAccount, updateAccount, archiveAccount, deleteAccount all gate via assertWriteScope.

    it('createAccount throws AccountingReauthorisationRequiredError when write scope is absent', async () => {
      // No fetch mock needed — error is thrown before any HTTP call.
      await expect(
        provider.createAccount(makeReadOnlyContext(), {
          name: 'X',
          type: 'REVENUE',
        }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('updateAccount throws AccountingReauthorisationRequiredError when write scope is absent', async () => {
      await expect(
        provider.updateAccount(makeReadOnlyContext(), 'acc-id', { name: 'Y' }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('archiveAccount throws AccountingReauthorisationRequiredError when write scope is absent', async () => {
      await expect(
        provider.archiveAccount(makeReadOnlyContext(), 'acc-id'),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('deleteAccount throws AccountingReauthorisationRequiredError when write scope is absent', async () => {
      await expect(
        provider.deleteAccount(makeReadOnlyContext(), 'acc-id'),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('createAccount does NOT throw when accounting.settings scope is present', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });
      // Should resolve without throwing — write scope is present in makeContext().
      await expect(
        provider.createAccount(makeContext(), {
          name: 'Valid Account',
          type: 'REVENUE',
        }),
      ).resolves.toBeDefined();
    });

    it('error message mentions accounting.settings and reconnect', async () => {
      let caughtError: Error | undefined;
      try {
        await provider.createAccount(makeReadOnlyContext(), {
          name: 'X',
          type: 'EXPENSE',
        });
      } catch (e) {
        caughtError = e as Error;
      }
      expect(caughtError).toBeInstanceOf(
        AccountingReauthorisationRequiredError,
      );
      expect(caughtError!.message).toContain('accounting.settings');
      expect(caughtError!.message.toLowerCase()).toContain('reconnect');
    });

    it('no fetch call is made when write scope is absent', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      try {
        await provider.createAccount(makeReadOnlyContext(), {
          name: 'X',
          type: 'EXPENSE',
        });
      } catch {
        /* expected */
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('read operations (listAccounts, getAccount) do not require write scope', async () => {
      mockFetchOk({ Accounts: [sampleXeroAccount] });
      // listAccounts must work with a read-only token.
      await expect(
        provider.listAccounts(makeReadOnlyContext(), {}),
      ).resolves.toBeDefined();
    });

    it('context with empty scopes string triggers reauthorisation', async () => {
      const noScopeCtx = makeContext({
        credentials: { tenantId: 'mock-tenant-id', scopes: '' },
      });
      await expect(
        provider.createAccount(noScopeCtx, { name: 'X', type: 'EXPENSE' }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('context with no scopes field triggers reauthorisation', async () => {
      const noScopeCtx = makeContext({
        credentials: { tenantId: 'mock-tenant-id' },
      });
      await expect(
        provider.createAccount(noScopeCtx, { name: 'X', type: 'EXPENSE' }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });
  });

  // ─── 15. 401 handling — Xero rejects write with insufficient scope ─────────────

  describe('401 handling — Xero rejects write with HTTP 401', () => {
    it('xeroWrite (createAccount) maps Xero 401 → AccountingReauthorisationRequiredError', async () => {
      // Simulate: write scope IS in the stored scopes but Xero still rejects
      // (e.g. token was issued before scope upgrade, stale cached value).
      mockFetchStatus(401, { Title: 'Unauthorized', Status: 401 });

      await expect(
        provider.createAccount(makeContext(), { name: 'X', type: 'EXPENSE' }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('xeroWrite (updateAccount) maps Xero 401 → AccountingReauthorisationRequiredError', async () => {
      mockFetchStatus(401, { Title: 'Unauthorized', Status: 401 });

      await expect(
        provider.updateAccount(makeContext(), 'acc-id', { name: 'Y' }),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('xeroWrite (archiveAccount) maps Xero 401 → AccountingReauthorisationRequiredError', async () => {
      mockFetchStatus(401, { Title: 'Unauthorized', Status: 401 });

      await expect(
        provider.archiveAccount(makeContext(), 'acc-id'),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('deleteAccount (own fetch) maps Xero 401 → AccountingReauthorisationRequiredError', async () => {
      mockFetchStatus(401, { Title: 'Unauthorized', Status: 401 });

      await expect(
        provider.deleteAccount(makeContext(), 'acc-id'),
      ).rejects.toThrow(AccountingReauthorisationRequiredError);
    });

    it('401 error message mentions reconnect', async () => {
      mockFetchStatus(401, { Title: 'Unauthorized' });
      let err: Error | undefined;
      try {
        await provider.createAccount(makeContext(), {
          name: 'X',
          type: 'EXPENSE',
        });
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeInstanceOf(AccountingReauthorisationRequiredError);
      expect(err!.message.toLowerCase()).toContain('reconnect');
    });

    it('401 does not expose access token in error', async () => {
      mockFetchStatus(401, { Title: 'Unauthorized' });
      let err: Error | undefined;
      try {
        await provider.createAccount(makeContext(), {
          name: 'X',
          type: 'EXPENSE',
        });
      } catch (e) {
        err = e as Error;
      }
      expect(err).toBeDefined();
      // Token must never appear in error message
      expect(err!.message).not.toContain('mock-access-token');
    });
  });

  // ─── 16. AccountingReauthorisationRequiredError class ─────────────────────────

  describe('AccountingReauthorisationRequiredError', () => {
    it('has the correct name', () => {
      const err = new AccountingReauthorisationRequiredError();
      expect(err.name).toBe('AccountingReauthorisationRequiredError');
    });

    it('is an instance of Error', () => {
      expect(new AccountingReauthorisationRequiredError()).toBeInstanceOf(
        Error,
      );
    });

    it('default message mentions reconnect', () => {
      const err = new AccountingReauthorisationRequiredError();
      expect(err.message.toLowerCase()).toContain('reconnect');
    });

    it('accepts a custom reason', () => {
      const err = new AccountingReauthorisationRequiredError(
        'custom reason here',
      );
      expect(err.message).toContain('custom reason here');
    });
  });
});
