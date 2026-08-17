import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { GoogleIdentity, UsersService } from '../users/users.service';
import { SsoCodeDocument } from './schemas/sso-code.schema';
import { OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMembershipDocument } from '../organizations/schemas/organization-membership.schema';
import { OrganizationApplicationDocument } from '../organizations/schemas/organization-application.schema';
import { OrganizationMemberApplicationDocument } from '../organizations/schemas/organization-member-application.schema';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    private readonly config;
    private readonly ssoCodes;
    private readonly organizations;
    private readonly memberships;
    private readonly organizationApps;
    private readonly memberApps;
    constructor(users: UsersService, jwt: JwtService, config: ConfigService, ssoCodes: Model<SsoCodeDocument>, organizations: Model<OrganizationDocument>, memberships: Model<OrganizationMembershipDocument>, organizationApps: Model<OrganizationApplicationDocument>, memberApps: Model<OrganizationMemberApplicationDocument>);
    loginWithGoogle(identity: GoogleIdentity): Promise<{
        user: import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        sessionToken: string;
    }>;
    getUser(grapiflyUserId: string): Promise<(import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    resolveSession(token: string | undefined): Promise<{
        sub: string;
        type: "session";
    } | null>;
    createRelaySsoCode(grapiflyUserId: string, requestedOrganizationId?: string): Promise<string>;
    exchangeSsoCode(code: string, appKey: string, clientSecret: string | undefined): Promise<{
        contractVersion: 2;
        issuer: "grapifly";
        audience: "relay";
        grapiflyUserId: string;
        email: string;
        emailVerified: boolean;
        displayName: string;
        avatarUrl: string | null;
        organization: {
            organizationId: string;
            name: string;
            slug: string;
            entityType: "company" | "individual";
            legalName: string;
            tagline: string;
            timezone: string;
            officialEmail: string;
            supportEmail: string;
            supportPhone: string;
            supportPhoneCountryCode: string;
            supportPhoneNumber: string;
            supportHours: string;
            addressLine1: string;
            addressLine2: string;
            addressCity: string;
            addressState: string;
            addressPostalCode: string;
            addressCountry: string;
            websiteUrl: string;
            apiBaseUrl: string;
            helpCenterUrl: string;
            privacyPolicyUrl: string;
            termsUrl: string;
            unsubscribeUrl: string;
            facebook: string;
            instagram: string;
            linkedin: string;
            x: string;
            youtube: string;
            tiktok: string;
            whatsapp: string;
            telegram: string;
            copyrightText: string;
            disclaimerShort: string;
            disclaimerLong: string;
            logoIconUrl: string;
            logoFullUrl: string;
            isPlatform: boolean;
            isDefault: boolean;
            status: "active" | "suspended" | "archived";
        };
        access: {
            organizationRole: "owner" | "admin" | "member";
            applicationRole: import("../organizations/schemas/organization-member-application.schema").ApplicationMemberRole;
            permissions: string[];
        };
    }>;
    private toRelayOrganization;
    private resolveRelayAccess;
    private relayPermissions;
    private hash;
    private validClientSecret;
}
