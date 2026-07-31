// Shared types for the Shift Invoice BI contract.
//
// ShiftInvoiceBiResult is the generic payload BI returns for a shift invoice.
// Every format mapper receives this type and reshapes it — no calculations,
// no formatting, only structural adaptation.

// ─── Format registry ──────────────────────────────────────────────────────────

export const SHIFT_INVOICE_FORMATS = ['pdf', 'xlsx', 'csv', 'html', 'json', 'xml'] as const;
export type ShiftInvoiceFormat = (typeof SHIFT_INVOICE_FORMATS)[number];

// ─── Generic BI sub-types ─────────────────────────────────────────────────────

export interface ShiftInvoiceCompany {
  businessId: string;
  companyName: string;
  /** Australian Business Number. */
  abn: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}

export interface ShiftInvoiceCustomer {
  customerId: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ShiftInvoiceMeta {
  invoiceId: string;
  invoiceNumber: string;
  /** ISO-8601 date string. */
  invoiceDate: string;
  /** ISO-8601 date string. null when not set. */
  dueDate: string | null;
  currency: string;
  status: string;
  contractId: string | null;
  contractTitle: string | null;
}

/**
 * One worked-hours row as returned by BI.
 *
 * Neither breakTaken nor breakMinutes appear here.
 * BI reads the Shift's breakTaken flag and the Contract's break conditions,
 * applies the deduction internally, and delivers the net workedHours value.
 * Invoice format DTOs only receive the calculated workedHours.
 */
export interface ShiftInvoiceWorkedHoursRow {
  shiftId: string;
  /** ISO-8601 date string (work date). */
  workDate: string;
  description: string | null;
  /** ISO-8601 time string (HH:MM). null for all-day shifts. */
  startTime: string | null;
  endTime: string | null;
  /** Decimal string — BI-calculated net worked hours. */
  workedHours: string;
  /** Decimal string — hourly rate from the contract. */
  hourlyRate: string;
  /** Decimal string — BI-calculated line amount. */
  amount: string;
}

export interface ShiftInvoiceTotals {
  /** Decimal string — sum of line amounts. */
  subtotal: string;
  /** Decimal string or null when GST is not charged. */
  taxRate: string | null;
  /** Decimal string — tax component. */
  taxAmount: string;
  /** Decimal string — subtotal + taxAmount. */
  total: string;
  chargeGst: boolean;
  currency: string;
}

export interface ShiftInvoicePaymentInformation {
  bankName: string | null;
  accountName: string | null;
  bsb: string | null;
  accountNumber: string | null;
  paymentReference: string | null;
  /** Number of days from invoice date. */
  paymentTermsDays: number | null;
  /** ISO-8601 date string. */
  paymentDueDate: string | null;
}

export interface ShiftInvoiceNotes {
  invoiceNotes: string | null;
  paymentNotes: string | null;
  terms: string | null;
}

export interface ShiftInvoiceGenerationMetadata {
  generatedAt: string;
  contractVersion: string | null;
  /** Source identifier, e.g. "bi-contract-v1". */
  source: string;
}

// ─── Generic BI result ────────────────────────────────────────────────────────

/**
 * Complete payload returned by the BI service for a shift invoice.
 * This is the single input type for every format mapper.
 */
export interface ShiftInvoiceBiResult {
  company: ShiftInvoiceCompany;
  customer: ShiftInvoiceCustomer;
  invoice: ShiftInvoiceMeta;
  workedHours: ShiftInvoiceWorkedHoursRow[];
  totals: ShiftInvoiceTotals;
  paymentInformation: ShiftInvoicePaymentInformation;
  notes: ShiftInvoiceNotes;
  metadata: ShiftInvoiceGenerationMetadata;
}
