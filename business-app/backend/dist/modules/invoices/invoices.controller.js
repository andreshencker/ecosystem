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
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const invoices_service_1 = require("./invoices.service");
const approve_invoice_dto_1 = require("./dto/approve-invoice.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    resolveContext(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No business assigned');
        return ctx.companyId;
    }
    async approve(ctx, dto) {
        const businessId = this.resolveContext(ctx);
        return this.invoicesService.approve(businessId, dto);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, common_1.Post)('approve'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({
        summary: 'Approve a pending invoice group',
        description: 'Re-fetches the BI calculation, validates the group is approvable, ' +
            'persists the Invoice, marks the covered Shifts as invoiced, and ' +
            'returns the invoice number. Idempotent: returns 409 if already approved.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, approve_invoice_dto_1.ApproveInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "approve", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, swagger_1.ApiTags)('Invoices'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('invoices'),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
//# sourceMappingURL=invoices.controller.js.map