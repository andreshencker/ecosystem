// src/accounting/providers/xero/xero-banking.spec.ts
//
// Unit tests for XeroAccountingProvider.listBankAccounts.
//
// Verifies that the provider sends Type=="BANK" in a Xero where clause (not
// as a standalone Type param), applies the defensive BANK filter on the response,
// and builds correct total/hasMore values from bank-only accounts.

import { Test, TestingModule } from '@nestjs/testing';

import { XeroAccountingProvider } from './xero-accounting.provider';
import { XeroConnectionService } from './xero.connection.service';
import { XeroOrganisationsService } from './xero-organisations.service';
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
      scopes: 'accounting.reports.banksummary.read offline_access openid',
    },
    ...overrides,
  };
}

// ─── Sample Xero account fixtures ─────────────────────────────────────────────

const bankAccount = {
  AccountID: 'bank-uuid-1',
  Code: '090',
  Name: 'Smart Access',
  Type: 'BANK',
  BankAccountNumber: '123456-0916',
  BankAccountType: 'BANK',
  CurrencyCode: 'AUD',
  Status: 'ACTIVE',
};

const archivedBankAccount = {
  AccountID: 'bank-uuid-2',
  Code: '091',
  Name: 'Old Savings',
  Type: 'BANK',
  BankAccountNumber: '654321-0001',
  BankAccountType: 'BANK',
  CurrencyCode: 'AUD',
  Status: 'ARCHIVED',
};

const revenueAccount = {
  AccountID: 'rev-uuid-1',
  Code: '200',
  Name: 'Sales',
  Type: 'REVENUE',
  Status: 'ACTIVE',
};

const expenseAccount = {
  AccountID: 'exp-uuid-1',
  Code: '400',
  Name: 'Advertising',
  Type: 'EXPENSE',
  Status: 'ACTIVE',
};

