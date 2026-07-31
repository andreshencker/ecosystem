// HTML contract DTO for the Shift Invoice.
//
// Structurally identical to the PDF DTO — both are rendering formats that
// consume grouped sections and nested objects.  The HTML renderer may apply
// different styling but consumes the same data topology.
//
// Re-uses the PDF sub-types so they stay in sync without duplication.

export type { ShiftInvoicePdfCompanyDto as ShiftInvoiceHtmlCompanyDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfCustomerDto as ShiftInvoiceHtmlCustomerDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfHeaderDto as ShiftInvoiceHtmlHeaderDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfSummaryDto as ShiftInvoiceHtmlSummaryDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfLineItemDto as ShiftInvoiceHtmlLineItemDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfTotalsDto as ShiftInvoiceHtmlTotalsDto } from '../pdf/shift-invoice-pdf.dto';

import type {
  ShiftInvoicePdfHeaderDto,
  ShiftInvoicePdfSummaryDto,
  ShiftInvoicePdfLineItemDto,
  ShiftInvoicePdfTotalsDto,
} from '../pdf/shift-invoice-pdf.dto';

/**
 * HTML format contract data.
 * Same shape as PDF — sections map to the same dataPath conventions.
 * The HTML contract in the Document Catalogue references the same field paths.
 */
export interface ShiftInvoiceHtmlDto {
  header:       ShiftInvoicePdfHeaderDto;
  invoice:      ShiftInvoicePdfSummaryDto;
  lineItems:    ShiftInvoicePdfLineItemDto[];
  totals:       ShiftInvoicePdfTotalsDto;
  paymentNotes: string[];
}
