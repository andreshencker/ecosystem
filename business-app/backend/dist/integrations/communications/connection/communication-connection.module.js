"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationConnectionModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = require("@nestjs/axios");
const communication_connection_schema_1 = require("./communication-connection.schema");
const communication_connection_service_1 = require("./communication-connection.service");
const communication_connection_controller_1 = require("./communication-connection.controller");
const security_module_1 = require("../../../infrastructure/common/security/security.module");
const user_schema_1 = require("../../../modules/users/schemas/user.schema");
const business_schema_1 = require("../../../modules/business/schemas/business.schema");
let CommunicationConnectionModule = class CommunicationConnectionModule {
};
exports.CommunicationConnectionModule = CommunicationConnectionModule;
exports.CommunicationConnectionModule = CommunicationConnectionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: communication_connection_schema_1.IntegrationConnection.name, schema: communication_connection_schema_1.IntegrationConnectionSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: business_schema_1.Business.name, schema: business_schema_1.BusinessSchema },
            ]),
            axios_1.HttpModule,
            security_module_1.SecurityModule,
        ],
        controllers: [communication_connection_controller_1.CommunicationConnectionController],
        providers: [communication_connection_service_1.CommunicationConnectionService],
        exports: [communication_connection_service_1.CommunicationConnectionService],
    })
], CommunicationConnectionModule);
//# sourceMappingURL=communication-connection.module.js.map