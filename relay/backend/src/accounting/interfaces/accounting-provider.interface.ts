// src/accounting/interfaces/accounting-provider.interface.ts

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
  InstitutionSummary,
  CreateBankConnectionParams,
  BankConnectionProviderResult,
  OpenBankingAccountSummary,
  OpenBankingTransactionSummary,
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
  AccountSummary,
  AccountDetail,
  CreateAccountParams,
  UpdateAccountParams,
  ArchiveAccountResult,
  DeleteAccountResult,
  ListAccountsParams,
  ManualJournalSummary,
  ManualJournalDetail,
  CreateManualJournalRequest,
  UpdateManualJournalRequest,
  ListManualJournalsParams,
  JournalSummary,
  ListJournalsParams,
} from '../types/accounting.types';

import type {
  BankAccountDetail,
  BankAccountBalance,
} from '../contracts/banking/accounting-bank-account.contract';

/**
 * Base contract every accounting provider adapter must implement.
 *
 * Technical execution capability interfaces are defined below.
 * Providers implement only the interfaces that match their feature set.
 * This keeps the base contract minimal and prevents providers from being
 * forced to stub dozens of unsupported operations.
 */
export interface IAccountingProvider {
  /** Stable identifier matching the providerKey in the catalog (e.g. 'xero'). */
  readonly providerKey: string;

  /** Human-readable provider name (e.g. 'Xero'). */
  readonly displayName: string;

  /** Short description shown in the provider catalogue UI. */
  readonly description: string;

  /**
   * Returns the provider's declared capabilities and their implementation status.
   * Status values: 'available' | 'planned' | 'unsupported'.
   *
   * A capability may only be declared 'available' when its corresponding
   * operation is fully implemented and tested.
   */
  getCapabilities(): AccountingProviderCapabilities;

  /**
   * Returns static metadata used for catalogue display and discovery.
   * Must not perform any network calls.
   */
  getMetadata(): AccountingProviderMetadata;
}

// ─── Technical execution capability interfaces ────────────────────────────────
// Each interface extends IAccountingProvider so the type predicate relationship
// is structurally sound and type guards can narrow safely.
//
// A provider MUST NOT implement any of these until the corresponding
// operation is fully built — returning a fake response is prohibited.

// ─── Connection ───────────────────────────────────────────────────────────────

export interface IAccountingConnectionProvider extends IAccountingProvider {
  readonly supportsConnection: true;
  validateConnection(
    context: AccountingProviderContext,
  ): Promise<AccountingConnectionResult>;
}

export function isAccountingConnectionProvider(
  provider: IAccountingProvider,
): provider is IAccountingConnectionProvider {
  return (
    'supportsConnection' in provider &&
    provider.supportsConnection === true &&
    'validateConnection' in provider &&
    typeof (provider as Record<string, unknown>)['validateConnection'] ===
      'function'
  );
}

// ─── Organisation ─────────────────────────────────────────────────────────────

export interface IAccountingOrganisationProvider extends IAccountingProvider {
  readonly supportsOrganisation: true;
  getOrganisation(
    context: AccountingProviderContext,
  ): Promise<OrganisationSummary>;
}

export function isAccountingOrganisationProvider(
  provider: IAccountingProvider,
): provider is IAccountingOrganisationProvider {
  return (
    'supportsOrganisation' in provider &&
    provider.supportsOrganisation === true &&
    'getOrganisation' in provider &&
    typeof (provider as Record<string, unknown>)['getOrganisation'] ===
      'function'
  );
}

// ─── Banking ──────────────────────────────────────────────────────────────────

export interface IAccountingBankingProvider extends IAccountingProvider {
  readonly supportsBanking: true;
  listBankAccounts(
    context: AccountingProviderContext,
    params: AccountingListParams & {
      includeArchived?: boolean;
      accountType?: string;
      /** When true, fetch balances from the provider report and embed them in each summary. */
      withBalances?: boolean;
    },
  ): Promise<AccountingListResult<BankAccountSummary>>;
  getBankAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<BankAccountDetail>;
  getBankAccountBalance(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<BankAccountBalance>;
  listBankTransactions(
    context: AccountingProviderContext,
    bankAccountId: string,
    params: ListBankTransactionsParams,
  ): Promise<AccountingListResult<BankTransactionSummary>>;
}

export function isAccountingBankingProvider(
  provider: IAccountingProvider,
): provider is IAccountingBankingProvider {
  return (
    'supportsBanking' in provider &&
    provider.supportsBanking === true &&
    'listBankAccounts' in provider &&
    typeof (provider as Record<string, unknown>)['listBankAccounts'] ===
      'function' &&
    'getBankAccount' in provider &&
    typeof (provider as Record<string, unknown>)['getBankAccount'] ===
      'function' &&
    'getBankAccountBalance' in provider &&
    typeof (provider as Record<string, unknown>)['getBankAccountBalance'] ===
      'function'
  );
}

// ─── Bank Connections (Open Banking) ─────────────────────────────────────────
// Generic connectivity layer for external financial institutions.
// NOT related to Xero bank accounts (see IAccountingBankingProvider above).
// Future providers: Basiq, TrueLayer, Plaid, Akahu, etc.

export interface IAccountingBankConnectionsProvider extends IAccountingProvider {
  readonly supportsBankConnections: true;

