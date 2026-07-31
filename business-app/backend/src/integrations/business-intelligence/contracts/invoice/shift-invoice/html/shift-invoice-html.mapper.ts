// HTML mapper delegates to the PDF mapper — the data topology is identical.
// When the HTML contract evolves to require different structure, split here.

import type { ShiftInvoiceBiResult } from '../shift-invoice.types';
import type { ShiftInvoiceHtmlDto } from './shift-invoice-html.dto';
import { mapShiftInvoiceToPdf } from '../pdf/shift-invoice-pdf.mapper';

export function mapShiftInvoiceToHtml(result: ShiftInvoiceBiResult): ShiftInvoiceHtmlDto {
  return mapShiftInvoiceToPdf(result);
}
