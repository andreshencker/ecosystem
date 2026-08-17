import { HydratedDocument } from 'mongoose';
export type OrganizationMemberApplicationDocument = HydratedDocument<OrganizationMemberApplication>;
export type ApplicationMemberRole = 'owner' | 'admin' | 'operator' | 'viewer';
export declare class OrganizationMemberApplication {
    organizationId: string;
    grapiflyUserId: string;
    applicationKey: string;
    role: ApplicationMemberRole;
    status: 'active' | 'suspended' | 'revoked';
}
export declare const OrganizationMemberApplicationSchema: import("mongoose").Schema<OrganizationMemberApplication, import("mongoose").Model<OrganizationMemberApplication, any, any, any, any, any, OrganizationMemberApplication>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    organizationId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicationKey?: import("mongoose").SchemaDefinitionProperty<string, OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<ApplicationMemberRole, OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended" | "revoked", OrganizationMemberApplication, import("mongoose").Document<unknown, {}, OrganizationMemberApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationMemberApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OrganizationMemberApplication>;
