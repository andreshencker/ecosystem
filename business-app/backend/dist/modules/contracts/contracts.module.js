"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const contract_schema_1 = require("./schemas/contract.schema");
const customer_schema_1 = require("../customer/schemas/customer.schema");
const shift_schema_1 = require("../shifts/schemas/shift.schema");
const contracts_service_1 = require("./contracts.service");
const contracts_controller_1 = require("./contracts.controller");
const communications_module_1 = require("../../integrations/communications/communications.module");
const users_module_1 = require("../users/users.module");
const linked_calendar_schema_1 = require("../linked-calendars/schemas/linked-calendar.schema");
let ContractsModule = class ContractsModule {
};
exports.ContractsModule = ContractsModule;
exports.ContractsModule = ContractsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: customer_schema_1.Customer.name, schema: customer_schema_1.CustomerSchema },
                { name: linked_calendar_schema_1.LinkedCalendar.name, schema: linked_calendar_schema_1.LinkedCalendarSchema },
                { name: shift_schema_1.Shift.name, schema: shift_schema_1.ShiftSchema },
            ]),
            communications_module_1.CommunicationsModule,
            users_module_1.UsersModule,
        ],
        controllers: [contracts_controller_1.ContractsController],
        providers: [contracts_service_1.ContractsService],
        exports: [contracts_service_1.ContractsService],
    })
], ContractsModule);
//# sourceMappingURL=contracts.module.js.map