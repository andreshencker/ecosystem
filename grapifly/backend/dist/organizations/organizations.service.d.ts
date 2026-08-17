import { OnApplicationBootstrap } from '@nestjs/common';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ApplicationsService } from '../applications/applications.service';
import { UsersService } from '../users/users.service';
import { OrganizationApplication, OrganizationApplicationDocument } from './schemas/organization-application.schema';
import { OrganizationInvitation, OrganizationInvitationDocument } from './schemas/organization-invitation.schema';
import { OrganizationMembership, OrganizationMembershipDocument } from './schemas/organization-membership.schema';
import { OrganizationMemberApplication, OrganizationMemberApplicationDocument } from './schemas/organization-member-application.schema';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
export declare class OrganizationsService implements OnApplicationBootstrap {
    private readonly organizations;
    private readonly memberships;
    private readonly memberApplications;
    private readonly organizationApplications;
    private readonly invitations;
    private readonly users;
    private readonly applications;
    private readonly config;
    private readonly logger;
    constructor(organizations: Model<OrganizationDocument>, memberships: Model<OrganizationMembershipDocument>, memberApplications: Model<OrganizationMemberApplicationDocument>, organizationApplications: Model<OrganizationApplicationDocument>, invitations: Model<OrganizationInvitationDocument>, users: UsersService, applications: ApplicationsService, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    create(grapiflyUserId: string, name: string, entityType?: 'company' | 'individual'): Promise<import("mongoose").Document<unknown, {}, Organization, {}, import("mongoose").DefaultSchemaOptions> & Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    listForUser(grapiflyUserId: string): Promise<{
        membership: (import("mongoose").Document<unknown, {}, OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMembership & {
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
    }[]>;
    getDetails(grapiflyUserId: string, organizationId: string): Promise<{
        organization: import("mongoose").Document<unknown, {}, Organization, {}, import("mongoose").DefaultSchemaOptions> & Organization & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        membership: import("mongoose").Document<unknown, {}, OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMembership & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        applications: (import("mongoose").Document<unknown, {}, OrganizationApplication, {}, import("mongoose").DefaultSchemaOptions> & OrganizationApplication & {
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
            applications: (import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMemberApplication & {
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
        invitations: never[] | (import("mongoose").Document<unknown, {}, OrganizationInvitation, {}, import("mongoose").DefaultSchemaOptions> & OrganizationInvitation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    enableApplication(grapiflyUserId: string, organizationId: string, applicationKey: string): Promise<import("mongoose").Document<unknown, {}, OrganizationApplication, {}, import("mongoose").DefaultSchemaOptions> & OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    updateProfile(grapiflyUserId: string, organizationId: string, input: Record<string, unknown>): Promise<(import("mongoose").Document<unknown, {}, Organization, {}, import("mongoose").DefaultSchemaOptions> & Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    getApplicationOrganization(grapiflyUserId: string, organizationId: string, applicationKey: string): Promise<import("mongoose").Document<unknown, {}, Organization, {}, import("mongoose").DefaultSchemaOptions> & Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    updateApplicationOrganization(grapiflyUserId: string, organizationId: string, applicationKey: string, input: Record<string, unknown>): Promise<(import("mongoose").Document<unknown, {}, Organization, {}, import("mongoose").DefaultSchemaOptions> & Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    archive(grapiflyUserId: string, organizationId: string): Promise<{
        organizationId: string;
        status: string;
    }>;
    invite(grapiflyUserId: string, organizationId: string, input: {
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
    regenerateInvitation(grapiflyUserId: string, organizationId: string, invitationId: string): Promise<{
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
    cancelInvitation(grapiflyUserId: string, organizationId: string, invitationId: string): Promise<{
        invitationId: string;
        status: string;
    }>;
    accept(grapiflyUserId: string, token: string): Promise<{
        organizationId: string;
        applicationKeys: string[];
    }>;
    private requireMembership;
    private requireManager;
    private requireApplicationAccess;
    assertRelayClient(candidate: string | undefined): void;
    getApplicationTeam(grapiflyUserId: string, organizationId: string, applicationKey: string): Promise<{
        members: ({
            membership: import("mongoose").Document<unknown, {}, OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMembership & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>;
            access: import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMemberApplication & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>;
            user: (import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").GrapiflyUser, {}, import("mongoose").DefaultSchemaOptions> & import("../users/schemas/user.schema").GrapiflyUser & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>) | null;
        } | null)[];
        invitations: (import("mongoose").Document<unknown, {}, OrganizationInvitation, {}, import("mongoose").DefaultSchemaOptions> & OrganizationInvitation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    updateApplicationMember(actorUserId: string, organizationId: string, applicationKey: string, targetUserId: string, input: {
        role?: string;
        status?: string;
    }): Promise<import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    private normalizeApplicationRole;
    private normalizeInvitableApplicationRole;
    private invitationApplicationRole;
    private hash;
}
