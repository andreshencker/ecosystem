// JSON mapper: ShiftInvoiceBiResult → ShiftInvoiceJsonDto
//
// The JSON contract preserves the full BI result hierarchy.
// This mapper is a structural pass-through — the types are identical.

import type { ShiftInvoiceBiResult } from '../shift-invoice.types';
import type { ShiftInvoiceJsonDto } from './shift-invoice-json.dto';

export function mapShiftInvoiceToJson(result: ShiftInvoiceBiResult): ShiftInvoiceJsonDto {
  return {
    company:            result.company,
    customer:           result.customer,
    invoice:            result.invoice,
    workedHours:        result.workedHours,
    totals:             result.totals,
    paymentInformation: result.paymentInformation,
    notes:              result.notes,
    metadata:           result.metadata,
  };
}
