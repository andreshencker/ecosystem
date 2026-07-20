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
var PlatformAdminCustomersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminCustomersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
const business_intelligence_service_1 = require("../../integrations/business-intelligence/business-intelligence.service");
const bi_unavailable_error_1 = require("../../integrations/business-intelligence/errors/bi-unavailable.error");
const platform_admin_customer_query_dto_1 = require("./dto/platform-admin-customer-query.dto");
let PlatformAdminCustomersController = PlatformAdminCustomersController_1 = class PlatformAdminCustomersController {
    bi;
    logger = new common_1.Logger(PlatformAdminCustomersController_1.name);
    constructor(bi) {
        this.bi = bi;
    }
    assertPlatformAdmin(ctx) {
        if (ctx.role !== 'platform_admin') {
            throw new common_1.ForbiddenException('This endpoint is restricted to Platform Administrators.');
        }
    }
    mapBIError(err, context) {
        this.logger.error(`[PlatformAdmin] ${context} — BI error category=${err.category} status=${err.statusCode ?? 'none'}: ${err.message}`);
        switch (err.category) {
            case 'connection_refused':
            case 'timeout':
                return new common_1.ServiceUnavailableException('Customer analytics are temporarily unavailable. Please verify that the Business Intelligence service is running.');
            case 'auth_error':
                return new common_1.ServiceUnavailableException('Business Intelligence integration authentication failed. Please contact the platform administrator.');
            case 'not_found':
                return new common_1.ServiceUnavailableException('The Business Intelligence customer endpoint was not found. Please verify the BI service version.');
            case 'validation_error':
                return new common_1.HttpException('Invalid query parameters sent to Business Intelligence.', 400);
            case 'bi_internal_error':
                return new common_1.ServiceUnavailableException('The Business Intelligence service encountered an internal error. Please try again later.');
            default:
                return new common_1.ServiceUnavailableException('Customer analytics are temporarily unavailable. Please try again later.');
        }
    }
    async listCustomers(ctx, query) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin] GET /platform-admin/customers — user=${ctx.userId} ` +
            `filters: businessId=${query.businessId ?? '-'} search=${query.search ?? '-'} ` +
            `page=${query.page ?? 1} limit=${query.limit ?? 50}`);
        try {
            return await this.bi.listPlatformAdminCustomers({
                businessId: query.businessId,
                page: query.page ?? 1,
                limit: query.limit ?? 50,
                search: query.search,
                isActive: query.isActive,
                customerType: query.customerType,
                hasContacts: query.hasContacts,
                hasLocations: query.hasLocations,
                hasCommunicationConfiguration: query.hasCommunicationConfiguration,
                hasDataQualityIssues: query.hasDataQualityIssues,
            });
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, 'listCustomers');
            }
            throw err;
        }
    }
    async getCustomer(ctx, id, businessId) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin] GET /platform-admin/customers/${id} — user=${ctx.userId} businessId=${businessId ?? '-'}`);
        try {
            const detail = await this.bi.getPlatformAdminCustomerDetail(id, businessId);
            if (!detail) {
                throw new common_1.NotFoundException(`Customer '${id}' was not found.`);
            }
            return detail;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, `getCustomer(${id})`);
            }
            throw err;
        }
    }
};
exports.PlatformAdminCustomersController = PlatformAdminCustomersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'List all customers across tenants (Platform Admin only, proxied from BI)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, platform_admin_customer_query_dto_1.PlatformAdminCustomerQueryDto]),
    __metadata("design:returntype", Promise)
], PlatformAdminCustomersController.prototype, "listCustomers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get full customer analytical profile (Platform Admin only, proxied from BI)',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'BI customer ID (customerId from list response)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PlatformAdminCustomersController.prototype, "getCustomer", null);
exports.PlatformAdminCustomersController = PlatformAdminCustomersController = PlatformAdminCustomersController_1 = __decorate([
    (0, swagger_1.ApiTags)('Platform Admin — Customers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('platform-admin/customers'),
    __metadata("design:paramtypes", [business_intelligence_service_1.BusinessIntelligenceService])
], PlatformAdminCustomersController);
//# sourceMappingURL=platform-admin-customers.controller.js.map