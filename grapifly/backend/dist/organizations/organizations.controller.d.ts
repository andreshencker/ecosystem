import { SessionRequest } from '../auth/session.guard';
import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private readonly organizations;
    constructor(organizations: OrganizationsService);
    list(request: SessionRequest): Promise<{
        organizations: {
            membership: (import("mongoose").Document<unknown, {}, import("./schemas/organization-membership.schema").OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-membership.schema").OrganizationMembership & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>) | undefined;
            applications: string[];
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            organizationId: string;
            name: string;
            slug: string;
            createdBy: string;
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
            __v: number;
            id: string;
        }[];
    }>;
    create(request: SessionRequest, body: {
        name: string;
        entityType?: 'company' | 'individual';
    }): Promise<import("mongoose").Document<unknown, {}, import("./schemas/organization.schema").Organization, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization.schema").Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    details(request: SessionRequest, organizationId: string): Promise<{
        organization: import("mongoose").Document<unknown, {}, import("./schemas/organization.schema").Organization, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization.schema").Organization & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        membership: import("mongoose").Document<unknown, {}, import("./schemas/organization-membership.schema").OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-membership.schema").OrganizationMembership & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        applications: (import("mongoose").Document<unknown, {}, import("./schemas/organization-application.schema").OrganizationApplication, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-application.schema").OrganizationApplication & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        members: {
            user: (import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>) | null;
            applications: (import("mongoose").Document<unknown, {}, import("./schemas/organization-member-application.schema").OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-member-application.schema").OrganizationMemberApplication & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>)[];
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            membershipId: string;
            organizationId: string;
            grapiflyUserId: string;
            role: "owner" | "admin" | "member";
            status: "active" | "suspended" | "revoked";
            __v: number;
            id: string;
        }[];
        invitations: never[] | (import("mongoose").Document<unknown, {}, import("./schemas/organization-invitation.schema").OrganizationInvitation, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-invitation.schema").OrganizationInvitation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    update(request: SessionRequest, organizationId: string, body: Record<string, unknown>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/organization.schema").Organization, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization.schema").Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    archive(request: SessionRequest, organizationId: string): Promise<{
        organizationId: string;
        status: string;
    }>;
    enableApplication(request: SessionRequest, organizationId: string, body: {
        applicationKey: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schemas/organization-application.schema").OrganizationApplication, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-application.schema").OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    invite(request: SessionRequest, organizationId: string, body: {
        email: string;
        role?: string;
        applicationKeys?: string[];
        applicationRoles?: Record<string, string>;
    }): Promise<{
        invitation: null;
        token: null;
        accessGranted: boolean;
        grapiflyUserId: string;
        email: string;
    } | {
        invitation: {
            tokenHash: undefined;
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            invitationId: string;
            organizationId: string;
            email: string;
            role: "admin" | "member";
            applicationKeys: string[];
            applicationRoles: Record<string, "admin" | "operator" | "viewer">;
            invitedBy: string;
            status: "pending" | "accepted" | "cancelled" | "expired";
            expiresAt: Date;
            acceptedAt: Date | null;
            __v: number;
            id: string;
        };
        token: string;
        accessGranted?: undefined;
        grapiflyUserId?: undefined;
        email?: undefined;
    }>;
    regenerateInvitation(request: SessionRequest, organizationId: string, invitationId: string): Promise<{
        invitation: {
            tokenHash: undefined;
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            isNew: boolean;
            schema: import("mongoose").Schema;
            invitationId: string;
            organizationId: string;
            email: string;
            role: "admin" | "member";
            applicationKeys: string[];
            applicationRoles: Record<string, "admin" | "operator" | "viewer">;
            invitedBy: string;
            status: "pending" | "accepted" | "cancelled" | "expired";
            expiresAt: Date;
            acceptedAt: Date | null;
            __v: number;
            id: string;
        };
        token: string;
    }>;
    cancelInvitation(request: SessionRequest, organizationId: string, invitationId: string): Promise<{
        invitationId: string;
        status: string;
    }>;
    accept(request: SessionRequest, token: string): Promise<{
        organizationId: string;
        applicationKeys: string[];
    }>;
}
