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
exports.OrganizationsController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../auth/session.guard");
const organizations_service_1 = require("./organizations.service");
let OrganizationsController = class OrganizationsController {
    organizations;
    constructor(organizations) {
        this.organizations = organizations;
    }
    async list(request) {
        return { organizations: await this.organizations.listForUser(request.grapiflySession.sub) };
    }
    create(request, body) {
        return this.organizations.create(request.grapiflySession.sub, body.name, body.entityType);
    }
    details(request, organizationId) {
        return this.organizations.getDetails(request.grapiflySession.sub, organizationId);
    }
    update(request, organizationId, body) {
        return this.organizations.updateProfile(request.grapiflySession.sub, organizationId, body);
    }
    archive(request, organizationId) {
        return this.organizations.archive(request.grapiflySession.sub, organizationId);
    }
    enableApplication(request, organizationId, body) {
        return this.organizations.enableApplication(request.grapiflySession.sub, organizationId, body.applicationKey);
    }
    invite(request, organizationId, body) {
        return this.organizations.invite(request.grapiflySession.sub, organizationId, body);
    }
    regenerateInvitation(request, organizationId, invitationId) {
        return this.organizations.regenerateInvitation(request.grapiflySession.sub, organizationId, invitationId);
    }
    cancelInvitation(request, organizationId, invitationId) {
        return this.organizations.cancelInvitation(request.grapiflySession.sub, organizationId, invitationId);
    }
    accept(request, token) {
        return this.organizations.accept(request.grapiflySession.sub, token);
    }
};
exports.OrganizationsController = OrganizationsController;
__decorate([
    (0, common_1.Get)('organizations'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('organizations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('organizations/:organizationId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "details", null);
__decorate([
    (0, common_1.Patch)('organizations/:organizationId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('organizations/:organizationId/archive'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)('organizations/:organizationId/applications'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "enableApplication", null);
__decorate([
    (0, common_1.Post)('organizations/:organizationId/invitations'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)('organizations/:organizationId/invitations/:invitationId/regenerate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __param(2, (0, common_1.Param)('invitationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "regenerateInvitation", null);
__decorate([
    (0, common_1.Post)('organizations/:organizationId/invitations/:invitationId/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __param(2, (0, common_1.Param)('invitationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "cancelInvitation", null);
__decorate([
    (0, common_1.Post)('invitations/:token/accept'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrganizationsController.prototype, "accept", null);
exports.OrganizationsController = OrganizationsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], OrganizationsController);
//# sourceMappingURL=organizations.controller.js.map