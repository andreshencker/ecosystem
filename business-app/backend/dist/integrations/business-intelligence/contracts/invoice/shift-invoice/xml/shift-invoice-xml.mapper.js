"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapShiftInvoiceToXml = mapShiftInvoiceToXml;
function mapShiftInvoiceToXml(result) {
    const workedHours = result.workedHours.map((row) => ({
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
        company: {
            businessId: result.company.businessId,
            companyName: result.company.companyName,
            abn: result.company.abn,
            address: result.company.address,
            email: result.company.email,
            phone: result.company.phone,
        },
        customer: {
            customerId: result.customer.customerId,
            customerName: result.customer.customerName,
            email: result.customer.email,
            phone: result.customer.phone,
            address: result.customer.address,
        },
        invoice: {
            invoiceId: result.invoice.invoiceId,
            invoiceNumber: result.invoice.invoiceNumber,
            invoiceDate: result.invoice.invoiceDate,
            dueDate: result.invoice.dueDate,
            currency: result.invoice.currency,
            status: result.invoice.status,
            contractId: result.invoice.contractId,
            contractTitle: result.invoice.contractTitle,
        },
        workedHours,
        totals: {
            subtotal: result.totals.subtotal,
            taxRate: result.totals.taxRate,
            taxAmount: result.totals.taxAmount,
            total: result.totals.total,
            chargeGst: result.totals.chargeGst,
            currency: result.totals.currency,
        },
        paymentInformation: {
            bankName: result.paymentInformation.bankName,
            accountName: result.paymentInformation.accountName,
            bsb: result.paymentInformation.bsb,
            accountNumber: result.paymentInformation.accountNumber,
            paymentReference: result.paymentInformation.paymentReference,
            paymentTermsDays: result.paymentInformation.paymentTermsDays,
            paymentDueDate: result.paymentInformation.paymentDueDate,
        },
        notes: {
            invoiceNotes: result.notes.invoiceNotes,
            paymentNotes: result.notes.paymentNotes,
            terms: result.notes.terms,
        },
        metadata: {
            generatedAt: result.metadata.generatedAt,
            contractVersion: result.metadata.contractVersion,
            source: result.metadata.source,
        },
    };
}
//# sourceMappingURL=shift-invoice-xml.mapper.js.map