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
var PlatformAdminContractsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminContractsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
const business_intelligence_service_1 = require("../../integrations/business-intelligence/business-intelligence.service");
const bi_unavailable_error_1 = require("../../integrations/business-intelligence/errors/bi-unavailable.error");
const platform_admin_contract_query_dto_1 = require("./dto/platform-admin-contract-query.dto");
let PlatformAdminContractsController = PlatformAdminContractsController_1 = class PlatformAdminContractsController {
    bi;
    logger = new common_1.Logger(PlatformAdminContractsController_1.name);
    constructor(bi) {
        this.bi = bi;
    }
    assertPlatformAdmin(ctx) {
        if (ctx.role !== 'platform_admin') {
            throw new common_1.ForbiddenException('This endpoint is restricted to Platform Administrators.');
        }
    }
    mapBIError(err, context) {
        this.logger.error(`[PlatformAdmin/Contracts] ${context} — BI error category=${err.category} status=${err.statusCode ?? 'none'}: ${err.message}`);
        switch (err.category) {
            case 'connection_refused':
            case 'timeout':
                return new common_1.ServiceUnavailableException('Contract analytics are temporarily unavailable. Please verify that the Business Intelligence service is running.');
            case 'auth_error':
                return new common_1.ServiceUnavailableException('Business Intelligence integration authentication failed. Please contact the platform administrator.');
            case 'not_found':
                return new common_1.ServiceUnavailableException('The Business Intelligence contracts endpoint was not found. Please verify the BI service version.');
            case 'validation_error':
                return new common_1.HttpException('Invalid query parameters sent to Business Intelligence.', 400);
            case 'bi_internal_error':
                return new common_1.ServiceUnavailableException('The Business Intelligence service encountered an internal error. Please try again later.');
            default:
                return new common_1.ServiceUnavailableException('Contract analytics are temporarily unavailable. Please try again later.');
        }
    }
    async getSummary(ctx, query) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin/Contracts] GET summary — user=${ctx.userId} ` +
            `businessId=${query.businessId ?? '-'} status=${query.status ?? '-'}`);
        try {
            return await this.bi.getContractAdminSummary({
                businessId: query.businessId,
                status: query.status,
                createdFrom: query.createdFrom,
                createdTo: query.createdTo,
            });
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, 'getSummary');
            }
            throw err;
        }
    }
    async listContracts(ctx, query) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin/Contracts] GET list — user=${ctx.userId} ` +
            `businessId=${query.businessId ?? '-'} search=${query.search ?? '-'} ` +
            `status=${query.status ?? '-'} configStatus=${query.configurationStatus ?? '-'} ` +
            `page=${query.page ?? 1} limit=${query.limit ?? 50}`);
        try {
            return await this.bi.listPlatformAdminContracts({
                businessId: query.businessId,
                customerId: query.customerId,
                page: query.page ?? 1,
                limit: query.limit ?? 50,
                search: query.search,
                status: query.status,
                workType: query.workType,
                billingCycle: query.billingCycle,
                currency: query.currency,
                configurationStatus: query.configurationStatus,
                chargeGst: query.chargeGst,
                superEnabled: query.superEnabled,
                holidayRulesEnabled: query.holidayRulesEnabled,
                paymentCalendarEnabled: query.paymentCalendarEnabled,
                updatedFrom: query.updatedFrom,
                updatedTo: query.updatedTo,
                sortBy: query.sortBy,
                sortDir: query.sortDir,
            });
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, 'listContracts');
            }
            throw err;
        }
    }
    async getContract(ctx, id, businessId) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin/Contracts] GET detail — user=${ctx.userId} contractId=${id} businessId=${businessId ?? '-'}`);
        try {
            const detail = await this.bi.getPlatformAdminContractDetail(id, businessId);
            if (!detail) {
                throw new common_1.NotFoundException(`Contract '${id}' was not found.`);
            }
            return detail;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, `getContract(${id})`);
            }
            throw err;
        }
    }
    async getContractIssues(ctx, id, businessId) {
        this.assertPlatformAdmin(ctx);
        this.logger.log(`[PlatformAdmin/Contracts] GET issues — user=${ctx.userId} contractId=${id}`);
        try {
            const result = await this.bi.getPlatformAdminContractSupportIssues(id, businessId);
            if (!result) {
                throw new common_1.NotFoundException(`Contract '${id}' was not found.`);
            }
            return result;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                throw this.mapBIError(err, `getContractIssues(${id})`);
            }
            throw err;
        }
    }
};
exports.PlatformAdminContractsController = PlatformAdminContractsController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Contract admin summary — measures and KPIs (Platform Admin only, proxied from BI)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, platform_admin_contract_query_dto_1.PlatformAdminContractSummaryQueryDto]),
    __metadata("design:returntype", Promise)
], PlatformAdminContractsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'List all contracts across tenants (Platform Admin only, proxied from BI)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, platform_admin_contract_query_dto_1.PlatformAdminContractQueryDto]),
    __metadata("design:returntype", Promise)
], PlatformAdminContractsController.prototype, "listContracts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get full contract admin detail (Platform Admin only, proxied from BI)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Contract source_id (MongoDB ObjectId)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PlatformAdminContractsController.prototype, "getContract", null);
__decorate([
    (0, common_1.Get)(':id/issues'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get support issues for a single contract (Platform Admin only, proxied from BI)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Contract source_id (MongoDB ObjectId)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PlatformAdminContractsController.prototype, "getContractIssues", null);
exports.PlatformAdminContractsController = PlatformAdminContractsController = PlatformAdminContractsController_1 = __decorate([
    (0, swagger_1.ApiTags)('Platform Admin — Contracts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('platform-admin/contracts'),
    __metadata("design:paramtypes", [business_intelligence_service_1.BusinessIntelligenceService])
], PlatformAdminContractsController);
//# sourceMappingURL=platform-admin-contracts.controller.js.map