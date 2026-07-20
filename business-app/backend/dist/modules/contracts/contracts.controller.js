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
exports.ContractsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contracts_service_1 = require("./contracts.service");
const create_contract_dto_1 = require("./dto/create-contract.dto");
const update_contract_dto_1 = require("./dto/update-contract.dto");
const contract_response_dto_1 = require("./dto/contract-response.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
let ContractsController = class ContractsController {
    contracts;
    constructor(contracts) {
        this.contracts = contracts;
    }
    resolveContext(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No business assigned to this account');
        return {
            businessId: ctx.companyId,
            actor: {
                email: ctx.email ?? '',
                firstName: ctx.firstName ?? '',
                companyId: ctx.companyId,
            },
        };
    }
    async findAll(ctx, page, limit, customerId, status, search) {
        const { businessId } = this.resolveContext(ctx);
        const result = await this.contracts.findAll(businessId, {
            page: Math.max(1, Number(page ?? 1)),
            limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
            customerId,
            status,
            search,
        });
        return { ...result, items: result.items.map(contract_response_dto_1.toContractResponse) };
    }
    async findOne(ctx, id) {
        const { businessId } = this.resolveContext(ctx);
        const doc = await this.contracts.findById(id, businessId);
        if (!doc)
            throw new common_1.NotFoundException('Contract not found');
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async create(ctx, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.contracts.create(businessId, dto, actor);
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async update(ctx, id, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.contracts.update(id, businessId, dto, actor);
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async activate(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.contracts.activate(id, businessId, actor);
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async cancel(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.contracts.cancel(id, businessId, actor);
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async finish(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.contracts.finish(id, businessId, actor);
        return (0, contract_response_dto_1.toContractResponse)(doc);
    }
    async remove(ctx, id) {
        const { businessId } = this.resolveContext(ctx);
        await this.contracts.remove(id, businessId);
        return { deleted: true };
    }
};
exports.ContractsController = ContractsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List contracts for the authenticated business' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('customerId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a contract by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new contract (status=active)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_contract_dto_1.CreateContractDto]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update a contract' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_contract_dto_1.UpdateContractDto]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Activate a contract (draft → active or inactive → active)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a contract' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/finish'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a contract as finished (active → finished)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "finish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a draft contract permanently' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContractsController.prototype, "remove", null);
exports.ContractsController = ContractsController = __decorate([
    (0, swagger_1.ApiTags)('Contracts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('contracts'),
    __metadata("design:paramtypes", [contracts_service_1.ContractsService])
], ContractsController);
//# sourceMappingURL=contracts.controller.js.map