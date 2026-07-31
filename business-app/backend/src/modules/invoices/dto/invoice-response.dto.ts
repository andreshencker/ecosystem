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

export function toApprovalResult(doc: any): InvoiceApprovalResult {
  return {
    invoiceId:    String(doc._id),
    invoiceNumber: doc.invoiceNumber,
    groupId:      doc.groupId,
    customerId:   doc.customerId,
    contractId:   doc.contractId,
    periodStart:  doc.periodStart,
    periodEnd:    doc.periodEnd,
    currency:     doc.currency,
    subtotal:     doc.subtotal,
    taxAmount:    doc.taxAmount,
    total:        doc.total,
    shiftCount:   (doc.shiftIds ?? []).length,
    status:       'approved',
  };
}
