import { OrganizationsService } from './organizations.service';
export declare class RelayTeamController {
    private readonly organizations;
    constructor(organizations: OrganizationsService);
    list(secret: string | undefined, actorUserId: string, organizationId: string): Promise<{
        members: ({
            membership: import("mongoose").Document<unknown, {}, import("./schemas/organization-membership.schema").OrganizationMembership, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-membership.schema").OrganizationMembership & {
                _id: import("mongoose").Types.ObjectId;
            } & {
                __v: number;
            } & {
                id: string;
            } & Required<{
                _id: import("mongoose").Types.ObjectId;
            }>;
            access: import("mongoose").Document<unknown, {}, import("./schemas/organization-member-application.schema").OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-member-application.schema").OrganizationMemberApplication & {
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
        invitations: (import("mongoose").Document<unknown, {}, import("./schemas/organization-invitation.schema").OrganizationInvitation, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-invitation.schema").OrganizationInvitation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    invite(secret: string | undefined, actorUserId: string, organizationId: string, body: {
        email: string;
        role: 'admin' | 'operator' | 'viewer';
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
    regenerate(secret: string | undefined, actorUserId: string, organizationId: string, invitationId: string): Promise<{
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
    cancel(secret: string | undefined, actorUserId: string, organizationId: string, invitationId: string): Promise<{
        invitationId: string;
        status: string;
    }>;
    updateMember(secret: string | undefined, actorUserId: string, organizationId: string, grapiflyUserId: string, body: {
        role?: string;
        status?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schemas/organization-member-application.schema").OrganizationMemberApplication, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/organization-member-application.schema").OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
