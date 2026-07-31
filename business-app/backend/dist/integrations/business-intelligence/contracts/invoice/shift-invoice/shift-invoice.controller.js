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
exports.ShiftInvoiceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../../../../infrastructure/security/decorators/current-user.decorator");
const shift_invoice_service_1 = require("./shift-invoice.service");
const shift_invoice_types_1 = require("./shift-invoice.types");
let ShiftInvoiceController = class ShiftInvoiceController {
    service;
    constructor(service) {
        this.service = service;
    }
    async generate(format, invoiceId, ctx) {
        const businessId = this.resolveBusinessId(ctx);
        const resolvedFormat = this.resolveFormat(format);
        if (!invoiceId?.trim()) {
            throw new common_1.BadRequestException('invoiceId query parameter is required');
        }
        return this.service.generate(businessId, invoiceId.trim(), resolvedFormat);
    }
    resolveBusinessId(ctx) {
        if (!ctx.companyId) {
            throw new common_1.ForbiddenException('No company assigned to this account');
        }
        return ctx.companyId;
    }
    resolveFormat(raw) {
        const lower = raw?.toLowerCase();
        if (!shift_invoice_types_1.SHIFT_INVOICE_FORMATS.includes(lower)) {
            throw new common_1.BadRequestException(`Unsupported format "${raw}". Allowed: ${shift_invoice_types_1.SHIFT_INVOICE_FORMATS.join(', ')}`);
        }
        return lower;
    }
};
exports.ShiftInvoiceController = ShiftInvoiceController;
__decorate([
    (0, common_1.Get)(':format'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate the Shift Invoice contract for a specific output format' }),
    (0, swagger_1.ApiParam)({
        name: 'format',
        enum: shift_invoice_types_1.SHIFT_INVOICE_FORMATS,
        description: 'Target document format',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'invoiceId',
        required: true,
        description: 'MongoDB ObjectId of the invoice to generate',
    }),
    __param(0, (0, common_1.Param)('format')),
    __param(1, (0, common_1.Query)('invoiceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ShiftInvoiceController.prototype, "generate", null);
exports.ShiftInvoiceController = ShiftInvoiceController = __decorate([
    (0, swagger_1.ApiTags)('BI Contracts — Invoice'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('integrations/business-intelligence/contracts/invoice/shift-invoice'),
    __metadata("design:paramtypes", [shift_invoice_service_1.ShiftInvoiceService])
], ShiftInvoiceController);
//# sourceMappingURL=shift-invoice.controller.js.map