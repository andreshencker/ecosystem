export type { ShiftInvoicePdfCompanyDto as ShiftInvoiceHtmlCompanyDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfCustomerDto as ShiftInvoiceHtmlCustomerDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfHeaderDto as ShiftInvoiceHtmlHeaderDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfSummaryDto as ShiftInvoiceHtmlSummaryDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfLineItemDto as ShiftInvoiceHtmlLineItemDto } from '../pdf/shift-invoice-pdf.dto';
export type { ShiftInvoicePdfTotalsDto as ShiftInvoiceHtmlTotalsDto } from '../pdf/shift-invoice-pdf.dto';
import type { ShiftInvoicePdfHeaderDto, ShiftInvoicePdfSummaryDto, ShiftInvoicePdfLineItemDto, ShiftInvoicePdfTotalsDto } from '../pdf/shift-invoice-pdf.dto';
export interface ShiftInvoiceHtmlDto {
    header: ShiftInvoicePdfHeaderDto;
    invoice: ShiftInvoicePdfSummaryDto;
    lineItems: ShiftInvoicePdfLineItemDto[];
    totals: ShiftInvoicePdfTotalsDto;
    paymentNotes: string[];
}