  /** Lists financial institutions the provider supports for connection. */
  listInstitutions(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<InstitutionSummary>>;

  /** Initiates a new bank connection — returns an authUrl for the consent flow. */
  createConnection(
    context: AccountingProviderContext,
    params: CreateBankConnectionParams,
  ): Promise<BankConnectionProviderResult>;

  /** Retrieves the live status of a single bank connection. */
  getConnection(
    context: AccountingProviderContext,
    providerConnectionId: string,
  ): Promise<BankConnectionProviderResult>;

  /** Lists all active bank connections for this credential. */
  listConnections(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<BankConnectionProviderResult>>;

  /** Refreshes consent or token for an existing connection. */
  refreshConnection(
    context: AccountingProviderContext,
    providerConnectionId: string,
  ): Promise<BankConnectionProviderResult>;

  /** Revokes an existing connection and removes consent. */
  disconnectConnection(
    context: AccountingProviderContext,
    providerConnectionId: string,
  ): Promise<void>;

  /** Lists bank accounts belonging to a connection. */
  listAccounts(
    context: AccountingProviderContext,
    providerConnectionId: string,
    params: AccountingListParams,
  ): Promise<AccountingListResult<OpenBankingAccountSummary>>;

  /** Returns current balances for all accounts in a connection. */
  getBalances(
    context: AccountingProviderContext,
    providerConnectionId: string,
  ): Promise<OpenBankingAccountSummary[]>;

  /** Lists transactions for a specific account. */
  listTransactions(
    context: AccountingProviderContext,
    providerConnectionId: string,
    accountId: string,
    params: AccountingListParams,
  ): Promise<AccountingListResult<OpenBankingTransactionSummary>>;
}

export function isAccountingBankConnectionsProvider(
  provider: IAccountingProvider,
): provider is IAccountingBankConnectionsProvider {
  return (
    'supportsBankConnections' in provider &&
    (provider as Record<string, unknown>)['supportsBankConnections'] === true &&
    'listConnections' in provider &&
    typeof (provider as Record<string, unknown>)['listConnections'] ===
      'function' &&
    'createConnection' in provider &&
    typeof (provider as Record<string, unknown>)['createConnection'] ===
      'function'
  );
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface IAccountingContactsProvider extends IAccountingProvider {
  readonly supportsContacts: true;
  listContacts(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<ContactSummary>>;
  getContact(
    context: AccountingProviderContext,
    contactId: string,
  ): Promise<ContactDetail>;
  createContact(
    context: AccountingProviderContext,
    params: CreateContactParams,
  ): Promise<ContactDetail>;
  updateContact(
    context: AccountingProviderContext,
    contactId: string,
    params: UpdateContactParams,
  ): Promise<ContactDetail>;
}

export function isAccountingContactsProvider(
  provider: IAccountingProvider,
): provider is IAccountingContactsProvider {
  return (
    'supportsContacts' in provider &&
    provider.supportsContacts === true &&
    'listContacts' in provider &&
    typeof (provider as Record<string, unknown>)['listContacts'] ===
      'function' &&
    'getContact' in provider &&
    typeof (provider as Record<string, unknown>)['getContact'] === 'function'
  );
}

// ─── Invoices (Accounts Receivable) ──────────────────────────────────────────

export interface IAccountingInvoicesProvider extends IAccountingProvider {
  readonly supportsInvoices: true;
  listInvoices(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<InvoiceSummary>>;
  getInvoice(
    context: AccountingProviderContext,
    invoiceId: string,
  ): Promise<InvoiceDetail>;
  createInvoice(
    context: AccountingProviderContext,
    params: CreateInvoiceParams,
  ): Promise<InvoiceDetail>;
  updateInvoice(
    context: AccountingProviderContext,
    invoiceId: string,
    params: UpdateInvoiceParams,
  ): Promise<InvoiceDetail>;
}

export function isAccountingInvoicesProvider(
  provider: IAccountingProvider,
): provider is IAccountingInvoicesProvider {
  return (
    'supportsInvoices' in provider &&
    provider.supportsInvoices === true &&
    'listInvoices' in provider &&
    typeof (provider as Record<string, unknown>)['listInvoices'] ===
      'function' &&
    'getInvoice' in provider &&
    typeof (provider as Record<string, unknown>)['getInvoice'] === 'function'
  );
}

// ─── Bills (Accounts Payable) ─────────────────────────────────────────────────

export interface IAccountingBillsProvider extends IAccountingProvider {
  readonly supportsBills: true;
  listBills(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<BillSummary>>;
  getBill(
    context: AccountingProviderContext,
    billId: string,
  ): Promise<BillDetail>;
  createBill(
    context: AccountingProviderContext,
    params: CreateBillParams,
  ): Promise<BillDetail>;
  updateBill(
    context: AccountingProviderContext,
    billId: string,
    params: UpdateBillParams,
  ): Promise<BillDetail>;
}

export function isAccountingBillsProvider(
  provider: IAccountingProvider,
): provider is IAccountingBillsProvider {
  return (
    'supportsBills' in provider &&
    provider.supportsBills === true &&
    'listBills' in provider &&
    typeof (provider as Record<string, unknown>)['listBills'] === 'function' &&
    'getBill' in provider &&
    typeof (provider as Record<string, unknown>)['getBill'] === 'function'
  );
}

// ─── Payment Records ──────────────────────────────────────────────────────────

export interface IAccountingPaymentRecordsProvider extends IAccountingProvider {
  readonly supportsPaymentRecords: true;
  createPaymentRecord(
    context: AccountingProviderContext,
    params: CreatePaymentRecordParams,
  ): Promise<PaymentRecordSummary>;
  getPaymentRecord(
    context: AccountingProviderContext,
    paymentId: string,
  ): Promise<PaymentRecordSummary>;
}

export function isAccountingPaymentRecordsProvider(
  provider: IAccountingProvider,
): provider is IAccountingPaymentRecordsProvider {
  return (
    'supportsPaymentRecords' in provider &&
    provider.supportsPaymentRecords === true &&
    'createPaymentRecord' in provider &&
    typeof (provider as Record<string, unknown>)['createPaymentRecord'] ===
      'function' &&
    'getPaymentRecord' in provider &&
    typeof (provider as Record<string, unknown>)['getPaymentRecord'] ===
      'function'
  );
}

// ─── Assets (Fixed Assets) ────────────────────────────────────────────────────

export interface IAccountingAssetsProvider extends IAccountingProvider {
  readonly supportsAssets: true;
  listAssets(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<AssetSummary>>;
  getAsset(
    context: AccountingProviderContext,
    assetId: string,
  ): Promise<AssetDetail>;
}

export function isAccountingAssetsProvider(
  provider: IAccountingProvider,
): provider is IAccountingAssetsProvider {
  return (
    'supportsAssets' in provider &&
    provider.supportsAssets === true &&
    'listAssets' in provider &&
    typeof (provider as Record<string, unknown>)['listAssets'] === 'function' &&
    'getAsset' in provider &&
    typeof (provider as Record<string, unknown>)['getAsset'] === 'function'
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface IAccountingInventoryProvider extends IAccountingProvider {
  readonly supportsInventory: true;
  listInventoryItems(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<InventoryItemSummary>>;
  getInventoryItem(
    context: AccountingProviderContext,
    itemId: string,
  ): Promise<InventoryItemDetail>;
}

export function isAccountingInventoryProvider(
  provider: IAccountingProvider,
): provider is IAccountingInventoryProvider {
  return (
    'supportsInventory' in provider &&
    provider.supportsInventory === true &&
    'listInventoryItems' in provider &&
    typeof (provider as Record<string, unknown>)['listInventoryItems'] ===
      'function' &&
    'getInventoryItem' in provider &&
    typeof (provider as Record<string, unknown>)['getInventoryItem'] ===
      'function'
  );
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface IAccountingPayrollProvider extends IAccountingProvider {
  readonly supportsPayroll: true;
  listEmployees(
    context: AccountingProviderContext,
    params: AccountingListParams,
  ): Promise<AccountingListResult<EmployeeSummary>>;
  getEmployee(
    context: AccountingProviderContext,
    employeeId: string,
  ): Promise<EmployeeDetail>;
}

export function isAccountingPayrollProvider(
  provider: IAccountingProvider,
): provider is IAccountingPayrollProvider {
  return (
    'supportsPayroll' in provider &&
    provider.supportsPayroll === true &&
    'listEmployees' in provider &&
    typeof (provider as Record<string, unknown>)['listEmployees'] ===
      'function' &&
    'getEmployee' in provider &&
    typeof (provider as Record<string, unknown>)['getEmployee'] === 'function'
  );
}

// ─── Manual Journals ──────────────────────────────────────────────────────────
// Integration capability used by external applications to create and manage
// manual journal entries. Communications validates structure and routes the
// fully-formed request to the selected provider.
// External apps own all business logic (account selection, amounts, taxes, etc.).

export interface IAccountingManualJournalsProvider extends IAccountingProvider {
  readonly supportsManualJournals: true;
  listManualJournals(
    context: AccountingProviderContext,
    params: ListManualJournalsParams,
  ): Promise<AccountingListResult<ManualJournalSummary>>;
  getManualJournal(
    context: AccountingProviderContext,
    manualJournalId: string,
  ): Promise<ManualJournalDetail>;
  createManualJournal(
    context: AccountingProviderContext,
    request: CreateManualJournalRequest,
  ): Promise<ManualJournalDetail>;
  updateManualJournal(
    context: AccountingProviderContext,
    manualJournalId: string,
    request: UpdateManualJournalRequest,
  ): Promise<ManualJournalDetail>;
}

export function isAccountingManualJournalsProvider(
  provider: IAccountingProvider,
): provider is IAccountingManualJournalsProvider {
  return (
    'supportsManualJournals' in provider &&
    (provider as Record<string, unknown>)['supportsManualJournals'] === true &&
    'listManualJournals' in provider &&
    typeof (provider as Record<string, unknown>)['listManualJournals'] ===
      'function' &&
    'createManualJournal' in provider &&
    typeof (provider as Record<string, unknown>)['createManualJournal'] ===
      'function'
  );
}

// ─── General Ledger / Journals ────────────────────────────────────────────────
// Read-only view of accounting journal entries from the provider's general ledger.
// Uses the provider's native Journals resource — NEVER used for CRUD operations.
// Entirely separate from IAccountingManualJournalsProvider.

export interface IAccountingGeneralLedgerProvider extends IAccountingProvider {
  readonly supportsGeneralLedger: true;
  listJournals(
    context: AccountingProviderContext,
    params: ListJournalsParams,
  ): Promise<AccountingListResult<JournalSummary>>;
  getJournal(
    context: AccountingProviderContext,
    journalId: string,
  ): Promise<JournalSummary>;
}

export function isAccountingGeneralLedgerProvider(
  provider: IAccountingProvider,
): provider is IAccountingGeneralLedgerProvider {
  return (
    'supportsGeneralLedger' in provider &&
    (provider as Record<string, unknown>)['supportsGeneralLedger'] === true &&
    'listJournals' in provider &&
    typeof (provider as Record<string, unknown>)['listJournals'] === 'function'
  );
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export interface IAccountingChartOfAccountsProvider extends IAccountingProvider {
  readonly supportsChartOfAccounts: true;
  listAccounts(
    context: AccountingProviderContext,
    params: ListAccountsParams,
  ): Promise<AccountingListResult<AccountSummary>>;
  getAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<AccountDetail>;
  createAccount(
    context: AccountingProviderContext,
    params: CreateAccountParams,
  ): Promise<AccountDetail>;
  updateAccount(
    context: AccountingProviderContext,
    accountId: string,
    params: UpdateAccountParams,
  ): Promise<AccountDetail>;
  archiveAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<ArchiveAccountResult>;
  deleteAccount(
    context: AccountingProviderContext,
    accountId: string,
  ): Promise<DeleteAccountResult>;
}

export function isAccountingChartOfAccountsProvider(
  provider: IAccountingProvider,
): provider is IAccountingChartOfAccountsProvider {
  return (
    'supportsChartOfAccounts' in provider &&
    provider.supportsChartOfAccounts === true &&
    'listAccounts' in provider &&
    typeof (provider as Record<string, unknown>)['listAccounts'] ===
      'function' &&
    'createAccount' in provider &&
    typeof (provider as Record<string, unknown>)['createAccount'] === 'function'
  );
}
