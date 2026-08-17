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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
const organization_schema_1 = require("../organizations/schemas/organization.schema");
const organization_membership_schema_1 = require("../organizations/schemas/organization-membership.schema");
const organization_application_schema_1 = require("../organizations/schemas/organization-application.schema");
const organization_member_application_schema_1 = require("../organizations/schemas/organization-member-application.schema");
let UsersService = UsersService_1 = class UsersService {
    users;
    organizations;
    memberships;
    organizationApplications;
    memberApplications;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(users, organizations, memberships, organizationApplications, memberApplications) {
        this.users = users;
        this.organizations = organizations;
        this.memberships = memberships;
        this.organizationApplications = organizationApplications;
        this.memberApplications = memberApplications;
    }
    async onApplicationBootstrap() {
        const users = await this.users.find({ isActive: true, email: { $ne: 'grapiflydeveloper@gmail.com' } }).lean();
        await Promise.all(users.map((user) => this.ensureDefaultOrganization(user.grapiflyUserId, user.displayName, user.email)));
        this.logger.log(`Default organization provisioning ready (${users.length} user accounts checked).`);
    }
    async upsertGoogleIdentity(identity) {
        const user = await this.users.findOneAndUpdate({ provider: 'google', providerSubject: identity.subject }, {
            $set: {
                email: identity.email.toLowerCase(),
                emailVerified: identity.emailVerified,
                displayName: identity.displayName,
                avatarUrl: identity.avatarUrl,
                lastLoginAt: new Date(),
            },
            $setOnInsert: {
                grapiflyUserId: `gpf_usr_${(0, crypto_1.randomUUID)().replaceAll('-', '')}`,
                provider: 'google',
                providerSubject: identity.subject,
                isActive: true,
            },
        }, { upsert: true, new: true }).lean();
        await this.ensureDefaultOrganization(user.grapiflyUserId, user.displayName, user.email);
        return user;
    }
    async ensureDefaultOrganization(grapiflyUserId, displayName, email) {
        const existing = await this.organizations.findOne({ createdBy: grapiflyUserId, isDefault: true }).lean();
        const suffix = grapiflyUserId.replace('gpf_usr_', '').slice(-12);
        const organizationId = existing?.organizationId ?? `gpf_org_default_${suffix}`;
        if (!existing) {
            await this.organizations.findOneAndUpdate({ organizationId }, {
                $set: { status: 'active', isDefault: true },
                $setOnInsert: {
                    name: displayName?.trim() ? `${displayName.trim()}'s workspace` : 'My workspace',
                    slug: `personal-${suffix}`,
                    entityType: 'individual',
                    createdBy: grapiflyUserId,
                    officialEmail: email,
                    isPlatform: false,
                },
            }, { upsert: true, returnDocument: 'after' });
        }
        await this.memberships.findOneAndUpdate({ organizationId, grapiflyUserId }, { $set: { role: 'owner', status: 'active' }, $setOnInsert: { membershipId: `gpf_mem_default_${suffix}` } }, { upsert: true, returnDocument: 'after' });
        await this.organizationApplications.findOneAndUpdate({ organizationId, applicationKey: 'relay' }, { $set: { status: 'active', enabledBy: grapiflyUserId } }, { upsert: true, returnDocument: 'after' });
        await this.memberApplications.findOneAndUpdate({ organizationId, grapiflyUserId, applicationKey: 'relay' }, { $set: { role: 'owner', status: 'active' } }, { upsert: true, returnDocument: 'after' });
    }
    findByGrapiflyUserId(grapiflyUserId) {
        return this.users.findOne({ grapiflyUserId, isActive: true }).lean();
    }
    findByEmail(email) {
        return this.users.findOne({ email: email.toLowerCase().trim(), isActive: true }).lean();
    }
    listAll() {
        return this.users
            .find()
            .select('grapiflyUserId email emailVerified displayName avatarUrl isActive provider lastLoginAt createdAt')
            .sort({ createdAt: -1 })
            .lean();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.GrapiflyUser.name)),
    __param(1, (0, mongoose_1.InjectModel)(organization_schema_1.Organization.name)),
    __param(2, (0, mongoose_1.InjectModel)(organization_membership_schema_1.OrganizationMembership.name)),
    __param(3, (0, mongoose_1.InjectModel)(organization_application_schema_1.OrganizationApplication.name)),
    __param(4, (0, mongoose_1.InjectModel)(organization_member_application_schema_1.OrganizationMemberApplication.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map