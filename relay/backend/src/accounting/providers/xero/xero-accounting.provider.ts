// src/accounting/providers/xero/xero-accounting.provider.ts
//
// Xero accounting provider adapter.
//
// Single entry point for all Xero accounting operations.
// Provider-specific API calls, response mapping, and error handling are
// encapsulated here. Nothing Xero-specific leaks outside this folder.
//
// Banking is the first implemented capability. All other capabilities
// still throw NotImplementedException until individually built.

import {
  HttpException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';

import type {
  IAccountingProvider,
  IAccountingConnectionProvider,
  IAccountingOrganisationProvider,
  IAccountingBankingProvider,
  IAccountingContactsProvider,
  IAccountingInvoicesProvider,
  IAccountingBillsProvider,
  IAccountingPaymentRecordsProvider,
  IAccountingAssetsProvider,
  IAccountingInventoryProvider,
  IAccountingPayrollProvider,
  IAccountingChartOfAccountsProvider,
  IAccountingManualJournalsProvider,
  IAccountingGeneralLedgerProvider,
} from '../../interfaces/accounting-provider.interface';

import type {
  AccountingProviderCapabilities,
  AccountingProviderMetadata,
  AccountingProviderContext,
  AccountingConnectionResult,
  AccountingListResult,
  AccountingListParams,
  BankAccountSummary,
  BankTransactionSummary,
  ListBankTransactionsParams,
  ContactSummary,
  ContactDetail,
  CreateContactParams,
  UpdateContactParams,
  InvoiceSummary,
  InvoiceDetail,
  CreateInvoiceParams,
  UpdateInvoiceParams,
  BillSummary,
  BillDetail,
  CreateBillParams,
  UpdateBillParams,
  PaymentRecordSummary,
  CreatePaymentRecordParams,
  AssetSummary,
  AssetDetail,
  InventoryItemSummary,
  InventoryItemDetail,
  EmployeeSummary,
  EmployeeDetail,
  OrganisationSummary,
  AccountingMoney,
  AccountSummary,
  AccountDetail,
  CreateAccountParams,
  UpdateAccountParams,
  ArchiveAccountResult,
  DeleteAccountResult,
  ListAccountsParams,
  ManualJournalSummary,
  ManualJournalDetail,
  ManualJournalLine,
  CreateManualJournalRequest,
  UpdateManualJournalRequest,
  ListManualJournalsParams,
  JournalSummary,
  JournalLineSummary,
  ListJournalsParams,
} from '../../types/accounting.types';

import type {
  BankAccountDetail,
  BankAccountBalance,
} from '../../contracts/banking/accounting-bank-account.contract';

import {
  AccountingCapability,
  AccountingCapabilityStatus,
} from '../../enums/accounting-capability.enum';

import {
  AccountingProviderUnavailableError,
  AccountingResourceNotFoundError,
  AccountingSystemAccountError,
  AccountingAccountCannotBeDeletedError,
  AccountingValidationError,
  AccountingDuplicateCodeError,
  AccountingReauthorisationRequiredError,
} from '../../errors/accounting.errors';

import {
  XERO_ACCOUNTING_CAPABILITIES,
  XERO_PROVIDER_KEY,
  XERO_DISPLAY_NAME,
  XERO_CONNECTION_TYPE,
} from './xero-accounting.capabilities';

import { XERO_ACCOUNTING_BASE_URL } from './xero.oauth.types';
import type { XeroOAuthCredentials } from './xero.credentials.contract';
import { XeroConnectionService } from './xero.connection.service';
import { XeroOrganisationsService } from './xero-organisations.service';
import type {
  XeroAccount,
  XeroAccountsResponse,
  XeroReportResponse,
  XeroReportRow,
  XeroReportCell,
  XeroApiError,
  XeroBankTransaction,
  XeroBankTransactionsResponse,
} from './xero-banking.types';
import type {
  XeroManualJournal,
  XeroManualJournalLine,
  XeroManualJournalsResponse,
  XeroJournal,
  XeroJournalLine,
  XeroJournalsResponse,
} from './xero-manual-journals.types';

@Injectable()
export class XeroAccountingProvider
  implements
    IAccountingProvider,
    IAccountingConnectionProvider,
    IAccountingOrganisationProvider,
    IAccountingBankingProvider,
    IAccountingContactsProvider,
    IAccountingInvoicesProvider,
    IAccountingBillsProvider,
    IAccountingPaymentRecordsProvider,
    IAccountingAssetsProvider,
    IAccountingInventoryProvider,
    IAccountingPayrollProvider,
    IAccountingChartOfAccountsProvider,
    IAccountingManualJournalsProvider,
    IAccountingGeneralLedgerProvider
{
  private readonly logger = new Logger(XeroAccountingProvider.name);

  constructor(
    private readonly connectionService: XeroConnectionService,
    private readonly orgService: XeroOrganisationsService,
  ) {}

  // ─── Identity ────────────────────────────────────────────────────────────────

  readonly providerKey = XERO_PROVIDER_KEY;
  readonly displayName = XERO_DISPLAY_NAME;
  readonly description =
    'Xero cloud accounting software for small and medium businesses.';

  // ─── Capability flags ─────────────────────────────────────────────────────────

  readonly supportsConnection = true as const;
  readonly supportsOrganisation = true as const;
  readonly supportsBanking = true as const;
  readonly supportsContacts = true as const;
  readonly supportsInvoices = true as const;
  readonly supportsBills = true as const;
  readonly supportsPaymentRecords = true as const;
  readonly supportsAssets = true as const;
  readonly supportsInventory = true as const;
  readonly supportsPayroll = true as const;
  readonly supportsChartOfAccounts = true as const;
  readonly supportsManualJournals = true as const;
  readonly supportsGeneralLedger = true as const;

  // ─── IAccountingProvider ──────────────────────────────────────────────────────

  getCapabilities(): AccountingProviderCapabilities {
    return XERO_ACCOUNTING_CAPABILITIES;
  }

  getMetadata(): AccountingProviderMetadata {
    return {
      providerKey: this.providerKey,
      displayName: this.displayName,
      description: this.description,
      connectionType: XERO_CONNECTION_TYPE,
    };
  }

  // ─── IAccountingConnectionProvider ───────────────────────────────────────────

  validateConnection(
    _context: AccountingProviderContext,
  ): Promise<AccountingConnectionResult> {
    throw new NotImplementedException(
      'XeroAccountingProvider.validateConnection is not yet implemented.',
    );
  }

  // ─── IAccountingOrganisationProvider ─────────────────────────────────────────

  getOrganisation(
    _context: AccountingProviderContext,
  ): Promise<OrganisationSummary> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getOrganisation is not yet implemented.',
    );
  }

  // ─── IAccountingBankingProvider ───────────────────────────────────────────────

  /**
   * Lists all bank accounts for the connected Xero organisation.
   *
   * Xero endpoint: GET /api.xro/2.0/Accounts?Type=BANK
   *
   * By default only ACTIVE accounts are returned. Pass `includeArchived=true`
   * in the params to include ARCHIVED accounts.
   */
  async listBankAccounts(
    context: AccountingProviderContext,
    params: AccountingListParams & {
      includeArchived?: boolean;
      accountType?: string;
      withBalances?: boolean;
    },
  ): Promise<AccountingListResult<BankAccountSummary>> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const accountsUrl = new URL(`${XERO_ACCOUNTING_BASE_URL}/Accounts`);

    // In Xero, all financial accounts (bank accounts AND credit cards) have Type==="BANK".
    // The BankAccountType field distinguishes them: 'BANK', 'CREDITCARD', 'PAYPAL'.
    // We always query Type=="BANK" and then sub-filter by BankAccountType in code.
    // Do NOT pass accountType as the Xero Type filter — querying Type=="CREDITCARD" returns nothing.
    const conditions: string[] = ['Type=="BANK"'];

    if (params.search) {
      conditions.push(
        `Name.ToLower().Contains("${params.search.toLowerCase().replace(/"/g, '')}")`,
      );
    }

    accountsUrl.searchParams.set('where', conditions.join('&&'));

    // Xero returns only ACTIVE accounts by default; includeArchived=true adds ARCHIVED.
    if (params.includeArchived) {
      accountsUrl.searchParams.set('includeArchived', 'true');
    }

    // Fetch the accounts list first (always).
    // BankSummary is fetched in parallel when withBalances=true.
    //
    // BankSummary failure is handled gracefully: if the token lacks
    // accounting.reports.banksummary.read scope (older OAuth connections)
    // or the report is unavailable, accounts are returned without balance
    // data rather than failing the entire request with 503.

    this.logger.debug(
      `[listBankAccounts] withBalances=${String(params.withBalances)} ` +
        `(type=${typeof params.withBalances})`,
    );

    // Run both fetches in parallel within Promise.all so Accounts is always
    // the first fetch (left-to-right evaluation).
    // BankSummary errors are caught inside the second promise so a scope issue
    // or transient Xero error degrades gracefully instead of failing 503.
    const [accountsData, reportData] = await Promise.all([
      this.xeroGet<XeroAccountsResponse>(accountsUrl.toString(), accessToken, tenantId),
      params.withBalances
        ? this.xeroGet<XeroReportResponse>(
            `${XERO_ACCOUNTING_BASE_URL}/Reports/BankSummary`,
            accessToken,
            tenantId,
          ).catch((err: unknown) => {
            this.logger.warn(
              `[listBankAccounts] BankSummary unavailable — returning accounts ` +
                `without balance data. Reason: ${(err as Error)?.message ?? 'unknown'}`,
            );
            return null as XeroReportResponse | null;
          })
        : Promise.resolve(null as XeroReportResponse | null),
    ]);

    this.logger.debug(
      `[listBankAccounts] accounts=${accountsData.Accounts?.length ?? 0} ` +
        `reportData=${reportData !== null ? 'present' : 'null'} ` +
        `reportRows=${(reportData as any)?.Reports?.[0]?.Rows?.length ?? 0}`,
    );

    // Defensive guard: keep only Type=BANK accounts.
    let accounts = (accountsData.Accounts ?? []).filter((a) => a.Type === 'BANK');

    // Sub-filter by BankAccountType when the caller specifies an account sub-type.
    // 'CREDITCARD' → only credit card accounts (BankAccountType === 'CREDITCARD').
    // 'BANK'       → only standard bank accounts (BankAccountType is 'BANK' or absent).
    // undefined    → all financial accounts (no sub-filter).
    const requestedSubType = params.accountType?.toUpperCase();
    if (requestedSubType === 'CREDITCARD') {
      accounts = accounts.filter((a) => a.BankAccountType === 'CREDITCARD');
    } else if (requestedSubType === 'BANK') {
      accounts = accounts.filter((a) => a.BankAccountType !== 'CREDITCARD');
    }

    // Build a currency map (AccountID → CurrencyCode) for balance parsing.
    // parseMoney needs the currency to build the canonical AccountingMoney object.
    const currencyMap = new Map<string, string | undefined>(
      accounts.map((a) => [a.AccountID, a.CurrencyCode]),
    );

    // Parse the BankSummary report into a lookup map when fetched.
    const balanceMap = reportData
      ? this.parseBankSummaryMap(reportData, currencyMap)
      : null;

    const limit = params.limit ?? 50;

    const summaries: BankAccountSummary[] = accounts.map((a) => {
      const base = this.toSummary(a);
      if (!balanceMap) return base;
      const bal = balanceMap.get(a.AccountID);
      return {
        ...base,
        xeroBalance:      bal?.xeroBalance,
        statementBalance: bal?.statementBalance,
      };
    });

    return {
      data: summaries.slice(0, limit),
      hasMore: summaries.length > limit,
      total: accounts.length,
    };
  }

  /**
   * Retrieves a single bank account by its Xero AccountID.
   *
   * Xero endpoint: GET /api.xro/2.0/Accounts/{AccountID}
   */
  async getBankAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<BankAccountDetail> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const url = `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`;
    const data = await this.xeroGet<XeroAccountsResponse>(
      url,
      accessToken,
      tenantId,
    );

    const account = data.Accounts?.[0];
    if (!account) {
      throw new AccountingResourceNotFoundError('bank account', accountId);
    }

    return this.toDetail(account);
  }

  /**
   * Retrieves the current balance for a bank account.
   *
   * Fetches account details (for currency) and the BankSummary report
   * (for statement and Xero balances) in parallel.
   *
   * Xero endpoints:
   *   GET /api.xro/2.0/Accounts/{AccountID}
   *   GET /api.xro/2.0/Reports/BankSummary
   */
  async getBankAccountBalance(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<BankAccountBalance> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const [accountData, reportData] = await Promise.all([
      this.xeroGet<XeroAccountsResponse>(
        `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`,
        accessToken,
        tenantId,
      ),
      this.xeroGet<XeroReportResponse>(
        `${XERO_ACCOUNTING_BASE_URL}/Reports/BankSummary`,
        accessToken,
        tenantId,
      ),
    ]);

    const account = accountData.Accounts?.[0];
    if (!account) {
      throw new AccountingResourceNotFoundError('bank account', accountId);
    }

    const currency = account.CurrencyCode;
    const balance = this.extractBankSummaryRow(
      reportData,
      accountId,
      account.Name,
      currency,
    );

    return balance;
  }

  /**
   * Lists bank transactions for a specific BANK account.
   *
   * Xero endpoint: GET /api.xro/2.0/BankTransactions
   * Required scope: accounting.transactions
   *
   * Xero uses page-based pagination (100 records per page).
   * Pass cursor as the page number string ('1', '2', …).
   *
   * Date params must be ISO date strings (YYYY-MM-DD).
   */
  async listBankTransactions(
    context: AccountingProviderContext,
    bankAccountId: string,
    params: ListBankTransactionsParams,
  ): Promise<AccountingListResult<BankTransactionSummary>> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const XERO_PAGE_SIZE = 100;
    const url = new URL(`${XERO_ACCOUNTING_BASE_URL}/BankTransactions`);
    url.searchParams.set('BankAccountID', bankAccountId);

    // Xero page-based pagination; cursor encodes the page number.
    const page = params.cursor ? parseInt(params.cursor, 10) || 1 : 1;
    url.searchParams.set('page', String(page));

    if (params.dateFrom) url.searchParams.set('fromDate', params.dateFrom);
    if (params.dateTo) url.searchParams.set('toDate', params.dateTo);

    // Status filter: AUTHORISED (default) or DELETED.
    if (params.status && params.status !== 'all') {
      url.searchParams.set(
        'Status',
        params.status === 'deleted' ? 'DELETED' : 'AUTHORISED',
      );
    }

    this.logger.debug(`[xero-banking] GET ${url.toString()}`);

    const data = await this.xeroGet<XeroBankTransactionsResponse>(
      url.toString(),
      accessToken,
      tenantId,
    );

    const transactions = data.BankTransactions ?? [];
    const summaries = transactions.map((t) =>
      this.toBankTransactionSummary(t, bankAccountId),
    );

    return {
      data: summaries,
      // Xero signals "more pages exist" by returning a full page of results.
      hasMore: transactions.length === XERO_PAGE_SIZE,
      nextCursor:
        transactions.length === XERO_PAGE_SIZE ? String(page + 1) : undefined,
      total: summaries.length,
    };
  }

  // ─── IAccountingContactsProvider ─────────────────────────────────────────────

  listContacts(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<ContactSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listContacts is not yet implemented.',
    );
  }

  getContact(
    _context: AccountingProviderContext,
    _contactId: string,
  ): Promise<ContactDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getContact is not yet implemented.',
    );
  }

  createContact(
    _context: AccountingProviderContext,
    _params: CreateContactParams,
  ): Promise<ContactDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.createContact is not yet implemented.',
    );
  }

  updateContact(
    _context: AccountingProviderContext,
    _contactId: string,
    _params: UpdateContactParams,
  ): Promise<ContactDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.updateContact is not yet implemented.',
    );
  }

  // ─── IAccountingInvoicesProvider ─────────────────────────────────────────────

  listInvoices(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<InvoiceSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listInvoices is not yet implemented.',
    );
  }

  getInvoice(
    _context: AccountingProviderContext,
    _invoiceId: string,
  ): Promise<InvoiceDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getInvoice is not yet implemented.',
    );
  }

  createInvoice(
    _context: AccountingProviderContext,
    _params: CreateInvoiceParams,
  ): Promise<InvoiceDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.createInvoice is not yet implemented.',
    );
  }

  updateInvoice(
    _context: AccountingProviderContext,
    _invoiceId: string,
    _params: UpdateInvoiceParams,
  ): Promise<InvoiceDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.updateInvoice is not yet implemented.',
    );
  }

  // ─── IAccountingBillsProvider ─────────────────────────────────────────────────

  listBills(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<BillSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listBills is not yet implemented.',
    );
  }

  getBill(
    _context: AccountingProviderContext,
    _billId: string,
  ): Promise<BillDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getBill is not yet implemented.',
    );
  }

  createBill(
    _context: AccountingProviderContext,
    _params: CreateBillParams,
  ): Promise<BillDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.createBill is not yet implemented.',
    );
  }

  updateBill(
    _context: AccountingProviderContext,
    _billId: string,
    _params: UpdateBillParams,
  ): Promise<BillDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.updateBill is not yet implemented.',
    );
  }

  // ─── IAccountingPaymentRecordsProvider ───────────────────────────────────────

  createPaymentRecord(
    _context: AccountingProviderContext,
    _params: CreatePaymentRecordParams,
  ): Promise<PaymentRecordSummary> {
    throw new NotImplementedException(
      'XeroAccountingProvider.createPaymentRecord is not yet implemented.',
    );
  }

  getPaymentRecord(
    _context: AccountingProviderContext,
    _paymentId: string,
  ): Promise<PaymentRecordSummary> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getPaymentRecord is not yet implemented.',
    );
  }

  // ─── IAccountingAssetsProvider ────────────────────────────────────────────────

  listAssets(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<AssetSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listAssets is not yet implemented.',
    );
  }

  getAsset(
    _context: AccountingProviderContext,
    _assetId: string,
  ): Promise<AssetDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getAsset is not yet implemented.',
    );
  }

  // ─── IAccountingInventoryProvider ────────────────────────────────────────────

  listInventoryItems(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<InventoryItemSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listInventoryItems is not yet implemented.',
    );
  }

  getInventoryItem(
    _context: AccountingProviderContext,
    _itemId: string,
  ): Promise<InventoryItemDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getInventoryItem is not yet implemented.',
    );
  }

  // ─── IAccountingPayrollProvider ──────────────────────────────────────────────

  listEmployees(
    _context: AccountingProviderContext,
    _params: AccountingListParams,
  ): Promise<AccountingListResult<EmployeeSummary>> {
    throw new NotImplementedException(
      'XeroAccountingProvider.listEmployees is not yet implemented.',
    );
  }

  getEmployee(
    _context: AccountingProviderContext,
    _employeeId: string,
  ): Promise<EmployeeDetail> {
    throw new NotImplementedException(
      'XeroAccountingProvider.getEmployee is not yet implemented.',
    );
  }

  // ─── IAccountingChartOfAccountsProvider ──────────────────────────────────────

  async listAccounts(
    context: AccountingProviderContext,
    params: ListAccountsParams,
  ): Promise<AccountingListResult<AccountSummary>> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const url = new URL(`${XERO_ACCOUNTING_BASE_URL}/Accounts`);

    if (params.status === 'archived') {
      url.searchParams.set(
        'where',
        params.type
          ? `Type=="${params.type}"&&Status=="ARCHIVED"`
          : 'Status=="ARCHIVED"',
      );
    } else if (params.status === 'all' || params.status === undefined) {
      if (!params.type) {
        url.searchParams.set('includeArchived', 'true');
      } else {
        url.searchParams.set('where', `Type=="${params.type}"`);
      }
    } else {
      // status === 'active' (default) — no special param, Xero returns ACTIVE by default
      if (params.type) {
        url.searchParams.set('where', `Type=="${params.type}"`);
      }
    }

    if (params.search) {
      url.searchParams.set('searchTerm', params.search);
    }

    const data = await this.xeroGet<XeroAccountsResponse>(
      url.toString(),
      accessToken,
      tenantId,
    );
    const accounts = data.Accounts ?? [];
    const limit = params.limit ?? 100;

    const summaries: AccountSummary[] = accounts.map(
      this.toAccountSummary.bind(this),
    );

    return {
      data: summaries.slice(0, limit),
      hasMore: accounts.length > limit,
      total: accounts.length,
    };
  }

  async getAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<AccountDetail> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);
    const url = `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`;
    const data = await this.xeroGet<XeroAccountsResponse>(
      url,
      accessToken,
      tenantId,
    );
    const account = data.Accounts?.[0];
    if (!account) {
      throw new AccountingResourceNotFoundError('account', accountId);
    }
    return this.toAccountDetail(account);
  }

  async createAccount(
    context: AccountingProviderContext,
    params: CreateAccountParams,
  ): Promise<AccountDetail> {
    this.assertWriteScope(context);
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const body: Record<string, unknown> = {
      Name: params.name,
      Type: params.type.toUpperCase(),
    };
    if (params.code !== undefined) body['Code'] = params.code;
    if (params.taxType !== undefined) body['TaxType'] = params.taxType;
    if (params.description !== undefined)
      body['Description'] = params.description;
    if (params.currency !== undefined) body['CurrencyCode'] = params.currency;
    if (params.paymentsEnabled !== undefined)
      body['EnablePaymentsToAccount'] = params.paymentsEnabled;
    if (params.showInExpenseClaims !== undefined)
      body['ShowInExpenseClaims'] = params.showInExpenseClaims;

    const result = await this.xeroWrite<XeroAccountsResponse>(
      `${XERO_ACCOUNTING_BASE_URL}/Accounts`,
      'PUT',
      { Accounts: [body] },
      accessToken,
      tenantId,
    );

    const created = result.Accounts?.[0];
    if (!created) {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        'No account returned after creation',
      );
    }
    return this.toAccountDetail(created);
  }

  async updateAccount(
    context: AccountingProviderContext,
    accountId: string,
    params: UpdateAccountParams,
  ): Promise<AccountDetail> {
    this.assertWriteScope(context);
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const body: Record<string, unknown> = {};
    if (params.code !== undefined) body['Code'] = params.code;
    if (params.name !== undefined) body['Name'] = params.name;
    if (params.taxType !== undefined) body['TaxType'] = params.taxType;
    if (params.description !== undefined)
      body['Description'] = params.description;
    if (params.paymentsEnabled !== undefined)
      body['EnablePaymentsToAccount'] = params.paymentsEnabled;
    if (params.showInExpenseClaims !== undefined)
      body['ShowInExpenseClaims'] = params.showInExpenseClaims;

    const result = await this.xeroWrite<XeroAccountsResponse>(
      `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`,
      'POST',
      body,
      accessToken,
      tenantId,
    );

    const updated = result.Accounts?.[0];
    if (!updated) {
      throw new AccountingResourceNotFoundError('account', accountId);
    }
    return this.toAccountDetail(updated);
  }

  async archiveAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<ArchiveAccountResult> {
    this.assertWriteScope(context);
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    await this.xeroWrite<XeroAccountsResponse>(
      `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`,
      'POST',
      { Status: 'ARCHIVED' },
      accessToken,
      tenantId,
    );

    return { id: accountId, archived: true };
  }

  async deleteAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<DeleteAccountResult> {
    this.assertWriteScope(context);
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);
    const url = `${XERO_ACCOUNTING_BASE_URL}/Accounts/${encodeURIComponent(accountId)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          Accept: 'application/json',
        },
      });
    } catch (err: unknown) {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        `Network error calling Xero: ${(err as Error)?.message ?? 'unknown'}`,
      );
    }

    if (res.status === 204 || res.status === 200) {
      return { deleted: true };
    }

    // Parse Xero error body
    let body: XeroApiError = {};
    try {
      body = (await res.json()) as XeroApiError;
    } catch {
      /* ignore */
    }

    const msg = this.extractXeroErrorMessage(body);

    if (res.status === 401) {
      throw new AccountingReauthorisationRequiredError(
        'Xero rejected the delete request as unauthorized (HTTP 401). ' +
          'Reconnect via Provider Credentials to re-authorise with accounting.settings scope.',
      );
    }

    if (res.status === 400 || res.status === 403 || res.status === 405) {
      const lower = msg.toLowerCase();
      if (lower.includes('system') && lower.includes('account')) {
        throw new AccountingSystemAccountError('deleted');
      }
      throw new AccountingAccountCannotBeDeletedError(
        `${msg} Archive it instead.`,
      );
    }

    throw new AccountingProviderUnavailableError(
      this.providerKey,
      `Xero returned ${res.status} when deleting account`,
    );
  }

  // ─── IAccountingManualJournalsProvider ───────────────────────────────────────

  /**
   * Lists manual journals for the connected Xero organisation.
   * Xero endpoint: GET /api.xro/2.0/ManualJournals
   * Required scope: accounting.manualjournals (or accounting.manualjournals.read)
   */
  async listManualJournals(
    context: AccountingProviderContext,
    params: ListManualJournalsParams,
  ): Promise<AccountingListResult<ManualJournalSummary>> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const XERO_PAGE_SIZE = 100;
    const url = new URL(`${XERO_ACCOUNTING_BASE_URL}/ManualJournals`);

    const page = params.cursor ? parseInt(params.cursor, 10) || 1 : 1;
    url.searchParams.set('page', String(page));

    if (params.dateFrom) url.searchParams.set('fromDate', params.dateFrom);
    if (params.dateTo) url.searchParams.set('toDate', params.dateTo);

    if (params.status && params.status !== 'all') {
      url.searchParams.set('Status', params.status.toUpperCase());
    }

    this.logger.debug(`[xero-manual-journals] GET ${url.toString()}`);

    const data = await this.xeroGet<XeroManualJournalsResponse>(
      url.toString(),
      accessToken,
      tenantId,
    );

    const journals = data.ManualJournals ?? [];
    const summaries: ManualJournalSummary[] = journals.map((mj) => this.toManualJournalSummary(mj));

    return {
      data: summaries,
      hasMore: journals.length === XERO_PAGE_SIZE,
      nextCursor:
        journals.length === XERO_PAGE_SIZE ? String(page + 1) : undefined,
      total: summaries.length,
    };
  }

  /**
   * Retrieves a single manual journal by its Xero ManualJournalID.
   * Xero endpoint: GET /api.xro/2.0/ManualJournals/{ManualJournalID}
   */
  async getManualJournal(
    context: AccountingProviderContext,
    manualJournalId: string,
  ): Promise<ManualJournalDetail> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const url = `${XERO_ACCOUNTING_BASE_URL}/ManualJournals/${encodeURIComponent(manualJournalId)}`;
    const data = await this.xeroGet<XeroManualJournalsResponse>(
      url,
      accessToken,
      tenantId,
    );
    const mj = data.ManualJournals?.[0];
    if (!mj) {
      throw new AccountingResourceNotFoundError(
        'manual journal',
        manualJournalId,
      );
    }
    return this.toManualJournalDetail(mj);
  }

  /**
   * Creates a new manual journal in Xero.
   * Xero endpoint: PUT /api.xro/2.0/ManualJournals
   * Required scope: accounting.manualjournals
   *
   * Communications validates structure only. The external application is
   * responsible for account codes, amounts, debit/credit intent, and taxes.
   */
  async createManualJournal(
    context: AccountingProviderContext,
    request: CreateManualJournalRequest,
  ): Promise<ManualJournalDetail> {
    this.assertScopePresent(
      context,
      'accounting.manualjournals',
      'Creating manual journals',
    );

    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const body: Record<string, unknown> = {
      Narration: request.narration,
      Date: request.date,
      JournalLines: request.lines.map(this.toXeroManualJournalLine.bind(this)),
    };

    if (request.status) body['Status'] = request.status.toUpperCase();
    if (request.lineAmountType)
      body['LineAmountTypes'] = request.lineAmountType;
    if (request.showOnCashBasisReports !== undefined)
      body['ShowOnCashBasisReports'] = request.showOnCashBasisReports;
    if (request.externalReference) body['Url'] = request.externalReference;

    const result = await this.xeroWrite<XeroManualJournalsResponse>(
      `${XERO_ACCOUNTING_BASE_URL}/ManualJournals`,
      'PUT',
      { ManualJournals: [body] },
      accessToken,
      tenantId,
    );

    const created = result.ManualJournals?.[0];
    if (!created) {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        'No manual journal returned after creation',
      );
    }
    return this.toManualJournalDetail(created);
  }

  /**
   * Updates an existing manual journal in Xero.
   * Xero endpoint: POST /api.xro/2.0/ManualJournals/{ManualJournalID}
   * Required scope: accounting.manualjournals
   *
   * Only DRAFT journals can be updated. POSTED journals are immutable.
   */
  async updateManualJournal(
    context: AccountingProviderContext,
    manualJournalId: string,
    request: UpdateManualJournalRequest,
  ): Promise<ManualJournalDetail> {
    this.assertScopePresent(
      context,
      'accounting.manualjournals',
      'Updating manual journals',
    );

    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const body: Record<string, unknown> = {};
    if (request.narration) body['Narration'] = request.narration;
    if (request.date) body['Date'] = request.date;
    if (request.status) body['Status'] = request.status.toUpperCase();
    if (request.lineAmountType)
      body['LineAmountTypes'] = request.lineAmountType;
    if (request.showOnCashBasisReports !== undefined)
      body['ShowOnCashBasisReports'] = request.showOnCashBasisReports;
    if (request.externalReference) body['Url'] = request.externalReference;
    if (request.lines)
      body['JournalLines'] = request.lines.map(
        this.toXeroManualJournalLine.bind(this),
      );

    const result = await this.xeroWrite<XeroManualJournalsResponse>(
      `${XERO_ACCOUNTING_BASE_URL}/ManualJournals/${encodeURIComponent(manualJournalId)}`,
      'POST',
      body,
      accessToken,
      tenantId,
    );

    const updated = result.ManualJournals?.[0];
    if (!updated) {
      throw new AccountingResourceNotFoundError(
        'manual journal',
        manualJournalId,
      );
    }
    return this.toManualJournalDetail(updated);
  }

  // ─── IAccountingGeneralLedgerProvider ────────────────────────────────────────

  /**
   * Lists general ledger journal entries from Xero.
   * Xero endpoint: GET /api.xro/2.0/Journals
   * Required scope: accounting.journals.read
   *
   * READ-ONLY — never used for creating or modifying journals.
   * Xero uses offset-based pagination (not page-based) for this endpoint.
   */
  async listJournals(
    context: AccountingProviderContext,
    params: ListJournalsParams,
  ): Promise<AccountingListResult<JournalSummary>> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const XERO_PAGE_SIZE = 100;
    const url = new URL(`${XERO_ACCOUNTING_BASE_URL}/Journals`);

    const offset =
      params.offset ?? (params.cursor ? parseInt(params.cursor, 10) || 0 : 0);
    if (offset > 0) url.searchParams.set('offset', String(offset));

    if (params.dateFrom) url.searchParams.set('fromDate', params.dateFrom);
    if (params.dateTo) url.searchParams.set('toDate', params.dateTo);

    if (params.sourceType) {
      url.searchParams.set('sourceType', params.sourceType);
    }

    this.logger.debug(`[xero-general-ledger] GET ${url.toString()}`);

    const data = await this.xeroGet<XeroJournalsResponse>(
      url.toString(),
      accessToken,
      tenantId,
    );

    const journals = data.Journals ?? [];
    const summaries: JournalSummary[] = journals.map((j) => this.toJournalSummary(j));

    const nextOffset = offset + journals.length;
    return {
      data: summaries,
      hasMore: journals.length === XERO_PAGE_SIZE,
      nextCursor:
        journals.length === XERO_PAGE_SIZE ? String(nextOffset) : undefined,
      total: summaries.length,
    };
  }

  /**
   * Retrieves a single general ledger journal by its Xero JournalID.
   * Xero endpoint: GET /api.xro/2.0/Journals/{JournalID}
   */
  async getJournal(
    context: AccountingProviderContext,
    journalId: string,
  ): Promise<JournalSummary> {
    const { accessToken, tenantId } = await this.resolveXeroAuth(context);

    const url = `${XERO_ACCOUNTING_BASE_URL}/Journals/${encodeURIComponent(journalId)}`;
    const data = await this.xeroGet<XeroJournalsResponse>(
      url,
      accessToken,
      tenantId,
    );
    const journal = data.Journals?.[0];
    if (!journal) {
      throw new AccountingResourceNotFoundError('journal', journalId);
    }
    return this.toJournalSummary(journal);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Extracts a valid Xero access token and tenantId from the provider context.
   *
   * Resolution order:
   *   1. If context.organisationId is set, resolve it to a tenantId via
   *      XeroOrganisationsService (validates ownership, credential match,
   *      and availability).  This is the preferred path for multi-org connections.
   *   2. Otherwise fall back to the tenantId stored in the credential.
   *      This supports legacy single-org connections that pre-date the
   *      organisation management layer.
   *
   * Delegates token refresh to XeroConnectionService when the access token
   * is missing or near expiry.  Never exposes the tenantId to external callers.
   */
  private async resolveXeroAuth(
    context: AccountingProviderContext,
  ): Promise<{ accessToken: string; tenantId: string }> {
    const decrypted = context.credentials as XeroOAuthCredentials;

    let tenantId: string;

    if (context.organisationId) {
      // Preferred path: resolve Communications org ID → Xero tenantId.
      // Validates that the org belongs to this credential and company.
      // companyId is omitted — credential ownership was already validated
      // by AccountingResolverService before the context reached this provider.
      const resolved = await this.orgService.resolveOrganisation({
        organisationId: context.organisationId,
        credentialId: context.credentialsId,
      });

      if (!resolved) {
        throw new AccountingProviderUnavailableError(
          this.providerKey,
          'The selected organisation is not available for this connection. ' +
            'It may have been revoked in Xero — try refreshing organisations.',
        );
      }
      tenantId = resolved.tenantId;
    } else if (decrypted.tenantId) {
      // Legacy fallback: use the tenantId stored directly in the credential.
      tenantId = decrypted.tenantId;
    } else {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        'No organisation selected and no default Xero tenant found. ' +
          'Select an organisation or complete the OAuth authorization flow.',
      );
    }

    const accessToken = await this.connectionService.ensureFreshAccessToken({
      credentialId: context.credentialsId,
      decrypted,
    });

    return { accessToken, tenantId };
  }

  /**
   * Makes a GET request to the Xero Accounting API and returns parsed JSON.
   * Throws AccountingProviderUnavailableError on non-OK responses.
   */
  private async xeroGet<T>(
    url: string,
    accessToken: string,
    tenantId: string,
  ): Promise<T> {
    this.logger.debug(`[xero-banking] GET ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          Accept: 'application/json',
        },
      });
    } catch (err: any) {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        `Network error calling Xero: ${err?.message ?? 'unknown'}`,
      );
    }

    if (res.status === 404) {
      // Resource not found — return an empty object.
      // Callers that fetch a single resource (e.g. getAccount, getBankAccount) will
      // find their expected field absent and throw AccountingResourceNotFoundError.
      // Callers that list resources will find their collection field absent and
      // apply the ?? [] fallback, returning an empty list.
      // DO NOT return {Accounts:[]} here — that shape is wrong for non-Account resources
      // (BankTransactions, Journals, ManualJournals, etc.) and would mask real errors.
      this.logger.warn(`[xero] GET ${url} returned 404`);
      return {} as unknown as T;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(
        `[xero-banking] GET ${url} failed: status=${res.status} body=${body.substring(0, 200)}`,
      );
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        `Xero API returned ${res.status} — check scopes and tenant access`,
      );
    }

    return res.json() as Promise<T>;
  }

  /**
   * Makes a PUT or POST request to the Xero Accounting API.
   * Handles Xero-specific error codes and maps them to domain errors.
   */
  /**
   * Pre-flight scope check for write operations.
   *
   * Verifies that the OAuth token was issued with accounting.settings
   * (the Xero write scope for Chart of Accounts) before attempting any
   * PUT/POST/DELETE call.
   *
   * This provides a clear, immediate error instead of waiting for a 401
   * from Xero, and distinguishes between "token lacks write scope" and
   * "token is expired" (the latter is handled by ensureFreshAccessToken).
   *
   * The stored `scopes` field reflects what was granted at the time of the
   * last OAuth authorization flow. Refreshing the access token does NOT
   * upgrade the scope set — the user must reconnect via full OAuth.
   */
  private assertWriteScope(context: AccountingProviderContext): void {
    // 'accounting.settings' is the Xero write scope for Chart of Accounts.
    this.assertScopePresent(
      context,
      'accounting.settings',
      'Write operations (create, update, archive, delete)',
    );
  }

  /**
   * Asserts that the OAuth token includes the specified Xero scope.
   * Throws AccountingReauthorisationRequiredError with a clear reconnect message when absent.
   */
  private assertScopePresent(
    context: AccountingProviderContext,
    requiredScope: string,
    description: string,
  ): void {
    const decrypted =
      context.credentials as import('./xero.credentials.contract').XeroOAuthCredentials;
    const grantedScopes = (decrypted.scopes ?? '').split(' ');

    if (!grantedScopes.includes(requiredScope)) {
      throw new AccountingReauthorisationRequiredError(
        `The current token was issued with scope "${decrypted.scopes ?? 'unknown'}". ` +
          `${description} require${description.endsWith('s') ? '' : 's'} ${requiredScope}. ` +
          'Reconnect via Provider Credentials to re-authorise with the required scope.',
      );
    }
  }

  private async xeroWrite<T>(
    url: string,
    method: 'PUT' | 'POST',
    body: unknown,
    accessToken: string,
    tenantId: string,
  ): Promise<T> {
    this.logger.debug(`[xero-accounts] ${method} ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err: unknown) {
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        `Network error calling Xero: ${(err as Error)?.message ?? 'unknown'}`,
      );
    }

    if (!res.ok) {
      let errBody: XeroApiError = {};
      try {
        errBody = (await res.json()) as XeroApiError;
      } catch {
        /* ignore */
      }

      const msg = this.extractXeroErrorMessage(errBody);
      const lower = msg.toLowerCase();

      if (res.status === 401) {
        // Token lacks write scope (accounting.settings). The token was most likely
        // issued before the write scope was added — reconnect is required.
        throw new AccountingReauthorisationRequiredError(
          'Xero rejected the request as unauthorized (HTTP 401). ' +
            'The current token may have been issued without the accounting.settings write scope. ' +
            'Reconnect via Provider Credentials to re-authorise.',
        );
      }

      if (res.status === 400) {
        // Duplicate code
        if (
          lower.includes('code') &&
          (lower.includes('duplicate') ||
            lower.includes('already used') ||
            lower.includes('already exists'))
        ) {
          const code =
            body && typeof body === 'object' && 'Code' in body
              ? String((body as Record<string, unknown>)['Code'])
              : body && typeof body === 'object' && 'Accounts' in body
                ? String(
                    (
                      (body as Record<string, unknown>)['Accounts'] as Array<
                        Record<string, unknown>
                      >
                    )?.[0]?.['Code'] ?? '',
                  )
                : '';
          throw new AccountingDuplicateCodeError(code);
        }
        // System account restriction
        if (lower.includes('system account')) {
          throw new AccountingSystemAccountError('modified');
        }
        throw new AccountingValidationError(msg);
      }

      if (res.status === 403) {
        throw new AccountingSystemAccountError('modified');
      }

      this.logger.warn(
        `[xero-accounts] ${method} ${url} failed: ${res.status} ${msg}`,
      );
      throw new AccountingProviderUnavailableError(
        this.providerKey,
        `Xero API returned ${res.status} — check scopes and tenant access`,
      );
    }

    return res.json() as Promise<T>;
  }

  private extractXeroErrorMessage(body: XeroApiError): string {
    // Try Elements[].ValidationErrors[].Message
    const element = body.Elements?.[0];
    if (element?.ValidationErrors?.length) {
      return element.ValidationErrors.map((v) => v.Message).join('; ');
    }
    return body.Detail ?? body.Title ?? 'Unknown Xero error';
  }

  // ─── Bank transaction mappers ─────────────────────────────────────────────────

  /**
   * Parses Xero's /Date(milliseconds+offset)/ format to YYYY-MM-DD.
   * Returns undefined when raw is absent or unparseable.
   */
  private parseXeroDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    const match = /\/Date\((\d+)[+-]/.exec(raw);
    if (!match) return undefined;
    return new Date(parseInt(match[1], 10)).toISOString().slice(0, 10);
  }

  private toBankTransactionSummary(
    t: XeroBankTransaction,
    bankAccountId: string,
  ): BankTransactionSummary {
    const direction: 'in' | 'out' = t.Type?.startsWith('RECEIVE')
      ? 'in'
      : 'out';
    const totalMinor = Math.round((t.Total ?? 0) * 100);

    return {
      id: t.BankTransactionID,
      bankAccountId,
      type: t.Type ?? 'UNKNOWN',
      direction,
      status: t.Status?.toUpperCase() === 'DELETED' ? 'deleted' : 'authorised',
      date: this.parseXeroDate(t.Date),
      contactName: t.Contact?.Name || undefined,
      description: t.LineItems?.[0]?.Description || undefined,
      reference: t.Reference || undefined,
      total: { amountMinor: totalMinor, currency: t.CurrencyCode ?? '' },
      isReconciled: t.IsReconciled,
    };
  }

  // ─── Account mappers ──────────────────────────────────────────────────────────

  private toAccountSummary(a: XeroAccount): AccountSummary {
    return {
      id: a.AccountID,
      code: a.Code,
      name: a.Name,
      type: a.Type,
      class: a.Class,
      taxType: a.TaxType,
      status: a.Status === 'ARCHIVED' ? 'archived' : 'active',
      systemAccount: Boolean(a.SystemAccount),
      paymentsEnabled: a.EnablePaymentsToAccount,
    };
  }

  private toAccountDetail(a: XeroAccount): AccountDetail {
    return {
      ...this.toAccountSummary(a),
      description: a.Description,
      currency: a.CurrencyCode,
      bankAccountNumber: a.BankAccountNumber,
      bankAccountType: a.BankAccountType,
      showInExpenseClaims: a.ShowInExpenseClaims,
    };
  }

  // ─── Mappers ─────────────────────────────────────────────────────────────────

  private toSummary(account: XeroAccount): BankAccountSummary {
    return {
      id: account.AccountID,
      name: account.Name,
      code: account.Code,
      currency: account.CurrencyCode,
      isActive: account.Status !== 'ARCHIVED',
      type: account.BankAccountType,
      status: account.Status === 'ARCHIVED' ? 'archived' : 'active',
      bankAccountNumber: account.BankAccountNumber,
    };
  }

  private toDetail(account: XeroAccount): BankAccountDetail {
    return {
      id: account.AccountID,
      name: account.Name,
      code: account.Code,
      bankAccountNumber: account.BankAccountNumber,
      bankAccountType: account.BankAccountType?.toLowerCase(),
      currency: account.CurrencyCode,
      isActive: account.Status !== 'ARCHIVED',
      description: account.Description,
      enablePaymentsToAccount: account.EnablePaymentsToAccount,
    };
  }

  /**
   * Parses the Xero BankSummary report into a Map keyed by AccountID.
   *
   * BankSummary covers ALL bank accounts in the organisation in one response,
   * so this is called once and resolves every account's balance without N+1 calls.
   *
   * BankSummary row structure (each Row with RowType==='Row'):
   *   Cell[0] — Account name; Attributes[{Id:'account', Value:AccountID}]
   *   Cell[1] — Statement Balance (decimal string, e.g. "1234.56")
   *   Cell[2] — Balance in Xero  (decimal string, e.g. "1234.56")
   *
   * Matching is by AccountID from the Attributes — stable UUID, not a name.
   */
  /**
   * Parses the Xero BankSummary report into a Map keyed by AccountID.
   *
   * One BankSummary call covers ALL accounts — no N+1.
   *
   * ACTUAL column structure (verified from live Xero API response):
   *   Cell[0] — Account name; Attributes[{Id:'account', Value:AccountID}]
   *   Cell[1] — Opening Balance
   *   Cell[2] — Cash Received
   *   Cell[3] — Cash Spent
   *   Cell[4] — Closing Balance  ← mapped to xeroBalance
   *
   * "Statement Balance" (bank-feed reconciliation) is NOT present in this
   * report. `statementBalance` is therefore always absent from the map.
   *
   * Individual account rows only appear when there are bank transactions in
   * Xero. Orgs with no transactions have an empty Section → all balances "—".
   */
  private parseBankSummaryMap(
    report: XeroReportResponse,
    accountCurrencies: Map<string, string | undefined>,
  ): Map<string, { statementBalance?: AccountingMoney; xeroBalance?: AccountingMoney }> {
    const balanceMap = new Map<
      string,
      { statementBalance?: AccountingMoney; xeroBalance?: AccountingMoney }
    >();

    const rows = report.Reports?.[0]?.Rows ?? [];
    // Accept both 'Row' and 'SummaryRow' — individual account rows use one or
    // the other depending on the Xero org/report configuration.
    const dataRows = this.flattenReportRows(rows).filter(
      (r) => r.RowType === 'Row' || r.RowType === 'SummaryRow',
    );

    this.logger.debug(
      `[parseBankSummaryMap] totalRows=${rows.length} candidateRows=${dataRows.length} ` +
        `accountIds=[${[...accountCurrencies.keys()].join(',')}]`,
    );

    for (const row of dataRows) {
      const firstCell = row.Cells?.[0];
      const accountAttr = firstCell?.Attributes?.find(
        (a) => a.Id === 'account',
      );
      if (!accountAttr?.Value) continue;

      const accountId = accountAttr.Value;
      const currency = accountCurrencies.get(accountId);

      // Cell[4] = Closing Balance = Balance in Xero (verified from live response)
      const closingCell = row.Cells?.[4];

      this.logger.debug(
        `[parseBankSummaryMap] accountId=${accountId} ` +
          `currency=${currency ?? 'n/a'} closingBalance=${closingCell?.Value ?? 'NONE'}`,
      );

      balanceMap.set(accountId, {
        // Statement Balance is NOT available in BankSummary — omitted intentionally
        xeroBalance: this.parseMoney(closingCell, currency),
      });
    }

    this.logger.debug(`[parseBankSummaryMap] balanceMap size=${balanceMap.size}`);

    return balanceMap;
  }

  /**
   * Parses the Xero BankSummary report to extract balance data for a specific
   * bank account.
   *
   * The BankSummary report has a flat row structure. Each data row has three cells:
   *   [0] Account name — Attributes[0].Value contains the AccountID
   *   [1] Statement Balance (from bank records)
   *   [2] Balance in Xero (from Xero transaction records)
   */
  private extractBankSummaryRow(
    report: XeroReportResponse,
    accountId: string,
    accountName: string,
    currency: string | undefined,
  ): BankAccountBalance {
    const rows = report.Reports?.[0]?.Rows ?? [];
    const dataRows = this.flattenReportRows(rows).filter(
      (r) => r.RowType === 'Row',
    );

    const matchedRow = dataRows.find((row) => {
      const firstCell = row.Cells?.[0];
      return firstCell?.Attributes?.some(
        (attr) => attr.Id === 'account' && attr.Value === accountId,
      );
    });

    const now = new Date();

    if (!matchedRow?.Cells) {
      // Account exists but has no balance row — zero-value balance.
      return {
        accountId,
        accountName,
        currency,
        retrievedAt: now,
      };
    }

    const [, statementCell, xeroCell] = matchedRow.Cells;

    return {
      accountId,
      accountName,
      currency,
      statementBalance: this.parseMoney(statementCell, currency),
      xeroBalance: this.parseMoney(xeroCell, currency),
      retrievedAt: now,
    };
  }

  /** Recursively flattens nested Xero report rows (Section rows have child Rows). */
  private flattenReportRows(rows: XeroReportRow[]): XeroReportRow[] {
    const result: XeroReportRow[] = [];
    for (const row of rows) {
      result.push(row);
      if (row.Rows?.length) {
        result.push(...this.flattenReportRows(row.Rows));
      }
    }
    return result;
  }

  /**
   * Parses a Xero report cell value into an AccountingMoney amount.
   *
   * Xero returns decimal strings (e.g. "1234.56"). This implementation
   * multiplies by 100 and rounds, which is correct for 2-decimal currencies
   * (the vast majority). Currencies with different minor-unit factors (JPY,
   * KWD, etc.) will require currency-specific handling in a future iteration.
   */
  private parseMoney(
    cell: XeroReportCell | undefined,
    currency: string | undefined,
  ): AccountingMoney | undefined {
    if (!cell) return undefined;
    const raw = cell.Value?.replace(/[, ]/g, '');
    if (!raw || raw === '' || isNaN(Number(raw))) return undefined;
    const amountMinor = Math.round(parseFloat(raw) * 100);
    return { amountMinor, currency: currency ?? '' };
  }

  // ─── Manual Journal mappers ───────────────────────────────────────────────────

  private toManualJournalSummary(mj: XeroManualJournal): ManualJournalSummary {
    return {
      id: mj.ManualJournalID ?? '',
      providerResourceId: mj.ManualJournalID ?? '',
      externalReference: mj.Url || undefined,
      date: this.parseXeroDate(mj.Date),
      narration: mj.Narration,
      status: mj.Status?.toLowerCase(),
      lineAmountType: mj.LineAmountTypes,
      showOnCashBasisReports: mj.ShowOnCashBasisReports,
      hasAttachments: mj.HasAttachments,
      updatedAt: this.parseXeroDate(mj.UpdatedDateUTC),
    };
  }

  private toManualJournalDetail(mj: XeroManualJournal): ManualJournalDetail {
    return {
      ...this.toManualJournalSummary(mj),
      lines: (mj.JournalLines ?? []).map(this.toManualJournalLine.bind(this)),
      sourceUrl: mj.Url,
    };
  }

  private toManualJournalLine(line: XeroManualJournalLine): ManualJournalLine {
    return {
      accountCode: line.AccountCode ?? '',
      amount: line.LineAmount ?? 0,
      description: line.Description || undefined,
      taxType: line.TaxType || undefined,
      tracking: (line.Tracking ?? []).map((t) => ({
        name: t.Name ?? '',
        option: t.Option ?? '',
      })),
    };
  }

  private toXeroManualJournalLine(
    line: ManualJournalLine,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {
      AccountCode: line.accountCode,
      LineAmount: line.amount,
    };
    if (line.description) out['Description'] = line.description;
    if (line.taxType) out['TaxType'] = line.taxType;
    if (line.tracking?.length) {
      out['Tracking'] = line.tracking.map((t) => ({
        Name: t.name,
        Option: t.option,
      }));
    }
    return out;
  }

  // ─── General Ledger (Journals) mappers ───────────────────────────────────────

  private toJournalSummary(j: XeroJournal): JournalSummary {
    return {
      id: j.JournalID ?? '',
      journalNumber: j.JournalNumber,
      date: this.parseXeroDate(j.JournalDate),
      createdAt: this.parseXeroDate(j.CreatedDateUTC),
      reference: j.Reference || undefined,
      sourceType: j.SourceType || undefined,
      sourceId: j.SourceID || undefined,
      lines: (j.JournalLines ?? []).map(this.toJournalLineSummary.bind(this)),
    };
  }

  private toJournalLineSummary(line: XeroJournalLine): JournalLineSummary {
    return {
      journalLineId: line.JournalLineID,
      accountCode: line.AccountCode,
      accountName: line.AccountName,
      description: line.Description || undefined,
      netAmount: line.NetAmount ?? 0,
      grossAmount: line.GrossAmount,
      taxAmount: line.TaxAmount,
      taxType: line.TaxType || undefined,
    };
  }
}
