import type { ShiftInvoiceCompany, ShiftInvoiceCustomer, ShiftInvoiceMeta, ShiftInvoiceWorkedHoursRow, ShiftInvoiceTotals, ShiftInvoicePaymentInformation, ShiftInvoiceNotes, ShiftInvoiceGenerationMetadata } from '../shift-invoice.types';
export interface ShiftInvoiceJsonDto {
    company: ShiftInvoiceCompany;
    customer: ShiftInvoiceCustomer;
    invoice: ShiftInvoiceMeta;
    workedHours: ShiftInvoiceWorkedHoursRow[];
    totals: ShiftInvoiceTotals;
    paymentInformation: ShiftInvoicePaymentInformation;
    notes: ShiftInvoiceNotes;
    metadata: ShiftInvoiceGenerationMetadata;
}
