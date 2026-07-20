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
exports.BusinessController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const business_service_1 = require("./business.service");
const update_business_dto_1 = require("./dto/update-business.dto");
const update_business_smtp_dto_1 = require("./dto/update-business-smtp.dto");
const fiscal_profile_dto_1 = require("./dto/fiscal-profile.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
let BusinessController = class BusinessController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getOwnCompany(ctx) {
        return this.service.getOwnCompany(ctx);
    }
    async updateOwnCompany(ctx, dto) {
        return this.service.updateOwnCompany(ctx, dto);
    }
    async getFiscalProfile(ctx) {
        return this.service.getFiscalProfile(ctx);
    }
    async updateFiscalProfile(ctx, dto) {
        return this.service.updateFiscalProfile(ctx, dto);
    }
    async getSmtp(ctx) {
        return this.service.getSmtp(ctx);
    }
    async updateSmtp(ctx, dto) {
        return this.service.updateSmtp(ctx, dto);
    }
    async testSmtp(ctx) {
        return this.service.testSmtp(ctx);
    }
};
exports.BusinessController = BusinessController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get own company (resolves modules company for platform_admin)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getOwnCompany", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Update own company (platform_admin and business_owner only)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_business_dto_1.UpdateBusinessDto]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "updateOwnCompany", null);
__decorate([
    (0, common_1.Get)('fiscal-profile'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get company fiscal profile (ABN, deposit account, currency)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getFiscalProfile", null);
__decorate([
    (0, common_1.Patch)('fiscal-profile'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Update company fiscal profile (platform_admin and business_owner only)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, fiscal_profile_dto_1.UpdateFiscalProfileDto]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "updateFiscalProfile", null);
__decorate([
    (0, common_1.Get)('smtp'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get company SMTP settings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getSmtp", null);
__decorate([
    (0, common_1.Patch)('smtp'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update company SMTP settings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_business_smtp_dto_1.UpdateBusinessSmtpDto]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "updateSmtp", null);
__decorate([
    (0, common_1.Post)('smtp/test'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Test company SMTP connection' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "testSmtp", null);
exports.BusinessController = BusinessController = __decorate([
    (0, swagger_1.ApiTags)('Business (Portal)'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('company'),
    __metadata("design:paramtypes", [business_service_1.BusinessService])
], BusinessController);
//# sourceMappingURL=business.controller.js.map