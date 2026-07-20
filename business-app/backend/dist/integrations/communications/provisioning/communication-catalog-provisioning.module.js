"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationCatalogProvisioningModule = void 0;
const common_1 = require("@nestjs/common");
const communication_catalog_provisioning_service_1 = require("./communication-catalog-provisioning.service");
let CommunicationCatalogProvisioningModule = class CommunicationCatalogProvisioningModule {
};
exports.CommunicationCatalogProvisioningModule = CommunicationCatalogProvisioningModule;
exports.CommunicationCatalogProvisioningModule = CommunicationCatalogProvisioningModule = __decorate([
    (0, common_1.Module)({
        providers: [communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService],
        exports: [communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService],
    })
], CommunicationCatalogProvisioningModule);
//# sourceMappingURL=communication-catalog-provisioning.module.js.map