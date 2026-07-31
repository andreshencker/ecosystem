"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapShiftInvoiceToJson = mapShiftInvoiceToJson;
function mapShiftInvoiceToJson(result) {
    return {
        company: result.company,
        customer: result.customer,
        invoice: result.invoice,
        workedHours: result.workedHours,
        totals: result.totals,
        paymentInformation: result.paymentInformation,
        notes: result.notes,
        metadata: result.metadata,
    };
}
//# sourceMappingURL=shift-invoice-json.mapper.js.map