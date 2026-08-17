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
exports.RelayOrganizationController = void 0;
const common_1 = require("@nestjs/common");
const organizations_service_1 = require("./organizations.service");
let RelayOrganizationController = class RelayOrganizationController {
    organizations;
    constructor(organizations) {
        this.organizations = organizations;
    }
    async getOrganization(secret, actorUserId, organizationId) {
        this.organizations.assertRelayClient(secret);
        return {
            contractVersion: 2,
            organization: await this.organizations.getApplicationOrganization(actorUserId, organizationId, 'relay'),
        };
    }
    async updateOrganization(secret, actorUserId, organizationId, body) {
        this.organizations.assertRelayClient(secret);
        return {
            contractVersion: 2,
            organization: await this.organizations.updateApplicationOrganization(actorUserId, organizationId, 'relay', body),
        };
    }
};
exports.RelayOrganizationController = RelayOrganizationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RelayOrganizationController.prototype, "getOrganization", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], RelayOrganizationController.prototype, "updateOrganization", null);
exports.RelayOrganizationController = RelayOrganizationController = __decorate([
    (0, common_1.Controller)('internal/apps/relay/organizations/:organizationId'),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], RelayOrganizationController);
//# sourceMappingURL=relay-organization.controller.js.map