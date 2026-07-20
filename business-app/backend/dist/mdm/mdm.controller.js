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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MdmController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mdm_service_1 = require("./mdm.service");
let MdmController = class MdmController {
    mdm;
    constructor(mdm) {
        this.mdm = mdm;
    }
    getCurrencies() {
        return { items: this.mdm.getCurrencies() };
    }
    getTaxRates(jurisdiction) {
        return { items: this.mdm.getTaxRates(jurisdiction) };
    }
    getInvoiceStatuses() {
        return { items: this.mdm.getInvoiceStatuses() };
    }
    getPaymentMethods() {
        return { items: this.mdm.getPaymentMethods() };
    }
    getBillingCycles() {
        return { items: this.mdm.getBillingCycles() };
    }
};
exports.MdmController = MdmController;
__decorate([
    (0, common_1.Get)('currencies'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List supported currency codes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MdmController.prototype, "getCurrencies", null);
__decorate([
    (0, common_1.Get)('tax-rates'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'List tax rates, optionally filtered by jurisdiction (e.g. AU)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'jurisdiction', required: false }),
    __param(0, (0, common_1.Query)('jurisdiction')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MdmController.prototype, "getTaxRates", null);
__decorate([
    (0, common_1.Get)('invoice-statuses'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List valid Invoice status codes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MdmController.prototype, "getInvoiceStatuses", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List supported payment methods' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MdmController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Get)('billing-cycles'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List supported billing cycle types' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MdmController.prototype, "getBillingCycles", null);
exports.MdmController = MdmController = __decorate([
    (0, swagger_1.ApiTags)('MDM'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('mdm'),
    __metadata("design:paramtypes", [mdm_service_1.MdmService])
], MdmController);
//# sourceMappingURL=mdm.controller.js.map