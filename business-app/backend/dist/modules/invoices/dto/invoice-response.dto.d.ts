export interface InvoiceApprovalResult {
    invoiceId: string;
    invoiceNumber: string;
    groupId: string;
    customerId: string;
    contractId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    subtotal: string;
    taxAmount: string;
    total: string;
    shiftCount: number;
    status: 'approved' | 'outstanding' | 'sent' | 'send_failed' | 'paid' | 'voided';
}
export interface ApprovedInvoiceListItem extends InvoiceApprovalResult {
    approvedAt: string;
    customerName: string | null;
    invoiceDate: string;
    dueDate: string | null;
    amountPaid: string;
    balance: string;
    sentAt: string | null;
    lastReminderAt: string | null;
    reminderCount: number;
    paidAt: string | null;
    paymentReference: string | null;
    voidedAt: string | null;
    voidReason: string | null;
}
export interface ApprovedInvoiceListResult {
    items: ApprovedInvoiceListItem[];
    total: number;
}
export declare function toApprovalResult(doc: any): InvoiceApprovalResult;
export declare function toApprovedInvoiceListItem(doc: any): ApprovedInvoiceListItem;
