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
exports.LinkedCalendarsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const linked_calendars_service_1 = require("./linked-calendars.service");
const link_calendars_dto_1 = require("./dto/link-calendars.dto");
const create_calendar_dto_1 = require("./dto/create-calendar.dto");
const subscribe_by_url_dto_1 = require("./dto/subscribe-by-url.dto");
const subscribe_from_catalogue_dto_1 = require("./dto/subscribe-from-catalogue.dto");
const setup_calendar_dto_1 = require("./dto/setup-calendar.dto");
const discover_holidays_dto_1 = require("./dto/discover-holidays.dto");
const link_holiday_calendar_dto_1 = require("./dto/link-holiday-calendar.dto");
const update_linked_calendar_dto_1 = require("./dto/update-linked-calendar.dto");
const linked_calendar_query_dto_1 = require("./dto/linked-calendar-query.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
const linked_calendar_schema_1 = require("./schemas/linked-calendar.schema");
let LinkedCalendarsController = class LinkedCalendarsController {
    service;
    constructor(service) {
        this.service = service;
    }
    resolveContext(ctx) {
        if (!ctx.companyId) {
            throw new common_1.ForbiddenException('No business assigned to this account');
        }
        return {
            companyId: ctx.companyId,
            actor: {
                userId: ctx.userId ?? '',
                email: ctx.email ?? '',
                firstName: ctx.firstName ?? '',
                companyId: ctx.companyId,
            },
        };
    }
    async listAccounts(ctx) {
        const { companyId } = this.resolveContext(ctx);
        const accounts = await this.service.listAvailableAccounts(companyId);
        return { data: accounts };
    }
    async listAccountCalendars(ctx, connectionId) {
        const { companyId } = this.resolveContext(ctx);
        const calendars = await this.service.listAvailableCalendars(companyId, connectionId);
        return { data: calendars };
    }
    async getOptions(ctx, flow) {
        const { companyId } = this.resolveContext(ctx);
        if (!flow || !linked_calendar_schema_1.CALENDAR_FLOWS.includes(flow)) {
            throw new common_1.BadRequestException(`flow is required and must be one of: ${linked_calendar_schema_1.CALENDAR_FLOWS.join(', ')}`);
        }
        const items = await this.service.getOptions(companyId, flow);
        return { data: items };
    }
    async findAll(ctx, query) {
        const { companyId } = this.resolveContext(ctx);
        const items = await this.service.findAll(companyId, query);
        return { data: items, total: items.length };
    }
    async findOne(ctx, id) {
        const { companyId } = this.resolveContext(ctx);
        const item = await this.service.findById(id, companyId);
        if (!item)
            throw new common_1.NotFoundException('Linked calendar not found');
        return item;
    }
    async linkCalendars(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        const items = await this.service.linkCalendars(companyId, dto, actor);
        return { data: items };
    }
    async createCalendar(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        const item = await this.service.createAndLinkCalendar(companyId, dto, actor);
        return item;
    }
    async subscribeByUrl(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        const item = await this.service.subscribeByUrl(companyId, dto, actor);
        return item;
    }
    async subscribeFromCatalogue(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        const item = await this.service.subscribeFromCatalogue(companyId, dto, actor);
        return item;
    }
    async getCatalogue(ctx, country = 'AU') {
        this.resolveContext(ctx);
        const entries = this.service.getCatalogueForCountry(country.toUpperCase());
        return { data: entries };
    }
    async setupPaymentCalendar(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.setupPaymentCalendar(companyId, dto, actor);
    }
    async setupAustralianHolidays(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.setupAustralianHolidays(companyId, dto, actor);
    }
    async discoverAustralianHolidays(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.discoverAustralianHolidays(companyId, dto, actor);
    }
    async linkHolidayCalendar(ctx, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.linkProviderCalendarAsHoliday(companyId, dto, actor);
    }
    async updateStatus(ctx, id, dto) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.updateStatus(id, companyId, dto, actor);
    }
    async activate(ctx, id) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.activate(id, companyId, actor);
    }
    async pause(ctx, id) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.pause(id, companyId, actor);
    }
    async unlink(ctx, id) {
        const { companyId, actor } = this.resolveContext(ctx);
        return this.service.unlink(id, companyId, actor);
    }
};
exports.LinkedCalendarsController = LinkedCalendarsController;
__decorate([
    (0, common_1.Get)('accounts'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List available calendar accounts from Communications' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:connectionId/calendars'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List calendars for an account with linked status overlay' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('connectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "listAccountCalendars", null);
__decorate([
    (0, common_1.Get)('options'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Return active calendars for a given flow (safe — no credentials)' }),
    (0, swagger_1.ApiQuery)({ name: 'flow', enum: linked_calendar_schema_1.CALENDAR_FLOWS, required: true }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('flow')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "getOptions", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List linked calendars for the authenticated Business' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, linked_calendar_query_dto_1.LinkedCalendarQueryDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a linked calendar by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('link'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Link one or more existing provider calendars to this Business' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, link_calendars_dto_1.LinkCalendarsDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "linkCalendars", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new calendar in the provider and immediately link it' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_calendar_dto_1.CreateCalendarDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "createCalendar", null);
__decorate([
    (0, common_1.Post)('subscribe-url'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe provider account to an external iCal URL and link it' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscribe_by_url_dto_1.SubscribeByUrlDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "subscribeByUrl", null);
__decorate([
    (0, common_1.Post)('subscribe-catalogue'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe to a Business App catalogue calendar and link it' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscribe_from_catalogue_dto_1.SubscribeFromCatalogueDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "subscribeFromCatalogue", null);
__decorate([
    (0, common_1.Get)('catalogue'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Return safe public calendar catalogue entries for a country' }),
    (0, swagger_1.ApiQuery)({ name: 'country', required: false, description: 'ISO 2-letter country code (e.g. AU)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "getCatalogue", null);
__decorate([
    (0, common_1.Post)('setup/payment'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'One-click: create a payment calendar and link it. Idempotent.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, setup_calendar_dto_1.SetupCalendarDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "setupPaymentCalendar", null);
__decorate([
    (0, common_1.Post)('setup/australian-holidays'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'One-click: subscribe to Australian public holidays and link it. Idempotent.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, setup_calendar_dto_1.SetupCalendarDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "setupAustralianHolidays", null);
__decorate([
    (0, common_1.Post)('setup/australian-holidays/discover'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Discover unlinked Australian holiday calendars from provider after manual setup.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, discover_holidays_dto_1.DiscoverHolidaysDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "discoverAustralianHolidays", null);
__decorate([
    (0, common_1.Post)('setup/australian-holidays/link-selected'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Link a selected provider calendar as the Australian holiday calendar.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, link_holiday_calendar_dto_1.LinkHolidayCalendarDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "linkHolidayCalendar", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update status of a linked calendar (active | paused)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_linked_calendar_dto_1.UpdateLinkedCalendarDto]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Activate a paused linked calendar' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/pause'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Pause an active linked calendar' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "pause", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink a calendar from this Business (local only)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LinkedCalendarsController.prototype, "unlink", null);
exports.LinkedCalendarsController = LinkedCalendarsController = __decorate([
    (0, swagger_1.ApiTags)('Linked Calendars'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('linked-calendars'),
    __metadata("design:paramtypes", [linked_calendars_service_1.LinkedCalendarsService])
], LinkedCalendarsController);
//# sourceMappingURL=linked-calendars.controller.js.map