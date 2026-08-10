// src/accounting/providers/xero/xero-banking.types.ts
//
// Xero Accounting API response shapes for the Banking domain.
//
// Source: https://developer.xero.com/documentation/api/accounting/accounts
//         https://developer.xero.com/documentation/api/accounting/reports
//
// All types are internal to the Xero provider folder.
// Nothing here may be imported by services, controllers, or other providers.

// ─── Accounts API ─────────────────────────────────────────────────────────────

/**
 * Xero Account object from GET /api.xro/2.0/Accounts.
 * Subset of fields used by the Banking domain.
 */
export type XeroAccount = {
  AccountID: string;
  Code?: string;
  Name: string;
  /** 'BANK' for bank accounts. */
  Type: string;
  BankAccountNumber?: string;
  /** 'BANK' | 'CREDITCARD' | 'PAYPAL' */
  BankAccountType?: string;
  CurrencyCode?: string;
  /** 'ACTIVE' | 'ARCHIVED' */
  Status?: string;
  Description?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  Class?: string;
  SystemAccount?: string;
  HasAttachments?: boolean;
  TaxType?: string;
};

/** Xero API validation error element. */
export type XeroValidationError = {
  Message: string;
};

/** Xero API error response for account operations. */
export type XeroApiError = {
  Type?: string;
  Title?: string;
  Status?: number;
  Detail?: string;
  Elements?: Array<{
    AccountID?: string;
    ValidationErrors?: XeroValidationError[];
  }>;
};

export type XeroAccountsResponse = {
  Accounts?: XeroAccount[];
};

// ─── BankTransactions API ─────────────────────────────────────────────────────

export type XeroBankTransactionContact = {
  ContactID?: string;
  Name?: string;
  ContactStatus?: string;
};

export type XeroBankTransactionLineItem = {
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  AccountCode?: string;
  TaxType?: string;
  LineAmount?: number;
  TaxAmount?: number;
};

export type XeroBankTransactionBankAccount = {
  AccountID?: string;
  Code?: string;
  Name?: string;
};

/**
 * Xero BankTransaction object from GET /api.xro/2.0/BankTransactions.
 * Requires scope: accounting.banktransactions.read
 *
 * Type values: RECEIVE, SPEND, RECEIVE-OVERPAYMENT, SPEND-OVERPAYMENT,
 *              RECEIVE-PREPAYMENT, SPEND-PREPAYMENT, RECEIVE-TRANSFER, SPEND-TRANSFER
 * Status values: AUTHORISED, DELETED
 */
export type XeroBankTransaction = {
  BankTransactionID: string;
  Type: string;
  Contact?: XeroBankTransactionContact;
  LineItems?: XeroBankTransactionLineItem[];
  BankAccount?: XeroBankTransactionBankAccount;
  IsReconciled?: boolean;
  /** Xero date format: /Date(milliseconds+offset)/ */
  Date?: string;
  Reference?: string;
  CurrencyCode?: string;
  CurrencyRate?: number;
  URL?: string;
  Status?: string;
  LineAmountTypes?: string;
  SubTotal?: number;
  TotalTax?: number;
  Total?: number;
  /** Xero date format: /Date(milliseconds+offset)/ */
  UpdatedDateUTC?: string;
  HasAttachments?: boolean;
};

export type XeroBankTransactionsResponse = {
  BankTransactions?: XeroBankTransaction[];
};

// ─── BankSummary Report API ───────────────────────────────────────────────────

/**
 * A single cell in a Xero report row.
 * Attributes are present on data cells and contain entity IDs.
 */
export type XeroReportCell = {
  Value: string;
  Attributes?: Array<{
    Id: string;
    Value: string;
  }>;
};

/** A single row in a Xero report. */
export type XeroReportRow = {
  /** 'Header' | 'Row' | 'SummaryRow' | 'Section' */
  RowType: string;
  Cells?: XeroReportCell[];
  Rows?: XeroReportRow[];
};

/** Top-level Xero report response. */
export type XeroReportResponse = {
  Reports?: Array<{
    ReportID: string;
    ReportName: string;
    ReportDate?: string;
    Rows?: XeroReportRow[];
  }>;
};
