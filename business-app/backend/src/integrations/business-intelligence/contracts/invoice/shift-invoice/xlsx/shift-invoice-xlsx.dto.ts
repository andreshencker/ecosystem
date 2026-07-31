// XLSX contract DTO for the Shift Invoice.
//
// Optimised for worksheets — nested objects are flattened where a workbook
// consumer expects tabular structures.  Each interface maps to one worksheet
// (identified by the key declared in the XLSX format contract).
//
// Worksheet layout (matches the Document Catalogue XLSX contract):
//   "summary"   — Invoice header (one row of key-value pairs)
//   "lineItems" — One row per worked-hours shift

// ─── Summary worksheet (key: "summary") ──────────────────────────────────────
// All company, customer and invoice metadata in a single flat object.
// The XLSX renderer writes each key-value pair into a header block.

export interface ShiftInvoiceXlsxSummaryDto {
  // Company
  companyName:  string;
  abn:          string | null;
  companyEmail: string | null;
  companyPhone: string | null;

  // Customer
  customerName:  string;
  customerEmail: string | null;
  customerPhone: string | null;

  // Invoice
  invoiceNumber: string;
  invoiceDate:   string;
  dueDate:       string | null;
  status:        string;
  currency:      string;
  contractTitle: string | null;

  // Totals (informational; tabular totals appear in lineItems worksheet)
  subtotal:  string;
  taxAmount: string;
  total:     string;
  chargeGst: boolean;
}

// ─── Line items worksheet (key: "lineItems") ─────────────────────────────────
// One row per shift. Columns are flat — no nesting.

export interface ShiftInvoiceXlsxLineItemDto {
  shiftId:     string;
  workDate:    string;
  description: string | null;
  startTime:   string | null;
  endTime:     string | null;
  workedHours: string;
  hourlyRate:  string;
  amount:      string;
}

// ─── Root DTO ─────────────────────────────────────────────────────────────────

export interface ShiftInvoiceXlsxDto {
  /** Maps to worksheet key "summary". */
  summary: ShiftInvoiceXlsxSummaryDto;
  /** Maps to worksheet key "lineItems". */
  lineItems: ShiftInvoiceXlsxLineItemDto[];
}
