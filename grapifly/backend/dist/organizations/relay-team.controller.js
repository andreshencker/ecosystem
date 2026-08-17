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
exports.RelayTeamController = void 0;
const common_1 = require("@nestjs/common");
const organizations_service_1 = require("./organizations.service");
let RelayTeamController = class RelayTeamController {
    organizations;
    constructor(organizations) {
        this.organizations = organizations;
    }
    list(secret, actorUserId, organizationId) {
        this.organizations.assertRelayClient(secret);
        return this.organizations.getApplicationTeam(actorUserId, organizationId, 'relay');
    }
    invite(secret, actorUserId, organizationId, body) {
        this.organizations.assertRelayClient(secret);
        return this.organizations.invite(actorUserId, organizationId, {
            email: body.email,
            role: body.role === 'admin' ? 'admin' : 'member',
            applicationKeys: ['relay'],
            applicationRoles: { relay: body.role },
        });
    }
    regenerate(secret, actorUserId, organizationId, invitationId) {
        this.organizations.assertRelayClient(secret);
        return this.organizations.regenerateInvitation(actorUserId, organizationId, invitationId);
    }
    cancel(secret, actorUserId, organizationId, invitationId) {
        this.organizations.assertRelayClient(secret);
        return this.organizations.cancelInvitation(actorUserId, organizationId, invitationId);
    }
    updateMember(secret, actorUserId, organizationId, grapiflyUserId, body) {
        this.organizations.assertRelayClient(secret);
        return this.organizations.updateApplicationMember(actorUserId, organizationId, 'relay', grapiflyUserId, body);
    }
};
exports.RelayTeamController = RelayTeamController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], RelayTeamController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('invitations'),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], RelayTeamController.prototype, "invite", null);
__decorate([
    (0, common_1.Post)('invitations/:invitationId/regenerate'),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __param(3, (0, common_1.Param)('invitationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RelayTeamController.prototype, "regenerate", null);
__decorate([
    (0, common_1.Post)('invitations/:invitationId/cancel'),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __param(3, (0, common_1.Param)('invitationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RelayTeamController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)('members/:grapiflyUserId'),
    __param(0, (0, common_1.Headers)('x-grapifly-sso-secret')),
    __param(1, (0, common_1.Headers)('x-grapifly-user-id')),
    __param(2, (0, common_1.Param)('organizationId')),
    __param(3, (0, common_1.Param)('grapiflyUserId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], RelayTeamController.prototype, "updateMember", null);
exports.RelayTeamController = RelayTeamController = __decorate([
    (0, common_1.Controller)('internal/apps/relay/organizations/:organizationId/team'),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService])
], RelayTeamController);
//# sourceMappingURL=relay-team.controller.js.map