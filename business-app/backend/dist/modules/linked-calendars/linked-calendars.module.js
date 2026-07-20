"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedCalendarsModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const mongoose_1 = require("@nestjs/mongoose");
const linked_calendar_schema_1 = require("./schemas/linked-calendar.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const linked_calendars_service_1 = require("./linked-calendars.service");
const linked_calendars_controller_1 = require("./linked-calendars.controller");
const communications_calendar_client_1 = require("./clients/communications-calendar.client");
const communications_module_1 = require("../../integrations/communications/communications.module");
const users_module_1 = require("../users/users.module");
let LinkedCalendarsModule = class LinkedCalendarsModule {
};
exports.LinkedCalendarsModule = LinkedCalendarsModule;
exports.LinkedCalendarsModule = LinkedCalendarsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            mongoose_1.MongooseModule.forFeature([
                { name: linked_calendar_schema_1.LinkedCalendar.name, schema: linked_calendar_schema_1.LinkedCalendarSchema },
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
            ]),
            communications_module_1.CommunicationsModule,
            users_module_1.UsersModule,
        ],
        controllers: [linked_calendars_controller_1.LinkedCalendarsController],
        providers: [linked_calendars_service_1.LinkedCalendarsService, communications_calendar_client_1.CommunicationsCalendarClient],
        exports: [linked_calendars_service_1.LinkedCalendarsService, communications_calendar_client_1.CommunicationsCalendarClient],
    })
], LinkedCalendarsModule);
//# sourceMappingURL=linked-calendars.module.js.map