import { HydratedDocument } from 'mongoose';
export type OrganizationMembershipDocument = HydratedDocument<OrganizationMembership>;
export declare class OrganizationMembership {
    membershipId: string;
    organizationId: string;
    grapiflyUserId: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'suspended' | 'revoked';
}
export declare const OrganizationMembershipSchema: import("mongoose").Schema<OrganizationMembership, import("mongoose").Model<OrganizationMembership, any, any, any, any, any, OrganizationMembership>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    membershipId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    organizationId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<"owner" | "admin" | "member", OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended" | "revoked", OrganizationMembership, import("mongoose").Document<unknown, {}, OrganizationMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMembership & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OrganizationMembership>;
