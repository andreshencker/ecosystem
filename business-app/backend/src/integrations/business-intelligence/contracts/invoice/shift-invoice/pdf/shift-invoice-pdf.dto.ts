// PDF contract data transfer object for the Shift Invoice.
//
// Field names map directly to the dataPath values declared in the PDF format
// contract stored in the Document Catalogue
// (canonicalKey: invoice.shift-invoice.pdf).
//
// Optimised for rendering:
//   · nested objects are acceptable — the PDF renderer handles sections
//   · paymentNotes is a string[] so the notes section renders each item as a bullet
//   · neither breakTaken nor breakMinutes appear here — BI delivers pre-net workedHours

// ─── Header section (type: html, dataPath: "header") ─────────────────────────

export interface ShiftInvoicePdfCompanyDto {
  businessId: string;
  companyName: string;
  abn: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}

export interface ShiftInvoicePdfCustomerDto {
  customerId: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ShiftInvoicePdfHeaderDto {
  company: ShiftInvoicePdfCompanyDto;
  customer: ShiftInvoicePdfCustomerDto;
}

// ─── Summary section (type: summary, dataPath: "invoice") ────────────────────

export interface ShiftInvoicePdfSummaryDto {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  currency: string;
  contractTitle: string | null;
}

// ─── Table section (type: table, dataPath: "lineItems") ──────────────────────

export interface ShiftInvoicePdfLineItemDto {
  shiftId: string;
  workDate: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  workedHours: string;
  hourlyRate: string;
  amount: string;
}

// ─── Totals section (type: totals, dataPath: "totals") ───────────────────────

export interface ShiftInvoicePdfTotalsDto {
  subtotal: string;
  taxRate: string | null;
  taxAmount: string;
  total: string;
  chargeGst: boolean;
  currency: string;
}

// ─── Notes section (type: notes, dataPath: "paymentNotes") ───────────────────

// ─── Root DTO ─────────────────────────────────────────────────────────────────

export interface ShiftInvoicePdfDto {
  /** Maps to PDF section dataPath "header". */
  header: ShiftInvoicePdfHeaderDto;
  /** Maps to PDF section dataPath "invoice". */
  invoice: ShiftInvoicePdfSummaryDto;
  /** Maps to PDF section dataPath "lineItems". */
  lineItems: ShiftInvoicePdfLineItemDto[];
  /** Maps to PDF section dataPath "totals". */
  totals: ShiftInvoicePdfTotalsDto;
  /**
   * Maps to PDF section dataPath "paymentNotes".
   * Each string becomes one bullet in the notes section renderer.
   */
  paymentNotes: string[];
}
