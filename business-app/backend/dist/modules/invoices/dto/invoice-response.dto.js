"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toApprovalResult = toApprovalResult;
exports.toApprovedInvoiceListItem = toApprovedInvoiceListItem;
function toApprovalResult(doc) {
    return {
        invoiceId: String(doc._id),
        invoiceNumber: doc.invoiceNumber,
        groupId: doc.groupId,
        customerId: doc.customerId,
        contractId: doc.contractId,
        periodStart: doc.periodStart,
        periodEnd: doc.periodEnd,
        currency: doc.currency,
        subtotal: doc.subtotal,
        taxAmount: doc.taxAmount,
        total: doc.total,
        shiftCount: (doc.shiftIds ?? []).length,
        status: doc.status ?? 'approved',
    };
}
function toApprovedInvoiceListItem(doc) {
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
//# sourceMappingURL=invoice-response.dto.js.map