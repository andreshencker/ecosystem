"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftInvoiceModule = void 0;
const common_1 = require("@nestjs/common");
const shift_invoice_controller_1 = require("./shift-invoice.controller");
const shift_invoice_service_1 = require("./shift-invoice.service");
const business_intelligence_module_1 = require("../../../business-intelligence.module");
let ShiftInvoiceModule = class ShiftInvoiceModule {
};
exports.ShiftInvoiceModule = ShiftInvoiceModule;
exports.ShiftInvoiceModule = ShiftInvoiceModule = __decorate([
    (0, common_1.Module)({
        imports: [business_intelligence_module_1.BusinessIntelligenceModule],
        controllers: [shift_invoice_controller_1.ShiftInvoiceController],
        providers: [shift_invoice_service_1.ShiftInvoiceService],
        exports: [shift_invoice_service_1.ShiftInvoiceService],
    })
], ShiftInvoiceModule);
//# sourceMappingURL=shift-invoice.module.js.map