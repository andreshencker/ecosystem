// CSV contract DTO for the Shift Invoice.
//
// Optimised for row-based export: no deeply nested objects.
// Company and customer context are represented as a flat metadata object
// (written once as a header block or comment row by the renderer).
// Each worked-hours shift becomes one data row via `dataPath: "lineItems"`.

// ─── Metadata context (header block or comment section) ──────────────────────

export interface ShiftInvoiceCsvMetadataDto {
  invoiceNumber:  string;
  invoiceDate:    string;
  dueDate:        string | null;
  status:         string;
  currency:       string;
  companyName:    string;
  abn:            string | null;
  customerName:   string;
  subtotal:       string;
  taxAmount:      string;
  total:          string;
}

// ─── Line item row (one per shift) ───────────────────────────────────────────

export interface ShiftInvoiceCsvLineItemDto {
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

export interface ShiftInvoiceCsvDto {
  /**
   * Context metadata.
   * Maps to CSV contract's `dataPath: "metadata"` (object section).
   * The renderer may emit this as a header comment block or ignore it.
   */
  metadata: ShiftInvoiceCsvMetadataDto;
  /**
   * Data rows.
   * Maps to CSV contract's `dataPath: "lineItems"`.
   * One row per shift; columns declared in the CSV format contract.
   */
  lineItems: ShiftInvoiceCsvLineItemDto[];
}
