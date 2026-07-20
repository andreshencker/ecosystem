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
var UsersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
const update_user_dto_1 = require("./dto/update-user.dto");
const user_response_dto_1 = require("./dto/user-response.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
const event_bus_service_1 = require("../../infrastructure/events/event-bus.service");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
class ChangePasswordDto {
    currentPassword;
    newPassword;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'New password must be at least 8 characters' }),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
let UsersController = UsersController_1 = class UsersController {
    users;
    config;
    eventBus;
    commClient;
    logger = new common_1.Logger(UsersController_1.name);
    constructor(users, config, eventBus, commClient) {
        this.users = users;
        this.config = config;
        this.eventBus = eventBus;
        this.commClient = commClient;
    }
    async list(ctx, page = '1', limit = '25', search, companyId) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const params = { page: parsedPage, limit: parsedLimit, search };
        let result;
        if (actor.scope === 'global' && companyId?.trim()) {
            result = await this.users.listByCompanyId(companyId.trim(), params);
        }
        else if (actor.scope === 'global') {
            result = await this.users.listPlatformUsers(params);
        }
        else {
            result = await this.users.listByCompanyId(String(actor.companyId), params);
        }
        return {
            items: result.items.map(user_response_dto_1.UserResponseDto.from),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }
    async getMe(ctx) {
        const user = await this.users.findByIdOrThrow(ctx.userId);
        return user_response_dto_1.UserResponseDto.from(user);
    }
    async updateMe(ctx, dto) {
        const updated = await this.users.update(ctx.userId, dto);
        return user_response_dto_1.UserResponseDto.from(updated);
    }
    async changePassword(ctx, dto) {
        const before = await this.users.findByIdOrThrow(ctx.userId);
        const wasMustChange = !!before.mustChangePassword;
        const updated = await this.users.changePassword(ctx.userId, dto.currentPassword, dto.newPassword);
        if (wasMustChange) {
            this.eventBus.emit(event_bus_service_1.PLATFORM_EVENTS.USER_INVITATION_PASSWORD_COMPLETED, {
                email: before.email,
            });
        }
        else {
            const businessName = before.companyId
                ? await this.users
                    .getCompanyDisplayName(String(before.companyId))
                    .catch(() => '')
                : '';
            this.commClient
                .notifyEvent({
                type: 'platform',
                event: 'security.company_password_changed',
                email: before.email,
                data: {
                    firstName: before.firstName,
                    email: before.email,
                    businessName,
                    when: new Date().toISOString(),
                },
            })
                .then((delivered) => this.logger.log(`[changePassword] security.company_password_changed delivered=${delivered} userId=${String(before._id ?? '')}`))
                .catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`[changePassword] notification threw unexpectedly: ${msg}`);
            });
        }
        return user_response_dto_1.UserResponseDto.from(updated);
    }
    async deleteUser(targetId, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
            throw new common_1.ForbiddenException('You do not have permission to delete users');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (String(target._id) === ctx.userId) {
            throw new common_1.ForbiddenException('You cannot delete your own account');
        }
        if (actor.role === 'business_owner') {
            if (target.role === 'platform_admin') {
                throw new common_1.ForbiddenException('You cannot delete modules administrators');
            }
            if (target.companyId !== actor.companyId) {
                throw new common_1.ForbiddenException('You can only delete users in your own company');
            }
        }
        if (target.role === 'business_owner' && target.companyId) {
            const ownerCount = await this.users.countActiveOwners(String(target.companyId));
            if (ownerCount <= 1) {
                throw new common_1.BadRequestException('Cannot delete the last owner of a company');
            }
        }
        await this.users.deleteById(targetId);
        return { deleted: true };
    }
    async deactivateUser(targetId, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
            throw new common_1.ForbiddenException('You do not have permission to deactivate users');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (String(target._id) === ctx.userId) {
            throw new common_1.ForbiddenException('You cannot deactivate your own account');
        }
        if (actor.role === 'business_owner') {
            if (target.role === 'platform_admin') {
                throw new common_1.ForbiddenException('You cannot deactivate modules administrators');
            }
            if (target.companyId !== actor.companyId) {
                throw new common_1.ForbiddenException('You can only deactivate users in your own company');
            }
        }
        if (target.isActive === false) {
            throw new common_1.ForbiddenException('User is already inactive');
        }
        const updated = await this.users.setUserActive(targetId, false);
        return user_response_dto_1.UserResponseDto.from(updated);
    }
    async reactivateUser(targetId, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
            throw new common_1.ForbiddenException('You do not have permission to reactivate users');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (String(target._id) === ctx.userId) {
            throw new common_1.ForbiddenException('You cannot reactivate your own account');
        }
        if (actor.role === 'business_owner') {
            if (target.role === 'platform_admin') {
                throw new common_1.ForbiddenException('You cannot reactivate modules administrators');
            }
            if (target.companyId !== actor.companyId) {
                throw new common_1.ForbiddenException('You can only reactivate users in your own company');
            }
        }
        if (target.isActive !== false) {
            throw new common_1.ForbiddenException('User is already active');
        }
        const updated = await this.users.setUserActive(targetId, true);
        return user_response_dto_1.UserResponseDto.from(updated);
    }
    async sendPasswordReset(targetId, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (!['platform_admin', 'business_owner', 'business_admin'].includes(actor.role)) {
            throw new common_1.ForbiddenException('You do not have permission to reset user passwords');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (String(target._id) === ctx.userId) {
            throw new common_1.ForbiddenException('Use the profile settings to change your own password');
        }
        if (actor.scope === 'company' &&
            String(target.companyId) !== String(actor.companyId)) {
            throw new common_1.ForbiddenException('You can only reset passwords for users in your company');
        }
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.users.setPasswordResetToken(targetId, tokenHash, expiresAt);
        const resetUrl = this.buildFrontendUrl(`/auth/reset-password?token=${rawToken}`);
        const businessName = target.companyId
            ? await this.users
                .getCompanyDisplayName(String(target.companyId))
                .catch(() => '')
            : '';
        this.commClient
            .notifyEvent({
            type: 'platform',
            event: 'security.company_forgot_password',
            email: target.email,
            data: {
                firstName: target.firstName,
                email: target.email,
                businessName,
                resetUrl,
                expiresAt: expiresAt.toISOString(),
            },
        })
            .then((delivered) => this.logger.log(`[sendPasswordReset] security.company_forgot_password delivered=${delivered} targetId=${targetId}`))
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[sendPasswordReset] notification threw unexpectedly: ${msg}`);
        });
        return { message: 'Password reset email sent.' };
    }
    async getUser(targetId, ctx) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (!['platform_admin', 'business_owner', 'business_admin'].includes(actor.role)) {
            throw new common_1.ForbiddenException('You do not have permission to view this user');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (actor.scope === 'company' &&
            String(target.companyId) !== String(actor.companyId)) {
            throw new common_1.ForbiddenException('You can only view users in your own company');
        }
        return user_response_dto_1.UserResponseDto.from(target);
    }
    async updateUser(targetId, ctx, dto) {
        const actor = await this.users.findByIdOrThrow(ctx.userId);
        if (actor.role !== 'platform_admin' && actor.role !== 'business_owner') {
            throw new common_1.ForbiddenException('You do not have permission to update this user');
        }
        const target = await this.users.findByIdOrThrow(targetId);
        if (actor.scope === 'company' &&
            String(target.companyId) !== String(actor.companyId)) {
            throw new common_1.ForbiddenException('You can only update users in your own company');
        }
        if (target.role === 'platform_admin' && actor.role !== 'platform_admin') {
            throw new common_1.ForbiddenException('You cannot modify modules administrators');
        }
        const updated = await this.users.update(targetId, dto);
        return user_response_dto_1.UserResponseDto.from(updated);
    }
    buildFrontendUrl(path) {
        const base = (this.config.get('FRONTEND_BASE_URL') ||
            this.config.get('APP_BASE_URL') ||
            'http://localhost:3000').replace(/\/$/, '');
        return `${base}${path}`;
    }
    buildLoginUrl() {
        return this.buildFrontendUrl('/auth/login');
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List users scoped to actor role (DEC-009)' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({
        name: 'companyId',
        required: false,
        description: 'platform_admin: scope listing to a specific company (Global Users page)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Patch)('me/password'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Change current user password and clear mustChangePassword (DEC-014)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Permanently delete a user account (platform_admin or business_owner only)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Deactivate a user account (platform_admin or business_owner only)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deactivateUser", null);
__decorate([
    (0, common_1.Patch)(':id/reactivate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Reactivate a deactivated user account (platform_admin or business_owner only)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "reactivateUser", null);
__decorate([
    (0, common_1.Post)(':id/send-password-reset'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin-triggered password reset email for any user (business_admin+)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "sendPasswordReset", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific user by ID (business_admin+)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a specific user by ID (business_owner+ only)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
exports.UsersController = UsersController = UsersController_1 = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        config_1.ConfigService,
        event_bus_service_1.EventBusService,
        communications_client_service_1.CommunicationsClientService])
], UsersController);
//# sourceMappingURL=users.controller.js.map