// ─── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(''),
  } as any);
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('XeroAccountingProvider — listBankAccounts', () => {
  let provider: XeroAccountingProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroAccountingProvider,
        { provide: XeroConnectionService, useFactory: mockConnectionService },
        { provide: XeroOrganisationsService, useFactory: mockOrgService },
      ],
    }).compile();

    provider = module.get<XeroAccountingProvider>(XeroAccountingProvider);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── 1. WHERE clause sends Type=="BANK" ──────────────────────────────────────

  it('sends Type=="BANK" inside a where clause — not as a standalone Type param', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {});

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);
    const where = parsed.searchParams.get('where') ?? '';

    expect(where).toContain('Type=="BANK"');
    // Must NOT use the standalone Type param that Xero ignores
    expect(parsed.searchParams.has('Type')).toBe(false);
  });

  it('does not add Status param — relies on Xero default (active only)', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {});

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);

    expect(parsed.searchParams.has('Status')).toBe(false);
  });

  // ── 2. Returns only BANK accounts ──────────────────────────────────────────

  it('returns only BANK accounts when Xero response also contains non-BANK types', async () => {
    mockFetchOk({ Accounts: [bankAccount, revenueAccount, expenseAccount] });

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Smart Access');
  });

  it('total reflects only BANK accounts — not all Xero accounts returned', async () => {
    mockFetchOk({ Accounts: [bankAccount, revenueAccount, expenseAccount] });

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.total).toBe(1);
  });

  it('returns empty result when Xero returns no BANK accounts', async () => {
    mockFetchOk({ Accounts: [revenueAccount, expenseAccount] });

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  // ── 3. Maps BankAccountSummary fields correctly ─────────────────────────────

  it('maps Xero BANK account to BankAccountSummary', async () => {
    mockFetchOk({ Accounts: [bankAccount] });

    const result = await provider.listBankAccounts(makeContext(), {});
    const summary = result.data[0];

    expect(summary.id).toBe('bank-uuid-1');
    expect(summary.name).toBe('Smart Access');
    expect(summary.code).toBe('090');
    expect(summary.currency).toBe('AUD');
    expect(summary.status).toBe('active');
    expect(summary.bankAccountNumber).toBe('123456-0916');
  });

  it('maps ARCHIVED Xero status to status: "archived"', async () => {
    mockFetchOk({ Accounts: [archivedBankAccount] });

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.data[0].status).toBe('archived');
    expect(result.data[0].isActive).toBe(false);
  });

  // ── 4. includeArchived ──────────────────────────────────────────────────────

  it('adds includeArchived=true when includeArchived param is true', async () => {
    const fetchSpy = mockFetchOk({
      Accounts: [bankAccount, archivedBankAccount],
    });

    await provider.listBankAccounts(makeContext(), {
      includeArchived: true,
    } as any);

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);

    expect(parsed.searchParams.get('includeArchived')).toBe('true');
  });

  it('does NOT add includeArchived when includeArchived is false', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {
      includeArchived: false,
    } as any);

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);

    expect(parsed.searchParams.has('includeArchived')).toBe(false);
  });

  // ── 5. Search combines with Type=="BANK" in the where clause ────────────────

  it('combines Type=="BANK" and name search in a single where clause', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), { search: 'smart' });

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);
    const where = parsed.searchParams.get('where') ?? '';

    expect(where).toContain('Type=="BANK"');
    expect(where.toLowerCase()).toContain('smart');
    // Both conditions joined with &&
    expect(where).toContain('&&');
  });

  // ── 6. Pagination ───────────────────────────────────────────────────────────

  it('respects limit and sets hasMore when results exceed limit', async () => {
    const manyBankAccounts = Array.from({ length: 6 }, (_, i) => ({
      ...bankAccount,
      AccountID: `bank-${i}`,
      Name: `Bank ${i}`,
    }));
    mockFetchOk({ Accounts: manyBankAccounts });

    const result = await provider.listBankAccounts(makeContext(), { limit: 5 });

    expect(result.data).toHaveLength(5);
    expect(result.hasMore).toBe(true);
  });

  it('hasMore is false when results fit within limit', async () => {
    mockFetchOk({ Accounts: [bankAccount] });

    const result = await provider.listBankAccounts(makeContext(), {
      limit: 50,
    });

    expect(result.hasMore).toBe(false);
  });

  // ── 7. Auth headers ─────────────────────────────────────────────────────────

  it('sends Authorization Bearer header', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {});

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers['Authorization']).toBe('Bearer mock-access-token');
  });

  it('sends xero-tenant-id header', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {});

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    expect(headers['xero-tenant-id']).toBe('mock-tenant-id');
  });

  // ── 8. Calls correct Xero endpoint ─────────────────────────────────────────

  it('calls the Xero Accounts endpoint', async () => {
    const fetchSpy = mockFetchOk({ Accounts: [bankAccount] });

    await provider.listBankAccounts(makeContext(), {});

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain(`${XERO_ACCOUNTING_BASE_URL}/Accounts`);
  });

  // ── 9. Empty Accounts response ──────────────────────────────────────────────

  it('returns empty data when Xero Accounts array is absent', async () => {
    mockFetchOk({});

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

// ─── BankAccountType sub-filtering ────────────────────────────────────────────
//
// In Xero, ALL financial accounts (bank accounts AND credit cards) have
// Type==="BANK". The BankAccountType field distinguishes them:
//   'BANK'       → standard bank account (e.g. Commonwealth Smart Access)
//   'CREDITCARD' → credit card (e.g. Westpac Altitude Black World Mastercard)
//   'PAYPAL'     → PayPal account
//
// listBankAccounts always queries Type=="BANK" and sub-filters by BankAccountType.
// These tests verify the sub-filter without hardcoding any specific account names.

describe('XeroAccountingProvider — BankAccountType sub-filtering', () => {
  let provider: XeroAccountingProvider;

  const bankAccountFixture = {
    AccountID: 'acct-bank-1',
    Code: '090',
    Name: 'Sample Bank Account',
    Type: 'BANK',
    BankAccountType: 'BANK',
    BankAccountNumber: '123456-0001',
    CurrencyCode: 'AUD',
    Status: 'ACTIVE',
  };

  const creditCardFixture = {
    AccountID: 'acct-cc-1',
    Code: '091',
    Name: 'Sample Credit Card',
    Type: 'BANK',
    BankAccountType: 'CREDITCARD',
    CurrencyCode: 'AUD',
    Status: 'ACTIVE',
  };

  const paypalFixture = {
    AccountID: 'acct-pp-1',
    Code: '092',
    Name: 'PayPal Account',
    Type: 'BANK',
    BankAccountType: 'PAYPAL',
    CurrencyCode: 'USD',
    Status: 'ACTIVE',
  };

  // Account with no BankAccountType (Xero may omit the field for some accounts)
  const noBankAccountTypeFixture = {
    AccountID: 'acct-plain-1',
    Code: '093',
    Name: 'Plain Bank Account',
    Type: 'BANK',
    CurrencyCode: 'AUD',
    Status: 'ACTIVE',
  };

  function makeContext(overrides: Partial<any> = {}) {
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
        scopes: 'accounting.reports.banksummary.read offline_access openid',
      },
      ...overrides,
    };
  }

  beforeEach(async () => {
    const { Test } = require('@nestjs/testing');
    const { XeroConnectionService } = require('./xero.connection.service');
    const { XeroOrganisationsService } = require('./xero-organisations.service');

    const module = await Test.createTestingModule({
      providers: [
        XeroAccountingProvider,
        {
          provide: XeroConnectionService,
          useValue: {
            ensureFreshAccessToken: jest
              .fn()
              .mockResolvedValue('mock-access-token'),
          },
        },
        {
          provide: XeroOrganisationsService,
          useValue: {
            resolveOrganisation: jest.fn().mockResolvedValue({
              tenantId: 'mock-tenant-id',
              tenantName: 'Mock Org',
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<XeroAccountingProvider>(XeroAccountingProvider);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── 1. accountType = 'BANK' ─────────────────────────────────────────────────

  it('accountType BANK returns only non-CREDITCARD accounts', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('acct-bank-1');
    expect(result.data[0].type).toBe('BANK');
  });

  it('accountType BANK excludes CREDITCARD accounts', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    const ids = result.data.map((a) => a.id);
    expect(ids).not.toContain('acct-cc-1');
  });

  // ── 2. accountType = 'CREDITCARD' ───────────────────────────────────────────

  it('accountType CREDITCARD returns only credit card accounts', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'CREDITCARD',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('acct-cc-1');
    expect(result.data[0].type).toBe('CREDITCARD');
  });

  it('accountType CREDITCARD excludes bank accounts', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'CREDITCARD',
    });

    const ids = result.data.map((a) => a.id);
    expect(ids).not.toContain('acct-bank-1');
  });

  // ── 3. No accountType — returns all financial accounts ───────────────────────

  it('no accountType returns all BANK-type accounts (bank + credit card)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {});

    expect(result.data).toHaveLength(2);
  });

  // ── 4. BankAccountType absent — treated as non-CREDITCARD ───────────────────

  it('account with absent BankAccountType is included in BANK filter', async () => {
    // Xero may omit BankAccountType for some accounts. undefined !== 'CREDITCARD'
    // means the account passes the BANK sub-filter.
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [noBankAccountTypeFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('acct-plain-1');
  });

  it('account with absent BankAccountType is excluded from CREDITCARD filter', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ Accounts: [noBankAccountTypeFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'CREDITCARD',
    });

    expect(result.data).toHaveLength(0);
  });

  // ── 5. PAYPAL accounts behave like non-CREDITCARD ──────────────────────────

  it('PAYPAL accounts appear in BANK filter (not classified as CREDITCARD)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ Accounts: [paypalFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].type).toBe('PAYPAL');
  });

  // ── 6. toSummary maps BankAccountType to type field ─────────────────────────

  it('toSummary maps BankAccountType directly to the type field', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({
          Accounts: [bankAccountFixture, creditCardFixture],
        }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {});

    const bankSummary = result.data.find((a) => a.id === 'acct-bank-1');
    const ccSummary = result.data.find((a) => a.id === 'acct-cc-1');

    // type field reflects Xero's BankAccountType — not hardcoded
    expect(bankSummary?.type).toBe('BANK');
    expect(ccSummary?.type).toBe('CREDITCARD');
  });

  // ── 7. Account names are not hardcoded ──────────────────────────────────────

  it('account names come from Xero response — never hardcoded', async () => {
    const dynamicAccount = {
      ...bankAccountFixture,
      AccountID: 'dynamic-id',
      Name: 'Any Organisation Bank Account Name',
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ Accounts: [dynamicAccount] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    expect(result.data[0].name).toBe('Any Organisation Bank Account Name');
    // Name is passed through directly from Xero — no transformation
    expect(result.data[0].name).not.toBe('Smart Access');
    expect(result.data[0].name).not.toBe('Altitude Black');
  });

  // ── 8. Querying Type=="BANK" is always used — not accountType directly ───────

  it('Xero query always uses Type=="BANK" regardless of accountType param', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ Accounts: [creditCardFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    await provider.listBankAccounts(makeContext(), { accountType: 'CREDITCARD' });

    const url = fetchSpy.mock.calls[0][0] as string;
    const parsed = new URL(url);
    const where = parsed.searchParams.get('where') ?? '';

    // Always queries Type=="BANK" — NOT Type=="CREDITCARD" (which returns nothing)
    expect(where).toContain('Type=="BANK"');
    expect(where).not.toContain('Type=="CREDITCARD"');
    // BankAccountType is NOT part of the Xero where clause — filtering is in code
    expect(where).not.toContain('BankAccountType');
  });

  // ── 9. Mixed org: BANK filter, 3 financial account types ────────────────────

  it('BANK filter on org with all three types returns bank + paypal, not credit cards', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({
          Accounts: [bankAccountFixture, creditCardFixture, paypalFixture],
        }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeContext(), {
      accountType: 'BANK',
    });

    const ids = result.data.map((a) => a.id);
    expect(ids).toContain('acct-bank-1');
    expect(ids).toContain('acct-pp-1');
    expect(ids).not.toContain('acct-cc-1');
  });
});

