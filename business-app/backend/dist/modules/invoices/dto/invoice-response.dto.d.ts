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
    status: 'approved';
}
export declare function toApprovalResult(doc: any): InvoiceApprovalResult;
