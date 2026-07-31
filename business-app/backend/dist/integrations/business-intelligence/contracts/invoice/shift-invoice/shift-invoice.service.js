"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const shift_invoice_pdf_mapper_1 = require("./pdf/shift-invoice-pdf.mapper");
let ShiftInvoiceService = class ShiftInvoiceService {
    async generate(businessId, invoiceId, format) {
        const biResult = await this.fetchBiResult(businessId, invoiceId);
        return this.dispatch(format, biResult);
    }
    dispatch(format, result) {
        switch (format) {
            case 'pdf':
                return (0, shift_invoice_pdf_mapper_1.mapShiftInvoiceToPdf)(result);
            case 'xlsx':
                throw new common_1.NotImplementedException('XLSX format contract is not yet implemented');
            case 'csv':
                throw new common_1.NotImplementedException('CSV format contract is not yet implemented');
            case 'html':
                throw new common_1.NotImplementedException('HTML format contract is not yet implemented');
            case 'json':
                throw new common_1.NotImplementedException('JSON format contract is not yet implemented');
            case 'xml':
                throw new common_1.NotImplementedException('XML format contract is not yet implemented');
        }
    }
    async fetchBiResult(businessId, invoiceId) {
        return buildPlaceholderBiResult(businessId, invoiceId);
    }
};
exports.ShiftInvoiceService = ShiftInvoiceService;
exports.ShiftInvoiceService = ShiftInvoiceService = __decorate([
    (0, common_1.Injectable)()
], ShiftInvoiceService);
function buildPlaceholderBiResult(businessId, invoiceId) {
    return {
        company: {
            businessId,
            companyName: '',
            abn: null,
            address: null,
            email: null,
            phone: null,
        },
        customer: {
            customerId: '',
            customerName: '',
            email: null,
            phone: null,
            address: null,
        },
        invoice: {
            invoiceId,
            invoiceNumber: '',
            invoiceDate: new Date().toISOString().slice(0, 10),
            dueDate: null,
            currency: 'AUD',
            status: 'draft',
            contractId: null,
            contractTitle: null,
        },
        workedHours: [],
        totals: {
            subtotal: '0',
            taxRate: null,
            taxAmount: '0',
            total: '0',
            chargeGst: false,
            currency: 'AUD',
        },
        paymentInformation: {
            bankName: null,
            accountName: null,
            bsb: null,
            accountNumber: null,
            paymentReference: null,
            paymentTermsDays: null,
            paymentDueDate: null,
        },
        notes: {
            invoiceNotes: null,
            paymentNotes: null,
            terms: null,
        },
        metadata: {
            generatedAt: new Date().toISOString(),
            contractVersion: null,
            source: 'placeholder',
        },
    };
}
//# sourceMappingURL=shift-invoice.service.js.map