// JSON contract DTO for the Shift Invoice.
//
// Preserves the complete business hierarchy — no flattening, no omissions.
// Consumers that receive the JSON format get every field from BI, including
// payment information and notes as first-class objects.

import type {
  ShiftInvoiceCompany,
  ShiftInvoiceCustomer,
  ShiftInvoiceMeta,
  ShiftInvoiceWorkedHoursRow,
  ShiftInvoiceTotals,
  ShiftInvoicePaymentInformation,
  ShiftInvoiceNotes,
  ShiftInvoiceGenerationMetadata,
} from '../shift-invoice.types';

/**
 * Full-fidelity JSON representation of a Shift Invoice.
 *
 * Re-uses the canonical generic sub-types so the JSON format is always
 * structurally consistent with the BI result and never diverges silently.
 */
export interface ShiftInvoiceJsonDto {
  company:            ShiftInvoiceCompany;
  customer:           ShiftInvoiceCustomer;
  invoice:            ShiftInvoiceMeta;
  workedHours:        ShiftInvoiceWorkedHoursRow[];
  totals:             ShiftInvoiceTotals;
  paymentInformation: ShiftInvoicePaymentInformation;
  notes:              ShiftInvoiceNotes;
  metadata:           ShiftInvoiceGenerationMetadata;
}
