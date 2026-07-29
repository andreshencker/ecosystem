"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const shift_schema_1 = require("./schemas/shift.schema");
const sync_history_schema_1 = require("./sync/schemas/sync-history.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const customer_schema_1 = require("../customer/schemas/customer.schema");
const shifts_service_1 = require("./shifts.service");
const shifts_controller_1 = require("./shifts.controller");
const shift_sync_service_1 = require("./sync/services/shift-sync.service");
const communications_module_1 = require("../../integrations/communications/communications.module");
const users_module_1 = require("../users/users.module");
const linked_calendars_module_1 = require("../linked-calendars/linked-calendars.module");
const business_intelligence_module_1 = require("../../integrations/business-intelligence/business-intelligence.module");
let ShiftsModule = class ShiftsModule {
};
exports.ShiftsModule = ShiftsModule;
exports.ShiftsModule = ShiftsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: shift_schema_1.Shift.name, schema: shift_schema_1.ShiftSchema },
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: customer_schema_1.Customer.name, schema: customer_schema_1.CustomerSchema },
                { name: sync_history_schema_1.SyncHistory.name, schema: sync_history_schema_1.SyncHistorySchema },
            ]),
            communications_module_1.CommunicationsModule,
            users_module_1.UsersModule,
            linked_calendars_module_1.LinkedCalendarsModule,
            business_intelligence_module_1.BusinessIntelligenceModule,
        ],
        controllers: [shifts_controller_1.ShiftsController],
        providers: [shifts_service_1.ShiftsService, shift_sync_service_1.ShiftSyncService],
        exports: [shifts_service_1.ShiftsService],
    })
], ShiftsModule);
//# sourceMappingURL=shifts.module.js.map