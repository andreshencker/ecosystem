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
var UserInvitationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInvitationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const invitation_schema_1 = require("./schemas/invitation.schema");
const business_schema_1 = require("../business/schemas/business.schema");
const users_service_1 = require("../users/users.service");
const event_bus_service_1 = require("../../infrastructure/events/event-bus.service");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
let UserInvitationsService = UserInvitationsService_1 = class UserInvitationsService {
    invitationModel;
    companyModel;
    usersService;
    config;
    eventBus;
    commClient;
    logger = new common_1.Logger(UserInvitationsService_1.name);
    constructor(invitationModel, companyModel, usersService, config, eventBus, commClient) {
        this.invitationModel = invitationModel;
        this.companyModel = companyModel;
        this.usersService = usersService;
        this.config = config;
        this.eventBus = eventBus;
        this.commClient = commClient;
    }
    onModuleInit() {
        this.eventBus.on(event_bus_service_1.PLATFORM_EVENTS.USER_INVITATION_PASSWORD_COMPLETED, (payload) => {
            this.handlePasswordCompleted(payload).catch((err) => this.logger.warn(`handlePasswordCompleted failed for ${payload.email}: ${err?.message}`));
        });
    }
    async sendInvitation(params) {
        const normalizedEmail = params.email.trim().toLowerCase();
        this.logger.log(`[sendInvitation] normalizedEmail=${normalizedEmail}`);
        const existingUser = await this.usersService.existsByEmail(normalizedEmail);
        this.logger.log(`[sendInvitation] existingUserFound=${existingUser} normalizedEmail=${normalizedEmail}`);
        if (existingUser) {
            this.logger.warn(`[sendInvitation] blocked=duplicate_user normalizedEmail=${normalizedEmail}`);
            throw new common_1.BadRequestException('A user with this email already exists.');
        }
        const existingInvitation = (await this.invitationModel
            .findOne({
            email: normalizedEmail,
            status: { $in: ['pending', 'pending_delivery'] },
        })
            .lean()
            .exec());
        const existingInvitationFound = !!existingInvitation;
        this.logger.log(`[sendInvitation] existingInvitationFound=${existingInvitationFound} normalizedEmail=${normalizedEmail}` +
            (existingInvitation
                ? ` invitationStatus=${existingInvitation.status}`
                : ''));
        if (existingInvitation) {
            this.logger.warn(`[sendInvitation] blocked=duplicate_invitation normalizedEmail=${normalizedEmail} status=${existingInvitation.status}`);
            throw new common_1.BadRequestException('There is already a pending invitation for this email.');
        }
        this.logger.log(`[sendInvitation] guards passed — proceeding normalizedEmail=${normalizedEmail}`);
        const { user, tempPassword } = await this.usersService.createInvitedUser({
            email: normalizedEmail,
            firstName: params.firstName,
            lastName: params.lastName,
            role: params.targetRole,
            companyId: params.companyId,
            businessKey: params.businessKey,
        });
        const invitationScope = params.targetRole === 'platform_admin' ? 'platform' : 'company';
        let emailDelivered = false;
        if (params.companyId && invitationScope === 'company') {
            const businessName = await this.usersService
                .getCompanyDisplayName(params.companyId)
                .catch(() => '');
            const eventKey = params.targetRole === 'business_admin'
                ? 'security.company_admin_invitation'
                : 'security.company_user_invitation';
            emailDelivered = await this.commClient.notifyEvent({
                type: 'platform',
                event: eventKey,
                email: params.email,
                data: {
                    firstName: params.firstName,
                    email: params.email,
                    businessName,
                    role: params.targetRole,
                    tempPassword,
                    loginUrl: this.buildLoginUrl(),
                },
            });
        }
        const invitation = await this.createInvitationRecord({
            userId: String(user._id ?? user.id),
            email: params.email,
            firstName: params.firstName,
            lastName: params.lastName,
            role: params.targetRole,
            companyId: params.companyId,
            businessKey: params.businessKey,
            invitedByUserId: params.invitedByUserId,
            invitationScope,
            status: emailDelivered ? 'pending' : 'pending_delivery',
        });
        return {
            userId: String(user._id ?? user.id),
            invitationId: String(invitation._id),
            emailDelivered,
            message: emailDelivered
                ? `User created successfully. Invitation email sent to ${params.email}.`
                : `User created successfully. Invitation email could not be delivered. Please configure the company email provider credentials and try again.`,
        };
    }
    async resendInvitation(invitationId, actor) {
        const invitation = (await this.invitationModel
            .findById(invitationId)
            .lean()
            .exec());
        if (!invitation)
            throw new common_1.NotFoundException('Invitation not found');
        if (invitation.status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot resend a cancelled invitation');
        }
        if (invitation.status === 'accepted') {
            throw new common_1.BadRequestException('Cannot resend — the user has already accepted this invitation');
        }
        if (invitation.status === 'expired' ||
            new Date(invitation.expiresAt) < new Date()) {
            await this.invitationModel.findByIdAndUpdate(invitationId, {
                $set: { status: 'expired' },
            });
            throw new common_1.BadRequestException('This invitation has expired. Please create a new invitation.');
        }
        if (!invitation.userId) {
            throw new common_1.BadRequestException('Invitation has no associated user account');
        }
        if (actor.scope === 'company' &&
            invitation.companyId !== String(actor.companyId)) {
            throw new common_1.ForbiddenException('You can only resend invitations within your company');
        }
        const newTempPassword = await this.usersService.refreshTemporaryPassword(invitation.userId);
        let emailDelivered = false;
        if (invitation.companyId && invitation.invitationScope === 'company') {
            const businessName = await this.usersService
                .getCompanyDisplayName(invitation.companyId)
                .catch(() => '');
            emailDelivered = await this.commClient.notifyEvent({
                type: 'platform',
                event: 'security.company_invitation_resent',
                email: invitation.email,
                data: {
                    firstName: invitation.firstName,
                    email: invitation.email,
                    businessName,
                    role: invitation.role,
                    tempPassword: newTempPassword,
                    loginUrl: this.buildLoginUrl(),
                },
            });
        }
        await this.updateInvitationStatus(invitationId, emailDelivered ? 'pending' : 'pending_delivery');
        return {
            emailDelivered,
            invitationEmail: invitation.email,
            message: emailDelivered
                ? `Invitation resent to ${invitation.email}.`
                : `Could not deliver invitation email. Please configure the company email provider credentials and try again.`,
        };
    }
    async createInvitationRecord(params) {
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        return this.invitationModel.create({
            userId: params.userId,
            email: params.email.toLowerCase().trim(),
            firstName: params.firstName.trim(),
            lastName: params.lastName.trim(),
            role: params.role,
            companyId: params.companyId,
            businessKey: params.businessKey,
            tokenHash,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: params.status,
            invitedByUserId: params.invitedByUserId,
            invitationScope: params.invitationScope,
            senderCredentialScope: params.invitationScope,
        });
    }
    async updateInvitationStatus(invitationId, status) {
        await this.invitationModel.findByIdAndUpdate(invitationId, {
            $set: { status },
        });
    }
    async cancelInvitation(invitationId, actor) {
        const invitation = (await this.invitationModel
            .findById(invitationId)
            .lean()
            .exec());
        if (!invitation)
            throw new common_1.NotFoundException('Invitation not found');
        if (actor.scope === 'company' &&
            invitation.companyId !== String(actor.companyId)) {
            throw new common_1.ForbiddenException('You can only cancel invitations within your company');
        }
        if (invitation.status === 'cancelled') {
            throw new common_1.BadRequestException('Invitation is already cancelled');
        }
        if (invitation.status === 'accepted') {
            throw new common_1.BadRequestException('Cannot cancel an accepted invitation — the user has already set their password');
        }
        if (invitation.status === 'expired') {
            throw new common_1.BadRequestException('Cannot cancel an expired invitation');
        }
        await this.invitationModel.findByIdAndUpdate(invitationId, {
            $set: { status: 'cancelled' },
        });
    }
    async acceptInvitationsByEmail(email) {
        await this.invitationModel.updateMany({
            email: email.toLowerCase().trim(),
            status: { $in: ['pending', 'pending_delivery'] },
        }, { $set: { status: 'accepted' } });
    }
    async listInvitations(actorScope, actorCompanyId) {
        await this.expireStaleInvitations();
        const filter = actorScope === 'global'
            ? { invitationScope: 'platform' }
            : { companyId: actorCompanyId };
        filter['status'] = {
            $in: ['pending', 'pending_delivery', 'expired', 'cancelled'],
        };
        return this.invitationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .lean()
            .exec();
    }
    async getCompanyName(companyId) {
        try {
            const doc = (await this.companyModel
                .findById(companyId)
                .lean()
                .exec());
            return doc?.businessName ?? companyId;
        }
        catch {
            return companyId;
        }
    }
    async handlePasswordCompleted({ email, }) {
        const pending = (await this.invitationModel
            .find({
            email: email.toLowerCase().trim(),
            status: { $in: ['pending', 'pending_delivery'] },
        })
            .lean()
            .exec());
        if (pending.length === 0)
            return;
        await this.invitationModel.updateMany({
            email: email.toLowerCase().trim(),
            status: { $in: ['pending', 'pending_delivery'] },
        }, { $set: { status: 'accepted' } });
        for (const inv of pending) {
            if (inv.companyId && inv.invitationScope === 'company') {
                const businessName = await this.usersService
                    .getCompanyDisplayName(inv.companyId)
                    .catch(() => '');
                this.commClient
                    .notifyEvent({
                    type: 'platform',
                    event: 'security.company_welcome_message',
                    email: inv.email,
                    data: {
                        firstName: inv.firstName,
                        email: inv.email,
                        businessName,
                        role: inv.role,
                        loginUrl: this.buildLoginUrl(),
                    },
                })
                    .catch((err) => {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.warn(`company_welcome_message threw for ${inv.email}: ${msg}`);
                });
            }
        }
    }
    async expireStaleInvitations() {
        await this.invitationModel.updateMany({
            status: { $in: ['pending', 'pending_delivery'] },
            expiresAt: { $lt: new Date() },
        }, { $set: { status: 'expired' } });
    }
    buildLoginUrl() {
        return ((this.config.get('APP_BASE_URL') || 'http://localhost:3000').replace(/\/$/, '') + '/auth/login');
    }
};
exports.UserInvitationsService = UserInvitationsService;
exports.UserInvitationsService = UserInvitationsService = UserInvitationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(invitation_schema_1.Invitation.name)),
    __param(1, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        config_1.ConfigService,
        event_bus_service_1.EventBusService,
        communications_client_service_1.CommunicationsClientService])
], UserInvitationsService);
//# sourceMappingURL=user-invitations.service.js.map