// ─── withBalances — BankSummary enrichment ────────────────────────────────────
//
// When withBalances=true the provider makes TWO parallel requests:
//   1. GET /Accounts?where=Type=="BANK"
//   2. GET /Reports/BankSummary
//
// The BankSummary report is parsed once; every account's balance is resolved
// by AccountID from Attributes — NOT by name matching. No N+1 calls.

describe('XeroAccountingProvider — listBankAccounts with withBalances', () => {
  let provider: XeroAccountingProvider;

  // Minimal BankSummary report fixture.
  // Structure: Reports[0].Rows contains Section rows that have child Rows.
  // Each data Row:
  //   Cell[0]: name cell, Attributes=[{Id:'account', Value:AccountID}]
  //   Cell[1]: Statement Balance (decimal string)
  // ACTUAL Xero BankSummary structure (verified from live API response):
  //   Header columns: [Bank Accounts, Opening Balance, Cash Received, Cash Spent, Closing Balance]
  //   Cell[0]: Account name + Attributes[{Id:'account', Value:AccountID}]
  //   Cell[1]: Opening Balance
  //   Cell[2]: Cash Received
  //   Cell[3]: Cash Spent
  //   Cell[4]: Closing Balance  ← mapped to xeroBalance
  //
  // NOTE: "Statement Balance" (bank feed) is NOT in BankSummary — statementBalance
  // will always be undefined. Individual account rows appear only when there are
  // bank transactions recorded in Xero.
  const bankSummaryReport = {
    Reports: [
      {
        ReportID: 'BankSummary',
        ReportName: 'Bank Summary',
        Rows: [
          {
            RowType: 'Header',
            Cells: [
              { Value: 'Bank Accounts' },
              { Value: 'Opening Balance' },
              { Value: 'Cash Received' },
              { Value: 'Cash Spent' },
              { Value: 'Closing Balance' },
            ],
          },
          {
            RowType: 'Section',
            Rows: [
              {
                RowType: 'Row',
                Cells: [
                  {
                    Value: 'Smart Access',
                    Attributes: [{ Id: 'account', Value: 'bank-uuid-1' }],
                  },
                  { Value: '4000.00' },   // Opening Balance
                  { Value: '1200.00' },   // Cash Received
                  { Value: '349.25' },    // Cash Spent
                  { Value: '4850.75' },   // Closing Balance → xeroBalance
                ],
              },
              {
                RowType: 'Row',
                Cells: [
                  {
                    Value: 'Altitude Black World Mastercard',
                    Attributes: [{ Id: 'account', Value: 'cc-uuid-1' }],
                  },
                  { Value: '-1000.00' },  // Opening Balance
                  { Value: '0.00' },      // Cash Received
                  { Value: '200.50' },    // Cash Spent
                  { Value: '-1200.50' },  // Closing Balance → xeroBalance
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const bankAccountFixture = {
    AccountID: 'bank-uuid-1',
    Code: '090',
    Name: 'Smart Access',
    Type: 'BANK',
    BankAccountType: 'BANK',
    BankAccountNumber: '123456-0916',
    CurrencyCode: 'AUD',
    Status: 'ACTIVE',
  };

  const creditCardFixture = {
    AccountID: 'cc-uuid-1',
    Code: '091',
    Name: 'Altitude Black World Mastercard',
    Type: 'BANK',
    BankAccountType: 'CREDITCARD',
    CurrencyCode: 'AUD',
    Status: 'ACTIVE',
  };

  function makeCtx(): any {
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
        scopes: 'accounting.reports.banksummary.read offline_access openid',
      },
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XeroAccountingProvider,
        {
          provide: XeroConnectionService,
          useValue: { ensureFreshAccessToken: jest.fn().mockResolvedValue('mock-token') },
        },
        {
          provide: XeroOrganisationsService,
          useValue: {
            resolveOrganisation: jest.fn().mockResolvedValue({
              tenantId: 'mock-tenant-id',
              tenantName: 'Mock Org',
            }),
          },
        },
      ],
    }).compile();
    provider = module.get<XeroAccountingProvider>(XeroAccountingProvider);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── 1. Makes exactly 2 Xero requests when withBalances=true ─────────────────

  it('makes 2 parallel Xero requests (Accounts + BankSummary) when withBalances=true', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
        text: jest.fn().mockResolvedValue(''),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue(bankSummaryReport),
        text: jest.fn().mockResolvedValue(''),
      } as any);

    await provider.listBankAccounts(makeCtx(), { withBalances: true });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const urls = fetchSpy.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes('/Accounts'))).toBe(true);
    expect(urls.some((u) => u.includes('/Reports/BankSummary'))).toBe(true);
  });

  it('makes only 1 Xero request (Accounts) when withBalances is not set', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      json: jest.fn().mockResolvedValue({ Accounts: [bankAccountFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    await provider.listBankAccounts(makeCtx(), {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).not.toContain('BankSummary');
  });

  // ── 2. Balance fields populated from BankSummary ─────────────────────────────

  it('attaches xeroBalance and statementBalance to each account from BankSummary', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
        text: jest.fn().mockResolvedValue(''),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue(bankSummaryReport),
        text: jest.fn().mockResolvedValue(''),
      } as any);

    const result = await provider.listBankAccounts(makeCtx(), { withBalances: true });

    const bank = result.data.find((a) => a.id === 'bank-uuid-1');
    const card = result.data.find((a) => a.id === 'cc-uuid-1');

    // Smart Access: Closing Balance=4850.75 → xeroBalance (amountMinor × 100)
    // Statement Balance is NOT available in BankSummary — always undefined
    expect(bank?.xeroBalance).toEqual({ amountMinor: 485075, currency: 'AUD' });
    expect(bank?.statementBalance).toBeUndefined(); // not in BankSummary

    // Altitude Black: Closing Balance=-1200.50 → xeroBalance
    expect(card?.xeroBalance).toEqual({ amountMinor: -120050, currency: 'AUD' });
    expect(card?.statementBalance).toBeUndefined(); // not in BankSummary
  });

  // ── 3. Balance fields absent when withBalances not set ───────────────────────

  it('leaves xeroBalance and statementBalance absent when withBalances is not set', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true, status: 200,
      json: jest.fn().mockResolvedValue({ Accounts: [bankAccountFixture] }),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const result = await provider.listBankAccounts(makeCtx(), {});

    expect(result.data[0].xeroBalance).toBeUndefined();
    expect(result.data[0].statementBalance).toBeUndefined();
  });

  // ── 4. Matching by AccountID, not by name ────────────────────────────────────

  it('matches balances by AccountID from Attributes — not by account name', async () => {
    // Same name, different AccountID — proves name-matching would fail
    const accountWithDifferentId = {
      ...bankAccountFixture,
      AccountID: 'different-uuid',
      Name: 'Smart Access',  // same name
    };

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue({ Accounts: [accountWithDifferentId] }),
        text: jest.fn().mockResolvedValue(''),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue(bankSummaryReport),
        text: jest.fn().mockResolvedValue(''),
      } as any);

    const result = await provider.listBankAccounts(makeCtx(), { withBalances: true });

    // BankSummary has 'bank-uuid-1', but account has 'different-uuid' — no match
    expect(result.data[0].xeroBalance).toBeUndefined();
    // statementBalance is always undefined (not in BankSummary)
    expect(result.data[0].statementBalance).toBeUndefined();
  });

  // ── 5. Account not in BankSummary → undefined (shown as "—" in UI) ──────────

  it('leaves balance undefined for accounts absent from BankSummary', async () => {
    const accountNotInReport = {
      ...bankAccountFixture,
      AccountID: 'uuid-not-in-report',
    };

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue({ Accounts: [accountNotInReport] }),
        text: jest.fn().mockResolvedValue(''),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue(bankSummaryReport),
        text: jest.fn().mockResolvedValue(''),
      } as any);

    const result = await provider.listBankAccounts(makeCtx(), { withBalances: true });

    expect(result.data[0].xeroBalance).toBeUndefined();
    expect(result.data[0].statementBalance).toBeUndefined();
  });

  // ── 6. withBalances=true returns both BANK and CREDITCARD balances ───────────

  it('returns balances for both BANK and CREDITCARD types when no accountType filter', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue({ Accounts: [bankAccountFixture, creditCardFixture] }),
        text: jest.fn().mockResolvedValue(''),
      } as any)
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: jest.fn().mockResolvedValue(bankSummaryReport),
        text: jest.fn().mockResolvedValue(''),
      } as any);

    const result = await provider.listBankAccounts(makeCtx(), { withBalances: true });

    expect(result.data).toHaveLength(2);
    const bank = result.data.find((a) => a.id === 'bank-uuid-1');
    const card = result.data.find((a) => a.id === 'cc-uuid-1');
    expect(bank?.xeroBalance).toBeDefined();
    expect(card?.xeroBalance).toBeDefined();
  });
});
