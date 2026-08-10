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
exports.CommunicationConnectionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const communication_connection_service_1 = require("./communication-connection.service");
const communication_catalog_provisioning_service_1 = require("../provisioning/communication-catalog-provisioning.service");
const communication_connection_dto_1 = require("./dto/communication-connection.dto");
const current_user_decorator_1 = require("../../../infrastructure/security/decorators/current-user.decorator");
const PROVIDER = 'communications';
let CommunicationConnectionController = class CommunicationConnectionController {
    service;
    provisioning;
    constructor(service, provisioning) {
        this.service = service;
        this.provisioning = provisioning;
    }
    async get(ctx) {
        const result = await this.service.get(this.uid(ctx), PROVIDER);
        if (!result)
            throw new common_1.NotFoundException('No Communications connection configured.');
        return result;
    }
    async save(ctx, dto) {
        const userId = this.uid(ctx);
        const result = await this.service.save(userId, PROVIDER, dto.token, dto.isActive);
        if (result.isActive && result.remoteCompanyId) {
            const businessId = await this.service.resolveBusinessIdForUser(userId);
            await this.provisioning.provisionBusinessResources(businessId);
        }
        return result;
    }
    async test(ctx, dto) {
        return this.service.test(this.uid(ctx), PROVIDER, dto.token);
    }
    async toggle(ctx, dto) {
        return this.service.toggle(this.uid(ctx), PROVIDER, dto.isActive);
    }
    async remove(ctx) {
        return this.service.delete(this.uid(ctx), PROVIDER);
    }
    uid(ctx) {
        if (!ctx?.userId)
            throw new common_1.ForbiddenException('Authentication required.');
        return ctx.userId;
    }
};
exports.CommunicationConnectionController = CommunicationConnectionController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Get the Communications connection for the authenticated business',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationConnectionController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Save or replace the Communications integration token',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, communication_connection_dto_1.SaveConnectionDto]),
    __metadata("design:returntype", Promise)
], CommunicationConnectionController.prototype, "save", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Test a token. If token provided: test without saving. Otherwise: test stored token.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, communication_connection_dto_1.TestConnectionDto]),
    __metadata("design:returntype", Promise)
], CommunicationConnectionController.prototype, "test", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Toggle active/inactive without changing the token',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, communication_connection_dto_1.ToggleConnectionDto]),
    __metadata("design:returntype", Promise)
], CommunicationConnectionController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Delete the Communications connection permanently' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommunicationConnectionController.prototype, "remove", null);
exports.CommunicationConnectionController = CommunicationConnectionController = __decorate([
    (0, swagger_1.ApiTags)('Settings — Communications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings/communications'),
    __metadata("design:paramtypes", [communication_connection_service_1.CommunicationConnectionService,
        communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService])
], CommunicationConnectionController);
//# sourceMappingURL=communication-connection.controller.js.map