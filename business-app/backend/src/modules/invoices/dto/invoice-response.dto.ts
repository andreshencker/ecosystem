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
    status:       doc.status ?? 'approved',
  };
}


export function toApprovedInvoiceListItem(doc: any): ApprovedInvoiceListItem {
  const approvedAt = new Date(doc.createdAt).toISOString();
  const effectiveStatus = doc.status ?? 'approved';
  return {
    ...toApprovalResult(doc),
    status: effectiveStatus,
    approvedAt,
    customerName: doc.customerName ?? null,
    invoiceDate: doc.invoiceDate ?? approvedAt.slice(0, 10),
    dueDate: doc.dueDate ?? null,
    amountPaid: doc.amountPaid ?? '0.00',
    balance: doc.balance ?? (effectiveStatus === 'paid' || effectiveStatus === 'voided' ? '0.00' : doc.total),
    sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
    lastReminderAt: doc.lastReminderAt ? new Date(doc.lastReminderAt).toISOString() : null,
    reminderCount: Number(doc.reminderCount ?? 0),
    paidAt: doc.paidAt ? new Date(doc.paidAt).toISOString() : null,
    paymentReference: doc.paymentReference ?? null,
    voidedAt: doc.voidedAt ? new Date(doc.voidedAt).toISOString() : null,
    voidReason: doc.voidReason ?? null,
  };
}
