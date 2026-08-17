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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const sso_code_schema_1 = require("./schemas/sso-code.schema");
const organization_schema_1 = require("../organizations/schemas/organization.schema");
const organization_membership_schema_1 = require("../organizations/schemas/organization-membership.schema");
const organization_application_schema_1 = require("../organizations/schemas/organization-application.schema");
const organization_member_application_schema_1 = require("../organizations/schemas/organization-member-application.schema");
let AuthService = class AuthService {
    users;
    jwt;
    config;
    ssoCodes;
    organizations;
    memberships;
    organizationApps;
    memberApps;
    constructor(users, jwt, config, ssoCodes, organizations, memberships, organizationApps, memberApps) {
        this.users = users;
        this.jwt = jwt;
        this.config = config;
        this.ssoCodes = ssoCodes;
        this.organizations = organizations;
        this.memberships = memberships;
        this.organizationApps = organizationApps;
        this.memberApps = memberApps;
    }
    async loginWithGoogle(identity) {
        if (!identity.emailVerified)
            throw new common_1.UnauthorizedException('Google email must be verified');
        const user = await this.users.upsertGoogleIdentity(identity);
        const sessionToken = await this.jwt.signAsync({ sub: user.grapiflyUserId, type: 'session' });
        return { user, sessionToken };
    }
    async getUser(grapiflyUserId) {
        return this.users.findByGrapiflyUserId(grapiflyUserId);
    }
    async resolveSession(token) {
        if (!token)
            return null;
        try {
            const payload = await this.jwt.verifyAsync(token);
            return payload.type === 'session' ? payload : null;
        }
        catch {
            return null;
        }
    }
    async createRelaySsoCode(grapiflyUserId, requestedOrganizationId) {
        const user = await this.users.findByGrapiflyUserId(grapiflyUserId);
        if (!user)
            throw new common_1.UnauthorizedException('Grapifly account is inactive');
        const access = await this.resolveRelayAccess(grapiflyUserId, requestedOrganizationId);
        const code = (0, crypto_1.randomBytes)(32).toString('base64url');
        await this.ssoCodes.create({
            codeHash: this.hash(code),
            grapiflyUserId,
            appKey: 'relay',
            organizationId: access.organization.organizationId,
            expiresAt: new Date(Date.now() + 60_000),
        });
        return code;
    }
    async exchangeSsoCode(code, appKey, clientSecret) {
        if (appKey !== 'relay' || !this.validClientSecret(clientSecret)) {
            throw new common_1.UnauthorizedException('Invalid SSO client');
        }
        const now = new Date();
        const grant = await this.ssoCodes.findOneAndUpdate({ codeHash: this.hash(code), appKey: 'relay', consumedAt: null, expiresAt: { $gt: now } }, { $set: { consumedAt: now } }, { new: true }).lean();
        if (!grant)
            throw new common_1.UnauthorizedException('Invalid or expired SSO code');
        const user = await this.users.findByGrapiflyUserId(grant.grapiflyUserId);
        if (!user)
            throw new common_1.UnauthorizedException('Grapifly account is inactive');
        const access = await this.resolveRelayAccess(grant.grapiflyUserId, grant.organizationId);
        return {
            contractVersion: 2,
            issuer: 'grapifly',
            audience: 'relay',
            grapiflyUserId: user.grapiflyUserId,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            organization: this.toRelayOrganization(access.organization),
            access: {
                organizationRole: access.membership.role,
                applicationRole: access.memberApp.role,
                permissions: this.relayPermissions(access.memberApp.role),
            },
        };
    }
    toRelayOrganization(organization) {
        return {
            organizationId: organization.organizationId,
            name: organization.name,
            slug: organization.slug,
            entityType: organization.entityType,
            legalName: organization.legalName,
            tagline: organization.tagline,
            timezone: organization.timezone,
            officialEmail: organization.officialEmail,
            supportEmail: organization.supportEmail,
            supportPhone: organization.supportPhone,
            supportPhoneCountryCode: organization.supportPhoneCountryCode,
            supportPhoneNumber: organization.supportPhoneNumber,
            supportHours: organization.supportHours,
            addressLine1: organization.addressLine1,
            addressLine2: organization.addressLine2,
            addressCity: organization.addressCity,
            addressState: organization.addressState,
            addressPostalCode: organization.addressPostalCode,
            addressCountry: organization.addressCountry,
            websiteUrl: organization.websiteUrl,
            apiBaseUrl: organization.apiBaseUrl,
            helpCenterUrl: organization.helpCenterUrl,
            privacyPolicyUrl: organization.privacyPolicyUrl,
            termsUrl: organization.termsUrl,
            unsubscribeUrl: organization.unsubscribeUrl,
            facebook: organization.facebook,
            instagram: organization.instagram,
            linkedin: organization.linkedin,
            x: organization.x,
            youtube: organization.youtube,
            tiktok: organization.tiktok,
            whatsapp: organization.whatsapp,
            telegram: organization.telegram,
            copyrightText: organization.copyrightText,
            disclaimerShort: organization.disclaimerShort,
            disclaimerLong: organization.disclaimerLong,
            logoIconUrl: organization.logoIconUrl,
            logoFullUrl: organization.logoFullUrl,
            isPlatform: organization.isPlatform,
            isDefault: organization.isDefault,
            status: organization.status,
        };
    }
    async resolveRelayAccess(grapiflyUserId, requestedOrganizationId) {
        const memberships = await this.memberships.find({
            grapiflyUserId,
            status: 'active',
            ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : {}),
        }).lean();
        const organizations = await this.organizations.find({
            organizationId: { $in: memberships.map((membership) => membership.organizationId) },
            status: 'active',
        }).sort({ isDefault: -1, isPlatform: -1, createdAt: 1 }).lean();
        const membershipByOrganization = new Map(memberships.map((membership) => [membership.organizationId, membership]));
        for (const organization of organizations) {
            const membership = membershipByOrganization.get(organization.organizationId);
            const [organizationApp, memberApp] = await Promise.all([
                this.organizationApps.findOne({ organizationId: membership.organizationId, applicationKey: 'relay', status: 'active' }).lean(),
                this.memberApps.findOne({ organizationId: membership.organizationId, grapiflyUserId, applicationKey: 'relay', status: 'active' }).lean(),
            ]);
            if (organizationApp && memberApp) {
                return { organization, membership, memberApp };
            }
        }
        throw new common_1.ForbiddenException('Relay access is not enabled for this organization');
    }
    relayPermissions(role) {
        const base = ['relay.use'];
        if (role === 'viewer')
            return base;
        if (role === 'operator')
            return [...base, 'relay.execute'];
        const management = [
            'relay.connections.manage',
            'relay.credentials.manage',
            'relay.automations.manage',
            'relay.theme.manage',
        ];
        return role === 'owner' ? [...base, ...management, 'relay.members.manage', 'relay.organization.manage'] : [...base, ...management, 'relay.members.manage'];
    }
    hash(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    validClientSecret(candidate) {
        const expected = this.config.get('GRAPIFLY_SSO_CLIENT_SECRET');
        if (!candidate || !expected)
            return false;
        const a = Buffer.from(candidate);
        const b = Buffer.from(expected);
        return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, mongoose_1.InjectModel)(sso_code_schema_1.SsoCode.name)),
    __param(4, (0, mongoose_1.InjectModel)(organization_schema_1.Organization.name)),
    __param(5, (0, mongoose_1.InjectModel)(organization_membership_schema_1.OrganizationMembership.name)),
    __param(6, (0, mongoose_1.InjectModel)(organization_application_schema_1.OrganizationApplication.name)),
    __param(7, (0, mongoose_1.InjectModel)(organization_member_application_schema_1.OrganizationMemberApplication.name)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AuthService);
//# sourceMappingURL=auth.service.js.map