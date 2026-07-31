export interface ShiftInvoiceXlsxSummaryDto {
    companyName: string;
    abn: string | null;
    companyEmail: string | null;
    companyPhone: string | null;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    status: string;
    currency: string;
    contractTitle: string | null;
    subtotal: string;
    taxAmount: string;
    total: string;
    chargeGst: boolean;
}
export interface ShiftInvoiceXlsxLineItemDto {
    shiftId: string;
    workDate: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    workedHours: string;
    hourlyRate: string;
    amount: string;
}
export interface ShiftInvoiceXlsxDto {
    summary: ShiftInvoiceXlsxSummaryDto;
    lineItems: ShiftInvoiceXlsxLineItemDto[];
}
