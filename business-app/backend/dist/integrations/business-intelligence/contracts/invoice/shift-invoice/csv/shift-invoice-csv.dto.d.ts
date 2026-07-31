export interface ShiftInvoiceCsvMetadataDto {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    status: string;
    currency: string;
    companyName: string;
    abn: string | null;
    customerName: string;
    subtotal: string;
    taxAmount: string;
    total: string;
}
export interface ShiftInvoiceCsvLineItemDto {
    shiftId: string;
    workDate: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    workedHours: string;
    hourlyRate: string;
    amount: string;
}
export interface ShiftInvoiceCsvDto {
    metadata: ShiftInvoiceCsvMetadataDto;
    lineItems: ShiftInvoiceCsvLineItemDto[];
}
