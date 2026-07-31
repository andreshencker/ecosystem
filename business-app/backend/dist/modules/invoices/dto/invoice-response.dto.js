"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toApprovalResult = toApprovalResult;
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
        status: 'approved',
    };
}
//# sourceMappingURL=invoice-response.dto.js.map