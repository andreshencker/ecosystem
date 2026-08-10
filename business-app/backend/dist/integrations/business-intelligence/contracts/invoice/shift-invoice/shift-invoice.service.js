"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const business_intelligence_service_1 = require("../../../business-intelligence.service");
const shift_invoice_pdf_mapper_1 = require("./pdf/shift-invoice-pdf.mapper");
let ShiftInvoiceService = class ShiftInvoiceService {
    bi;
    constructor(bi) {
        this.bi = bi;
    }
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
        return this.bi.getShiftInvoiceDocument(businessId, invoiceId);
    }
};
exports.ShiftInvoiceService = ShiftInvoiceService;
exports.ShiftInvoiceService = ShiftInvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [business_intelligence_service_1.BusinessIntelligenceService])
], ShiftInvoiceService);
//# sourceMappingURL=shift-invoice.service.js.map