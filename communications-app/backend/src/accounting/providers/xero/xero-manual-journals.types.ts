// src/accounting/providers/xero/xero-manual-journals.types.ts
//
// Xero API response shapes for ManualJournals and Journals (General Ledger).
//
// Sources:
//   https://developer.xero.com/documentation/api/accounting/manualjournals
//   https://developer.xero.com/documentation/api/accounting/journals
//
// All types are internal to the Xero provider folder.
// Nothing here may be imported by services, controllers, or other providers.

// ─── Manual Journals API ──────────────────────────────────────────────────────

export type XeroManualJournalTrackingCategory = {
  TrackingCategoryID?: string;
  Name?: string;
  Option?: string;
};

export type XeroManualJournalLine = {
  JournalLineID?: string;
  AccountCode?: string;
  Description?: string;
  /** Positive = debit, negative = credit. */
  LineAmount?: number;
  TaxType?: string;
  TaxAmount?: number;
  LineAmountTypes?: string;
  Tracking?: XeroManualJournalTrackingCategory[];
};

/**
 * Xero ManualJournal object from GET/POST/PUT /api.xro/2.0/ManualJournals.
 * Requires scope: accounting.manualjournals (write) or accounting.manualjournals.read (read).
 *
 * Status values: DRAFT | POSTED | DELETED | VOIDED
 * LineAmountTypes: NoTax | Exclusive | Inclusive
 */
export type XeroManualJournal = {
  ManualJournalID?: string;
  Narration?: string;
  /** Xero date format: /Date(milliseconds+offset)/ */
  Date?: string;
  LineAmountTypes?: string;
  Status?: string;
  Url?: string;
  ShowOnCashBasisReports?: boolean;
  HasAttachments?: boolean;
  /** Xero date format: /Date(milliseconds+offset)/ */
  UpdatedDateUTC?: string;
  JournalLines?: XeroManualJournalLine[];
};

export type XeroManualJournalsResponse = {
  ManualJournals?: XeroManualJournal[];
};

// ─── General Ledger Journals API ──────────────────────────────────────────────

export type XeroJournalTrackingCategory = {
  Name?: string;
  Option?: string;
};

export type XeroJournalLine = {
  JournalLineID?: string;
  AccountID?: string;
  AccountCode?: string;
  AccountType?: string;
  AccountName?: string;
  Description?: string;
  NetAmount?: number;
  GrossAmount?: number;
  TaxAmount?: number;
  TaxType?: string;
  TaxName?: string;
  TrackingCategories?: XeroJournalTrackingCategory[];
};

/**
 * Xero Journal object from GET /api.xro/2.0/Journals (General Ledger).
 * Requires scope: accounting.journals.read.
 * READ-ONLY — this resource cannot be created, updated, or deleted via this endpoint.
 *
 * SourceType values (subset):
 *   ACCREC | ACCPAY | ACCRECCREDIT | ACCPAYCREDIT | ACCRECPAYMENT | ACCPAYPAYMENT |
 *   TRANSFER | RECEIPT | EXPPAYMENT | DEPRECIATION | MANUALADJUSTMENT |
 *   FOREIGNCURRENCYGAIN | FOREIGNCURRENCYLOSS | CASHDISCOUNT | RETAINEDEARNINGS
 */
export type XeroJournal = {
  JournalID?: string;
  /** Xero date format: /Date(milliseconds+offset)/ */
  JournalDate?: string;
  JournalNumber?: number;
  /** Xero date format: /Date(milliseconds+offset)/ */
  CreatedDateUTC?: string;
  Reference?: string;
  SourceID?: string;
  SourceType?: string;
  JournalLines?: XeroJournalLine[];
};

export type XeroJournalsResponse = {
  Journals?: XeroJournal[];
};
