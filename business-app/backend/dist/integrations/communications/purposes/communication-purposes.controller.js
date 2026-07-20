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
exports.CommunicationPurposesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const communication_purposes_service_1 = require("./communication-purposes.service");
const create_purpose_dto_1 = require("./dto/create-purpose.dto");
const update_purpose_dto_1 = require("./dto/update-purpose.dto");
const purpose_list_query_dto_1 = require("./dto/purpose-list-query.dto");
const current_user_decorator_1 = require("../../../infrastructure/security/decorators/current-user.decorator");
let CommunicationPurposesController = class CommunicationPurposesController {
    purposes;
    constructor(purposes) {
        this.purposes = purposes;
    }
    resolveBusinessId(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No business assigned to this account');
        return ctx.companyId;
    }
    async getCredentialOptions(ctx, channel) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.getCredentialOptions(businessId, channel);
    }
    async list(ctx, query) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.list(businessId, query);
    }
    async create(ctx, dto) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.create(businessId, dto);
    }
    async findOne(ctx, id) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.findOne(businessId, id);
    }
    async update(ctx, id, dto) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.update(businessId, id, dto);
    }
    async remove(ctx, id) {
        const businessId = this.resolveBusinessId(ctx);
        return this.purposes.remove(businessId, id);
    }
};
exports.CommunicationPurposesController = CommunicationPurposesController;
__decorate([
    (0, common_1.Get)('credential-options'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List available credential options for a channel' }),
    (0, swagger_1.ApiQuery)({ name: 'channel', enum: ['email', 'sms'], required: true }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "getCredentialOptions", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List Communication Purposes for the authenticated business' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, purpose_list_query_dto_1.PurposeListQueryDto]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Communication Purpose' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_purpose_dto_1.CreatePurposeDto]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a Communication Purpose by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update a Communication Purpose' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_purpose_dto_1.UpdatePurposeDto]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a Communication Purpose' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationPurposesController.prototype, "remove", null);
exports.CommunicationPurposesController = CommunicationPurposesController = __decorate([
    (0, swagger_1.ApiTags)('Settings — Communication Purposes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings/communication-purposes'),
    __metadata("design:paramtypes", [communication_purposes_service_1.CommunicationPurposesService])
], CommunicationPurposesController);
//# sourceMappingURL=communication-purposes.controller.js.map