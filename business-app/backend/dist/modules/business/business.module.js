"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const business_controller_1 = require("./business.controller");
const business_service_1 = require("./business.service");
const business_smtp_schema_1 = require("./schemas/business-smtp.schema");
const business_schema_1 = require("./schemas/business.schema");
const security_module_1 = require("../../infrastructure/common/security/security.module");
const roles_guard_1 = require("../../infrastructure/security/guards/roles.guard");
const users_module_1 = require("../users/users.module");
let BusinessModule = class BusinessModule {
};
exports.BusinessModule = BusinessModule;
exports.BusinessModule = BusinessModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: business_schema_1.Business.name, schema: business_schema_1.BusinessSchema },
                { name: business_smtp_schema_1.BusinessSmtp.name, schema: business_smtp_schema_1.BusinessSmtpSchema },
            ]),
            security_module_1.SecurityModule,
            users_module_1.UsersModule,
        ],
        controllers: [business_controller_1.BusinessController],
        providers: [business_service_1.BusinessService, roles_guard_1.RolesGuard],
        exports: [business_service_1.BusinessService],
    })
], BusinessModule);
//# sourceMappingURL=business.module.js.map