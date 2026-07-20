"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdminModule = void 0;
const common_1 = require("@nestjs/common");
const platform_admin_customers_controller_1 = require("./platform-admin-customers.controller");
const platform_admin_contracts_controller_1 = require("./platform-admin-contracts.controller");
const business_intelligence_module_1 = require("../../integrations/business-intelligence/business-intelligence.module");
let PlatformAdminModule = class PlatformAdminModule {
};
exports.PlatformAdminModule = PlatformAdminModule;
exports.PlatformAdminModule = PlatformAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [business_intelligence_module_1.BusinessIntelligenceModule],
        controllers: [platform_admin_customers_controller_1.PlatformAdminCustomersController, platform_admin_contracts_controller_1.PlatformAdminContractsController],
    })
], PlatformAdminModule);
//# sourceMappingURL=platform-admin.module.js.map