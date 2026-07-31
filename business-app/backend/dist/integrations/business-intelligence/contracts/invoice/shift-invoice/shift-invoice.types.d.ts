export declare const SHIFT_INVOICE_FORMATS: readonly ["pdf", "xlsx", "csv", "html", "json", "xml"];
export type ShiftInvoiceFormat = (typeof SHIFT_INVOICE_FORMATS)[number];
export interface ShiftInvoiceCompany {
    businessId: string;
    companyName: string;
    abn: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
}
export interface ShiftInvoiceCustomer {
    customerId: string;
    customerName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
}
export interface ShiftInvoiceMeta {
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    currency: string;
    status: string;
    contractId: string | null;
    contractTitle: string | null;
}
export interface ShiftInvoiceWorkedHoursRow {
    shiftId: string;
    workDate: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    workedHours: string;
    hourlyRate: string;
    amount: string;
}
export interface ShiftInvoiceTotals {
    subtotal: string;
    taxRate: string | null;
    taxAmount: string;
    total: string;
    chargeGst: boolean;
    currency: string;
}
export interface ShiftInvoicePaymentInformation {
    bankName: string | null;
    accountName: string | null;
    bsb: string | null;
    accountNumber: string | null;
    paymentReference: string | null;
    paymentTermsDays: number | null;
    paymentDueDate: string | null;
}
export interface ShiftInvoiceNotes {
    invoiceNotes: string | null;
    paymentNotes: string | null;
    terms: string | null;
}
export interface ShiftInvoiceGenerationMetadata {
    generatedAt: string;
    contractVersion: string | null;
    source: string;
}
export interface ShiftInvoiceBiResult {
    company: ShiftInvoiceCompany;
    customer: ShiftInvoiceCustomer;
    invoice: ShiftInvoiceMeta;
    workedHours: ShiftInvoiceWorkedHoursRow[];
    totals: ShiftInvoiceTotals;
    paymentInformation: ShiftInvoicePaymentInformation;
    notes: ShiftInvoiceNotes;
    metadata: ShiftInvoiceGenerationMetadata;
}
