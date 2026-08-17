import { HydratedDocument } from 'mongoose';
export type OrganizationInvitationDocument = HydratedDocument<OrganizationInvitation>;
export declare class OrganizationInvitation {
    invitationId: string;
    organizationId: string;
    email: string;
    role: 'admin' | 'member';
    applicationKeys: string[];
    applicationRoles: Record<string, 'admin' | 'operator' | 'viewer'>;
    tokenHash: string;
    invitedBy: string;
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    expiresAt: Date;
    acceptedAt: Date | null;
}
export declare const OrganizationInvitationSchema: import("mongoose").Schema<OrganizationInvitation, import("mongoose").Model<OrganizationInvitation, any, any, any, any, any, OrganizationInvitation>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    invitationId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    organizationId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<"admin" | "member", OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicationKeys?: import("mongoose").SchemaDefinitionProperty<string[], OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicationRoles?: import("mongoose").SchemaDefinitionProperty<Record<string, "admin" | "operator" | "viewer">, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    tokenHash?: import("mongoose").SchemaDefinitionProperty<string, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    invitedBy?: import("mongoose").SchemaDefinitionProperty<string, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "accepted" | "cancelled" | "expired", OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    acceptedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, OrganizationInvitation, import("mongoose").Document<unknown, {}, OrganizationInvitation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationInvitation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OrganizationInvitation>;
