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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const shifts_service_1 = require("./shifts.service");
const shift_sync_service_1 = require("./sync/services/shift-sync.service");
const create_shift_dto_1 = require("./dto/create-shift.dto");
const update_shift_dto_1 = require("./dto/update-shift.dto");
const assign_contract_dto_1 = require("./dto/assign-contract.dto");
const bulk_assign_contract_dto_1 = require("./dto/bulk-assign-contract.dto");
const shift_response_dto_1 = require("./dto/shift-response.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
let ShiftsController = class ShiftsController {
    shifts;
    syncService;
    constructor(shifts, syncService) {
        this.shifts = shifts;
        this.syncService = syncService;
    }
    resolveContext(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No business assigned to this account');
        return {
            businessId: ctx.companyId,
            actor: {
                userId: ctx.userId ?? ctx.sub ?? '',
                email: ctx.email ?? '',
                firstName: ctx.firstName ?? '',
                companyId: ctx.companyId,
            },
        };
    }
    async triggerSync(ctx) {
        const { businessId, actor } = this.resolveContext(ctx);
        return this.syncService.syncBusiness(businessId, actor);
    }
    async triggerSyncSingle(ctx, linkedCalendarId) {
        const { businessId, actor } = this.resolveContext(ctx);
        return this.syncService.syncSingleCalendar(businessId, linkedCalendarId, actor);
    }
    async getSyncHistory(ctx, page, limit, linkedCalendarId) {
        const { businessId } = this.resolveContext(ctx);
        return this.syncService.getSyncHistory(businessId, {
            page: Math.max(1, Number(page ?? 1)),
            limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
            linkedCalendarId,
        });
    }
    async findAll(ctx, page, limit, contractId, customerId, status, date, dateFrom, dateTo, search, source, linkedCalendarId) {
        const { businessId } = this.resolveContext(ctx);
        const result = await this.shifts.findAll(businessId, {
            page: Math.max(1, Number(page ?? 1)),
            limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
            contractId,
            customerId,
            status,
            date,
            dateFrom,
            dateTo,
            search,
            source,
            linkedCalendarId,
        });
        return { ...result, items: result.items.map(shift_response_dto_1.toShiftResponse) };
    }
    async findOne(ctx, id) {
        const { businessId } = this.resolveContext(ctx);
        const doc = await this.shifts.findById(id, businessId);
        if (!doc)
            throw new common_1.NotFoundException('Shift not found');
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async create(ctx, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.shifts.create(businessId, dto, actor);
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async bulkAssignContracts(ctx, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        return this.shifts.bulkAssignContracts(businessId, dto.assignments, actor);
    }
    async update(ctx, id, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.shifts.update(id, businessId, dto, actor);
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async confirm(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.shifts.confirm(id, businessId, actor);
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async assignContract(ctx, id, dto) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.shifts.assignContract(id, businessId, dto.contractId, actor);
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async cancel(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        const doc = await this.shifts.cancel(id, businessId, actor);
        return (0, shift_response_dto_1.toShiftResponse)(doc);
    }
    async remove(ctx, id) {
        const { businessId, actor } = this.resolveContext(ctx);
        await this.shifts.remove(id, businessId, actor);
        return { deleted: true };
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger calendar sync for all active linked calendars' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "triggerSync", null);
__decorate([
    (0, common_1.Post)('sync/:linkedCalendarId'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger calendar sync for a single linked calendar' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('linkedCalendarId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "triggerSyncSingle", null);
__decorate([
    (0, common_1.Get)('sync/history'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List sync history entries for the authenticated business' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'linkedCalendarId', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('linkedCalendarId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getSyncHistory", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List shifts for the authenticated business' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'contractId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'source', required: false, description: 'calendar | manual' }),
    (0, swagger_1.ApiQuery)({ name: 'linkedCalendarId', required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('contractId')),
    __param(4, (0, common_1.Query)('customerId')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('date')),
    __param(7, (0, common_1.Query)('dateFrom')),
    __param(8, (0, common_1.Query)('dateTo')),
    __param(9, (0, common_1.Query)('search')),
    __param(10, (0, common_1.Query)('source')),
    __param(11, (0, common_1.Query)('linkedCalendarId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a shift by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new shift (status=draft)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_shift_dto_1.CreateShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('contracts/bulk'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk assign Contracts to multiple Shifts in one atomic operation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_assign_contract_dto_1.BulkAssignContractDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "bulkAssignContracts", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update a shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_shift_dto_1.UpdateShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm a shift (draft → confirmed)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/assign-contract'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Assign (or reassign) a Contract to a Shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_contract_dto_1.AssignContractDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "assignContract", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a draft shift permanently' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "remove", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, swagger_1.ApiTags)('Shifts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('shifts'),
    __metadata("design:paramtypes", [shifts_service_1.ShiftsService,
        shift_sync_service_1.ShiftSyncService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map