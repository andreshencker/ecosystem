"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvisioningModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const business_schema_1 = require("../business/schemas/business.schema");
const provisioning_service_1 = require("./provisioning.service");
let ProvisioningModule = class ProvisioningModule {
};
exports.ProvisioningModule = ProvisioningModule;
exports.ProvisioningModule = ProvisioningModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: business_schema_1.Business.name, schema: business_schema_1.BusinessSchema },
            ]),
        ],
        providers: [provisioning_service_1.ProvisioningService],
        exports: [provisioning_service_1.ProvisioningService],
    })
], ProvisioningModule);
//# sourceMappingURL=provisioning.module.js.map