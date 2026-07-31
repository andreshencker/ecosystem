"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapShiftInvoiceToCsv = mapShiftInvoiceToCsv;
function mapShiftInvoiceToCsv(result) {
    const lineItems = result.workedHours.map((row) => ({
        shiftId: row.shiftId,
        workDate: row.workDate,
        description: row.description,
        startTime: row.startTime,
        endTime: row.endTime,
        workedHours: row.workedHours,
        hourlyRate: row.hourlyRate,
        amount: row.amount,
    }));
    return {
        metadata: {
            invoiceNumber: result.invoice.invoiceNumber,
            invoiceDate: result.invoice.invoiceDate,
            dueDate: result.invoice.dueDate,
            status: result.invoice.status,
            currency: result.invoice.currency,
            companyName: result.company.companyName,
            abn: result.company.abn,
            customerName: result.customer.customerName,
            subtotal: result.totals.subtotal,
            taxAmount: result.totals.taxAmount,
            total: result.totals.total,
        },
        lineItems,
    };
}
//# sourceMappingURL=shift-invoice-csv.mapper.js.map