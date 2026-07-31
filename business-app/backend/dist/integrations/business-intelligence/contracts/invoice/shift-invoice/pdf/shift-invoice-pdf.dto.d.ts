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
export interface ShiftInvoicePdfSummaryDto {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    status: string;
    currency: string;
    contractTitle: string | null;
}
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
export interface ShiftInvoicePdfTotalsDto {
    subtotal: string;
    taxRate: string | null;
    taxAmount: string;
    total: string;
    chargeGst: boolean;
    currency: string;
}
export interface ShiftInvoicePdfDto {
    header: ShiftInvoicePdfHeaderDto;
    invoice: ShiftInvoicePdfSummaryDto;
    lineItems: ShiftInvoicePdfLineItemDto[];
    totals: ShiftInvoicePdfTotalsDto;
    paymentNotes: string[];
}
