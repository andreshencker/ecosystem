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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const business_intelligence_service_1 = require("../integrations/business-intelligence/business-intelligence.service");
const bi_unavailable_error_1 = require("../integrations/business-intelligence/errors/bi-unavailable.error");
const current_user_decorator_1 = require("../infrastructure/security/decorators/current-user.decorator");
let AnalyticsController = class AnalyticsController {
    bi;
    constructor(bi) {
        this.bi = bi;
    }
    resolveCompanyId(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No company assigned to this account');
        return ctx.companyId;
    }
    async getCustomerSummary(ctx, period) {
        const businessId = this.resolveCompanyId(ctx);
        const result = await this.bi.getCustomerSummary(businessId, period);
        if (!result) {
            throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
        }
        return result;
    }
    async getDashboardSummary(ctx, period) {
        const businessId = this.resolveCompanyId(ctx);
        const result = await this.bi.getDashboardSummary(businessId, period);
        if (!result) {
            throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
        }
        return result;
    }
    async getShiftAssignmentSummary(ctx) {
        const businessId = this.resolveCompanyId(ctx);
        try {
            return await this.bi.getShiftAssignmentSummary({ businessId });
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
            }
            throw err;
        }
    }
    async getPendingInvoiceGroups(ctx) {
        const businessId = this.resolveCompanyId(ctx);
        try {
            const result = await this.bi.getPendingInvoiceGroups(businessId);
            if (!result) {
                throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
            }
            return result;
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
            }
            throw err;
        }
    }
    async getShiftPendingList(ctx, rawPage, rawLimit, linkedCalendarId, dateFrom, dateTo, search) {
        const businessId = this.resolveCompanyId(ctx);
        const params = {
            businessId,
            page: rawPage ? Math.max(1, Number(rawPage)) : 1,
            limit: rawLimit ? Math.min(200, Math.max(1, Number(rawLimit))) : 50,
            linkedCalendarId: linkedCalendarId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: search || undefined,
        };
        try {
            return await this.bi.getPendingShiftAssignments(params);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw new common_1.ServiceUnavailableException('Business Intelligence service is unavailable');
            }
            throw err;
        }
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('customers/summary'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Customer analytics summary (proxied from BI service)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        required: false,
        description: 'YYYY-MM period filter',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getCustomerSummary", null);
__decorate([
    (0, common_1.Get)('dashboard/summary'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Dashboard analytics summary (proxied from BI service)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'period', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('shifts/assignment/summary'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Shift pending-assignment summary (proxied from BI service)',
        description: 'Returns aggregate counts for imported Shifts that require Contract assignment. ' +
            'All values come from BI — no pending rule is evaluated in NestJS.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getShiftAssignmentSummary", null);
__decorate([
    (0, common_1.Get)('shifts/assignment/pending'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Paginated list of imported Shifts pending Contract assignment (proxied from BI)',
        description: 'Returns BI-sourced imported Shifts that satisfy the pending-assignment rule. ' +
            'businessId is always resolved from the authenticated JWT — never from the request.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'linkedCalendarId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false, description: 'ISO date YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false, description: 'ISO date YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, common_1.Get)('invoices/pending-groups'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Pending invoice groups — real-time BI calculation (proxied from BI service)',
        description: 'Returns confirmed shifts with invoiceStatus=pending grouped by ' +
            'customer × contract × billing period. All amounts are computed by BI. ' +
            'businessId is resolved from the JWT — never from the request.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPendingInvoiceGroups", null);
__decorate([
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('linkedCalendarId')),
    __param(4, (0, common_1.Query)('dateFrom')),
    __param(5, (0, common_1.Query)('dateTo')),
    __param(6, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getShiftPendingList", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [business_intelligence_service_1.BusinessIntelligenceService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map