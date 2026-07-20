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
exports.CommunicationEventsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const communication_events_service_1 = require("./communication-events.service");
const create_communication_event_dto_1 = require("./dto/create-communication-event.dto");
const update_communication_event_dto_1 = require("./dto/update-communication-event.dto");
const communication_event_list_query_dto_1 = require("./dto/communication-event-list-query.dto");
const current_user_decorator_1 = require("../../../infrastructure/security/decorators/current-user.decorator");
let CommunicationEventsController = class CommunicationEventsController {
    events;
    constructor(events) {
        this.events = events;
    }
    resolveBusinessId(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No business assigned to this account');
        return ctx.companyId;
    }
    async bulkImport(ctx, body) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.bulkImport(businessId, body.domainCatalogueId, body.items ?? []);
    }
    async list(ctx, query) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.list(businessId, query);
    }
    async create(ctx, dto) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.create(businessId, dto);
    }
    async findOne(ctx, id) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.findOne(businessId, id);
    }
    async update(ctx, id, dto) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.update(businessId, id, dto);
    }
    async remove(ctx, id) {
        const businessId = this.resolveBusinessId(ctx);
        return this.events.remove(businessId, id);
    }
};
exports.CommunicationEventsController = CommunicationEventsController;
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk import Communication Events into a purpose' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List Communication Events for a given Communication Purpose' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, communication_event_list_query_dto_1.CommunicationEventListQueryDto]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Communication Event' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_communication_event_dto_1.CreateCommunicationEventDto]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a Communication Event by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update a Communication Event' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_communication_event_dto_1.UpdateCommunicationEventDto]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a Communication Event' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CommunicationEventsController.prototype, "remove", null);
exports.CommunicationEventsController = CommunicationEventsController = __decorate([
    (0, swagger_1.ApiTags)('Settings — Communication Events'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings/communication-events'),
    __metadata("design:paramtypes", [communication_events_service_1.CommunicationEventsService])
], CommunicationEventsController);
//# sourceMappingURL=communication-events.controller.js.map