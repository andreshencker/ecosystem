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
var OrganizationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const applications_service_1 = require("../applications/applications.service");
const users_service_1 = require("../users/users.service");
const organization_application_schema_1 = require("./schemas/organization-application.schema");
const organization_invitation_schema_1 = require("./schemas/organization-invitation.schema");
const organization_membership_schema_1 = require("./schemas/organization-membership.schema");
const organization_member_application_schema_1 = require("./schemas/organization-member-application.schema");
const organization_schema_1 = require("./schemas/organization.schema");
let OrganizationsService = OrganizationsService_1 = class OrganizationsService {
    organizations;
    memberships;
    memberApplications;
    organizationApplications;
    invitations;
    users;
    applications;
    config;
    logger = new common_1.Logger(OrganizationsService_1.name);
    constructor(organizations, memberships, memberApplications, organizationApplications, invitations, users, applications, config) {
        this.organizations = organizations;
        this.memberships = memberships;
        this.memberApplications = memberApplications;
        this.organizationApplications = organizationApplications;
        this.invitations = invitations;
        this.users = users;
        this.applications = applications;
        this.config = config;
    }
    async onApplicationBootstrap() {
        await this.memberApplications.updateMany({ role: 'member' }, { $set: { role: 'operator' } });
        const owner = await this.users.findByEmail('grapiflydeveloper@gmail.com');
        if (!owner) {
            this.logger.warn('Official Grapifly organization pending: owner identity not found.');
            return;
        }
        const organizationId = 'gpf_org_grapifly';
        await this.organizations.findOneAndUpdate({ organizationId }, {
            $set: { name: 'Grapifly', slug: 'grapifly', entityType: 'company', isPlatform: true, isDefault: true, status: 'active' },
            $setOnInsert: {
                createdBy: owner.grapiflyUserId,
                legalName: '', tagline: 'Solutions that make ideas fly.', timezone: 'Australia/Sydney',
                officialEmail: owner.email,
            },
        }, { upsert: true, returnDocument: 'after' });
        await this.memberships.findOneAndUpdate({ organizationId, grapiflyUserId: owner.grapiflyUserId }, { $set: { role: 'owner', status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_${(0, crypto_1.randomUUID)().replaceAll('-', '')}` } }, { upsert: true, returnDocument: 'after' });
        await this.enableApplication(owner.grapiflyUserId, organizationId, 'relay');
        this.logger.log('Official Grapifly organization ready (platform=true, owner assigned, Relay enabled).');
    }
    async create(grapiflyUserId, name, entityType = 'company') {
        const normalizedName = name?.trim();
        if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 80) {
            throw new common_1.BadRequestException('Organization name must contain between 2 and 80 characters');
        }
        const organizationId = `gpf_org_${(0, crypto_1.randomUUID)().replaceAll('-', '')}`;
        const slugBase = normalizedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'organization';
        const slug = `${slugBase}-${organizationId.slice(-6)}`;
        if (!['company', 'individual'].includes(entityType))
            throw new common_1.BadRequestException('Organization type must be company or individual');
        const organization = await this.organizations.create({ organizationId, name: normalizedName, slug, entityType, createdBy: grapiflyUserId, status: 'active', isPlatform: false, isDefault: false });
        await this.memberships.create({ membershipId: `gpf_mem_${(0, crypto_1.randomUUID)().replaceAll('-', '')}`, organizationId, grapiflyUserId, role: 'owner', status: 'active' });
        return organization.toObject();
    }
    async listForUser(grapiflyUserId) {
        const memberships = await this.memberships.find({ grapiflyUserId, status: 'active' }).lean();
        const organizationIds = memberships.map((membership) => membership.organizationId);
        const [organizations, applications] = await Promise.all([
            this.organizations.find({ organizationId: { $in: organizationIds }, status: 'active' }).sort({ name: 1 }).lean(),
            this.organizationApplications.find({ organizationId: { $in: organizationIds }, status: 'active' }).lean(),
        ]);
        const membershipByOrganization = new Map(memberships.map((membership) => [membership.organizationId, membership]));
        return organizations.map((organization) => ({
            ...organization,
            membership: membershipByOrganization.get(organization.organizationId),
            applications: applications.filter((app) => app.organizationId === organization.organizationId).map((app) => app.applicationKey),
        }));
    }
    async getDetails(grapiflyUserId, organizationId) {
        const membership = await this.requireMembership(grapiflyUserId, organizationId);
        await this.invitations.updateMany({ organizationId, status: 'pending', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });
        const [organization, memberships, applications, memberApplications, invitations] = await Promise.all([
            this.organizations.findOne({ organizationId, status: 'active' }).lean(),
            this.memberships.find({ organizationId, status: 'active' }).lean(),
            this.organizationApplications.find({ organizationId, status: 'active' }).lean(),
            this.memberApplications.find({ organizationId, status: 'active' }).lean(),
            membership.role === 'member'
                ? Promise.resolve([])
                : this.invitations
                    .find({ organizationId, status: { $in: ['pending', 'expired'] } })
                    .select('-tokenHash')
                    .lean(),
        ]);
        if (!organization)
            throw new common_1.NotFoundException('Organization not found');
        const users = await Promise.all(memberships.map((item) => this.users.findByGrapiflyUserId(item.grapiflyUserId)));
        return {
            organization,
            membership,
            applications,
            members: memberships.map((item, index) => ({
                ...item,
                user: users[index],
                applications: memberApplications.filter((access) => access.grapiflyUserId === item.grapiflyUserId),
            })),
            invitations,
        };
    }
    async enableApplication(grapiflyUserId, organizationId, applicationKey) {
        await this.requireManager(grapiflyUserId, organizationId);
        const application = await this.applications.findByKey(applicationKey);
        if (!application)
            throw new common_1.BadRequestException('Application is not available');
        const enabled = await this.organizationApplications.findOneAndUpdate({ organizationId, applicationKey: application.key }, { $set: { status: 'active', enabledBy: grapiflyUserId } }, { upsert: true, returnDocument: 'after' }).lean();
        const manager = await this.requireMembership(grapiflyUserId, organizationId);
        await this.memberApplications.findOneAndUpdate({ organizationId, grapiflyUserId, applicationKey: application.key }, { $set: { status: 'active', role: manager.role === 'owner' ? 'owner' : 'admin' } }, { upsert: true, returnDocument: 'after' });
        return enabled;
    }
    async updateProfile(grapiflyUserId, organizationId, input) {
        await this.requireManager(grapiflyUserId, organizationId);
        const entityType = input.entityType;
        if (entityType !== undefined && entityType !== 'company' && entityType !== 'individual') {
            throw new common_1.BadRequestException('Organization type must be company or individual');
        }
        const limits = {
            name: 80, legalName: 200, tagline: 300, timezone: 100,
            officialEmail: 200, supportEmail: 200, supportPhone: 40, supportPhoneCountryCode: 5, supportPhoneNumber: 30, supportHours: 200,
            addressLine1: 200, addressLine2: 200, addressCity: 100, addressState: 100, addressPostalCode: 20, addressCountry: 100,
            websiteUrl: 500, apiBaseUrl: 500, helpCenterUrl: 500, privacyPolicyUrl: 500, termsUrl: 500, unsubscribeUrl: 500,
            facebook: 500, instagram: 500, linkedin: 500, x: 500, youtube: 500, tiktok: 500, whatsapp: 500, telegram: 500,
            copyrightText: 500, disclaimerShort: 500, disclaimerLong: 2000, logoIconUrl: 500, logoFullUrl: 500,
        };
        const updates = {};
        if (entityType)
            updates.entityType = entityType;
        for (const [field, maxLength] of Object.entries(limits)) {
            if (!(field in input))
                continue;
            if (typeof input[field] !== 'string')
                throw new common_1.BadRequestException(`${field} must be text`);
            const value = input[field].trim();
            if (value.length > maxLength)
                throw new common_1.BadRequestException(`${field} exceeds ${maxLength} characters`);
            updates[field] = value;
        }
        if ('name' in updates && updates.name.length < 2)
            throw new common_1.BadRequestException('Organization name must contain at least 2 characters');
        for (const field of ['officialEmail', 'supportEmail']) {
            if (updates[field] && !/^\S+@\S+\.\S+$/.test(updates[field]))
                throw new common_1.BadRequestException(`${field} must be a valid email`);
            if (updates[field])
                updates[field] = updates[field].toLowerCase();
        }
        if (updates.supportPhoneCountryCode && !/^\+[1-9]\d{0,3}$/.test(updates.supportPhoneCountryCode)) {
            throw new common_1.BadRequestException('supportPhoneCountryCode must use international format, for example +61');
        }
        if (updates.supportPhoneNumber && !/^[0-9 ()-]{6,30}$/.test(updates.supportPhoneNumber)) {
            throw new common_1.BadRequestException('supportPhoneNumber contains invalid characters');
        }
        if ('supportPhoneCountryCode' in updates || 'supportPhoneNumber' in updates) {
            updates.supportPhone = [updates.supportPhoneCountryCode ?? '', updates.supportPhoneNumber ?? ''].filter(Boolean).join(' ');
        }
        for (const field of ['websiteUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'unsubscribeUrl', 'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram', 'logoIconUrl', 'logoFullUrl']) {
            if (!updates[field])
                continue;
            try {
                new URL(updates[field]);
            }
            catch {
                throw new common_1.BadRequestException(`${field} must be a valid URL`);
            }
        }
        return this.organizations.findOneAndUpdate({ organizationId, status: 'active' }, { $set: updates }, { returnDocument: 'after' }).lean();
    }
    async getApplicationOrganization(grapiflyUserId, organizationId, applicationKey) {
        await this.requireApplicationAccess(grapiflyUserId, organizationId, applicationKey);
        const organization = await this.organizations
            .findOne({ organizationId, status: 'active' })
            .lean();
        if (!organization)
            throw new common_1.NotFoundException('Organization not found');
        return organization;
    }
    async updateApplicationOrganization(grapiflyUserId, organizationId, applicationKey, input) {
        await this.requireApplicationAccess(grapiflyUserId, organizationId, applicationKey);
        return this.updateProfile(grapiflyUserId, organizationId, input);
    }
    async archive(grapiflyUserId, organizationId) {
        const membership = await this.requireMembership(grapiflyUserId, organizationId);
        if (membership.role !== 'owner')
            throw new common_1.ForbiddenException('Only the organization owner can archive it');
        const organization = await this.organizations.findOne({ organizationId, status: 'active' }).lean();
        if (!organization)
            throw new common_1.NotFoundException('Organization not found');
        if (organization.isPlatform)
            throw new common_1.BadRequestException('The platform organization cannot be archived');
        if (organization.isDefault)
            throw new common_1.BadRequestException('The default organization cannot be archived');
        await Promise.all([
            this.organizations.updateOne({ organizationId }, { $set: { status: 'archived' } }),
            this.organizationApplications.updateMany({ organizationId }, { $set: { status: 'suspended' } }),
            this.memberApplications.updateMany({ organizationId }, { $set: { status: 'revoked' } }),
            this.invitations.updateMany({ organizationId, status: 'pending' }, { $set: { status: 'cancelled' } }),
        ]);
        return { organizationId, status: 'archived' };
    }
    async invite(grapiflyUserId, organizationId, input) {
        await this.requireManager(grapiflyUserId, organizationId);
        const email = input.email?.trim().toLowerCase();
        if (!email || !/^\S+@\S+\.\S+$/.test(email))
            throw new common_1.BadRequestException('A valid email is required');
        const role = input.role === 'admin' ? 'admin' : 'member';
        const applicationKeys = [...new Set((input.applicationKeys ?? []).map((key) => key.trim().toLowerCase()).filter(Boolean))];
        const applicationRoles = {};
        for (const key of applicationKeys) {
            const enabled = await this.organizationApplications.exists({ organizationId, applicationKey: key, status: 'active' });
            if (!enabled)
                throw new common_1.BadRequestException(`Application ${key} is not enabled for this organization`);
            const requestedRole = input.applicationRoles?.[key];
            applicationRoles[key] = this.normalizeInvitableApplicationRole(requestedRole ?? (role === 'admin' ? 'admin' : 'viewer'));
        }
        const existingUser = await this.users.findByEmail(email);
        if (existingUser && await this.memberships.exists({ organizationId, grapiflyUserId: existingUser.grapiflyUserId, status: 'active' })) {
            await Promise.all(applicationKeys.map((applicationKey) => this.memberApplications.findOneAndUpdate({ organizationId, grapiflyUserId: existingUser.grapiflyUserId, applicationKey }, { $set: { role: applicationRoles[applicationKey], status: 'active' } }, { upsert: true, returnDocument: 'after' })));
            return { invitation: null, token: null, accessGranted: true, grapiflyUserId: existingUser.grapiflyUserId, email };
        }
        await this.invitations.updateMany({ organizationId, email, status: 'pending' }, { $set: { status: 'cancelled' } });
        const token = (0, crypto_1.randomBytes)(32).toString('base64url');
        const invitation = await this.invitations.create({
            invitationId: `gpf_inv_${(0, crypto_1.randomUUID)().replaceAll('-', '')}`,
            organizationId,
            email,
            role,
            applicationKeys,
            applicationRoles,
            tokenHash: this.hash(token),
            invitedBy: grapiflyUserId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            acceptedAt: null,
        });
        return { invitation: { ...invitation.toObject(), tokenHash: undefined }, token };
    }
    async regenerateInvitation(grapiflyUserId, organizationId, invitationId) {
        await this.requireManager(grapiflyUserId, organizationId);
        const invitation = await this.invitations
            .findOne({
            invitationId,
            organizationId,
            status: { $in: ['pending', 'expired'] },
        })
            .select('+tokenHash');
        if (!invitation) {
            throw new common_1.NotFoundException('Pending invitation not found');
        }
        const token = (0, crypto_1.randomBytes)(32).toString('base64url');
        invitation.tokenHash = this.hash(token);
        invitation.status = 'pending';
        invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        invitation.acceptedAt = null;
        await invitation.save();
        return {
            invitation: { ...invitation.toObject(), tokenHash: undefined },
            token,
        };
    }
    async cancelInvitation(grapiflyUserId, organizationId, invitationId) {
        await this.requireManager(grapiflyUserId, organizationId);
        const invitation = await this.invitations.findOneAndUpdate({ invitationId, organizationId, status: 'pending' }, { $set: { status: 'cancelled' } }, { returnDocument: 'after' }).lean();
        if (!invitation) {
            throw new common_1.NotFoundException('Pending invitation not found');
        }
        return { invitationId, status: 'cancelled' };
    }
    async accept(grapiflyUserId, token) {
        const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
        if (!user)
            throw new common_1.ForbiddenException('Active Grapifly identity required');
        const invitation = await this.invitations.findOne({ tokenHash: this.hash(token), status: 'pending' }).select('+tokenHash');
        if (!invitation || invitation.expiresAt <= new Date())
            throw new common_1.BadRequestException('Invitation is invalid or expired');
        if (invitation.email !== user.email.toLowerCase())
            throw new common_1.ForbiddenException('This invitation belongs to another email address');
        await this.memberships.findOneAndUpdate({ organizationId: invitation.organizationId, grapiflyUserId }, { $set: { role: invitation.role, status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_${(0, crypto_1.randomUUID)().replaceAll('-', '')}` } }, { upsert: true, returnDocument: 'after' });
        await Promise.all(invitation.applicationKeys.map((applicationKey) => this.memberApplications.findOneAndUpdate({ organizationId: invitation.organizationId, grapiflyUserId, applicationKey }, { $set: { role: this.invitationApplicationRole(invitation, applicationKey), status: 'active' } }, { upsert: true, returnDocument: 'after' })));
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();
        return { organizationId: invitation.organizationId, applicationKeys: invitation.applicationKeys };
    }
    async requireMembership(grapiflyUserId, organizationId) {
        const membership = await this.memberships.findOne({ organizationId, grapiflyUserId, status: 'active' }).lean();
        if (!membership)
            throw new common_1.ForbiddenException('Organization access required');
        return membership;
    }
    async requireManager(grapiflyUserId, organizationId) {
        const membership = await this.requireMembership(grapiflyUserId, organizationId);
        if (!['owner', 'admin'].includes(membership.role))
            throw new common_1.ForbiddenException('Organization administrator access required');
        return membership;
    }
    async requireApplicationAccess(grapiflyUserId, organizationId, applicationKey) {
        await this.requireMembership(grapiflyUserId, organizationId);
        const [organizationApplication, memberApplication] = await Promise.all([
            this.organizationApplications.exists({
                organizationId,
                applicationKey,
                status: 'active',
            }),
            this.memberApplications.exists({
                organizationId,
                grapiflyUserId,
                applicationKey,
                status: 'active',
            }),
        ]);
        if (!organizationApplication || !memberApplication) {
            throw new common_1.ForbiddenException(`${applicationKey} access is not enabled for this organization`);
        }
    }
    assertRelayClient(candidate) {
        const expected = this.config.get('GRAPIFLY_SSO_CLIENT_SECRET');
        if (!candidate || !expected)
            throw new common_1.ForbiddenException('Invalid Grapifly application client');
        const actualBuffer = Buffer.from(candidate);
        const expectedBuffer = Buffer.from(expected);
        if (actualBuffer.length !== expectedBuffer.length || !(0, crypto_1.timingSafeEqual)(actualBuffer, expectedBuffer)) {
            throw new common_1.ForbiddenException('Invalid Grapifly application client');
        }
    }
    async getApplicationTeam(grapiflyUserId, organizationId, applicationKey) {
        await this.requireMembership(grapiflyUserId, organizationId);
        const enabled = await this.organizationApplications.exists({ organizationId, applicationKey, status: 'active' });
        if (!enabled)
            throw new common_1.BadRequestException(`${applicationKey} is not enabled for this organization`);
        await this.invitations.updateMany({ organizationId, status: 'pending', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });
        const [memberships, accesses, invitations] = await Promise.all([
            this.memberships.find({ organizationId, status: 'active' }).lean(),
            this.memberApplications.find({ organizationId, applicationKey, status: { $in: ['active', 'suspended'] } }).lean(),
            this.invitations.find({ organizationId, applicationKeys: applicationKey, status: { $in: ['pending', 'expired'] } }).select('-tokenHash').lean(),
        ]);
        const accessByUser = new Map(accesses.map((access) => [access.grapiflyUserId, access]));
        const members = await Promise.all(memberships.map(async (membership) => {
            const access = accessByUser.get(membership.grapiflyUserId);
            if (!access)
                return null;
            return { membership, access, user: await this.users.findByGrapiflyUserId(membership.grapiflyUserId) };
        }));
        return { members: members.filter(Boolean), invitations };
    }
    async updateApplicationMember(actorUserId, organizationId, applicationKey, targetUserId, input) {
        const actor = await this.requireManager(actorUserId, organizationId);
        const targetMembership = await this.requireMembership(targetUserId, organizationId);
        if (targetMembership.role === 'owner' && actor.role !== 'owner') {
            throw new common_1.ForbiddenException('Only the organization owner can manage owner access');
        }
        const updates = {};
        if (input.role !== undefined)
            updates.role = this.normalizeApplicationRole(input.role);
        if (input.status !== undefined) {
            if (!['active', 'suspended', 'revoked'].includes(input.status))
                throw new common_1.BadRequestException('Invalid application access status');
            if (targetMembership.role === 'owner' && input.status !== 'active')
                throw new common_1.BadRequestException('Owner application access cannot be revoked');
            updates.status = input.status;
        }
        if (!Object.keys(updates).length)
            throw new common_1.BadRequestException('No application access changes supplied');
        const access = await this.memberApplications.findOneAndUpdate({ organizationId, grapiflyUserId: targetUserId, applicationKey }, { $set: updates }, { returnDocument: 'after' }).lean();
        if (!access)
            throw new common_1.NotFoundException('Application member access not found');
        return access;
    }
    normalizeApplicationRole(role) {
        if (!['owner', 'admin', 'operator', 'viewer'].includes(role))
            throw new common_1.BadRequestException('Invalid application role');
        return role;
    }
    normalizeInvitableApplicationRole(role) {
        if (!['admin', 'operator', 'viewer'].includes(role))
            throw new common_1.BadRequestException('Invitations cannot grant this application role');
        return role;
    }
    invitationApplicationRole(invitation, applicationKey) {
        const configured = invitation.applicationRoles?.[applicationKey];
        if (configured)
            return this.normalizeApplicationRole(configured);
        return invitation.role === 'admin' ? 'admin' : 'viewer';
    }
    hash(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = OrganizationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(organization_schema_1.Organization.name)),
    __param(1, (0, mongoose_1.InjectModel)(organization_membership_schema_1.OrganizationMembership.name)),
    __param(2, (0, mongoose_1.InjectModel)(organization_member_application_schema_1.OrganizationMemberApplication.name)),
    __param(3, (0, mongoose_1.InjectModel)(organization_application_schema_1.OrganizationApplication.name)),
    __param(4, (0, mongoose_1.InjectModel)(organization_invitation_schema_1.OrganizationInvitation.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        applications_service_1.ApplicationsService,
        config_1.ConfigService])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map