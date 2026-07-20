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
exports.UserInvitationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_invitations_service_1 = require("./user-invitations.service");
const users_service_1 = require("../users/users.service");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
const invite_user_dto_1 = require("./dto/invite-user.dto");
const invitation_mapper_1 = require("./mappers/invitation.mapper");
const INVITE_HIERARCHY = {
    platform_admin: ['platform_admin', 'business_admin'],
    business_owner: ['business_admin', 'accountant', 'staff', 'viewer'],
    business_admin: ['accountant', 'staff', 'viewer'],
};
let UserInvitationsController = class UserInvitationsController {
    userInvitations;
    users;
    constructor(userInvitations, users) {
        this.userInvitations = userInvitations;
        this.users = users;
    }
    async invite(ctx, dto) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        const actorRole = actor.role;
        const targetRole = dto.role;
        const allowedRoles = INVITE_HIERARCHY[actorRole] ?? [];
        if (!allowedRoles.includes(targetRole)) {
            throw new common_1.ForbiddenException(`${actorRole} is not permitted to invite ${targetRole}`);
        }
        const { companyId, businessKey } = this.resolveTargetCompany({
            actorScope: actor.scope ?? 'company',
            actorCompanyId: actor.companyId,
            actorBusinessKey: actor.businessKey,
            targetRole,
            targetCompanyId: dto.targetCompanyId,
            targetBusinessKey: dto.targetBusinessKey,
        });
        const result = await this.userInvitations.sendInvitation({
            actorRole,
            invitedByUserId: ctx.userId,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            targetRole,
            companyId,
            businessKey,
        });
        return {
            userId: result.userId,
            invitationId: result.invitationId,
            email: dto.email,
            role: dto.role,
            emailDelivered: result.emailDelivered,
            message: result.message,
        };
    }
    async getInvitations(ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        const docs = await this.userInvitations.listInvitations(actor.scope ?? 'company', actor.companyId);
        return {
            items: docs.map((doc) => invitation_mapper_1.InvitationMapper.toResponse(doc)),
        };
    }
    async resendInvitation(id, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        const result = await this.userInvitations.resendInvitation(id, {
            scope: actor.scope ?? 'company',
            companyId: actor.companyId,
        });
        return {
            message: result.message,
            emailDelivered: result.emailDelivered,
        };
    }
    async cancelInvitation(id, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (actor.role !== 'platform_admin' &&
            actor.role !== 'business_owner' &&
            actor.role !== 'business_admin') {
            throw new common_1.ForbiddenException('You do not have permission to cancel invitations');
        }
        await this.userInvitations.cancelInvitation(id, {
            scope: actor.scope ?? 'company',
            companyId: actor.companyId,
        });
        return { cancelled: true };
    }
    resolveTargetCompany(params) {
        if (params.actorScope === 'global') {
            if (params.targetRole === 'business_admin') {
                if (!params.targetCompanyId?.trim()) {
                    throw new common_1.BadRequestException(`targetCompanyId is required when platform_admin invites ${params.targetRole}`);
                }
                return {
                    companyId: params.targetCompanyId.trim(),
                    businessKey: params.targetBusinessKey?.trim() || null,
                };
            }
            return {
                companyId: params.actorCompanyId,
                businessKey: params.actorBusinessKey,
            };
        }
        return {
            companyId: params.actorCompanyId,
            businessKey: params.actorBusinessKey,
        };
    }
};
exports.UserInvitationsController = UserInvitationsController;
__decorate([
    (0, common_1.Post)('invite'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a user account and send invitation email',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invite_user_dto_1.InviteUserDto]),
    __metadata("design:returntype", Promise)
], UserInvitationsController.prototype, "invite", null);
__decorate([
    (0, common_1.Get)('invitations'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List invitations visible to the current actor' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserInvitationsController.prototype, "getInvitations", null);
__decorate([
    (0, common_1.Post)('invitations/:id/resend'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Regenerate temp password and resend invitation email',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserInvitationsController.prototype, "resendInvitation", null);
__decorate([
    (0, common_1.Patch)('invitations/:id/cancel'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a pending invitation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserInvitationsController.prototype, "cancelInvitation", null);
exports.UserInvitationsController = UserInvitationsController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_invitations_service_1.UserInvitationsService,
        users_service_1.UsersService])
], UserInvitationsController);
//# sourceMappingURL=user-invitations.controller.js.map