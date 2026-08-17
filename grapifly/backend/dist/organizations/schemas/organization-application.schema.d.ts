import { HydratedDocument } from 'mongoose';
export type OrganizationApplicationDocument = HydratedDocument<OrganizationApplication>;
export declare class OrganizationApplication {
    organizationId: string;
    applicationKey: string;
    status: 'active' | 'suspended';
    enabledBy: string;
}
export declare const OrganizationApplicationSchema: import("mongoose").Schema<OrganizationApplication, import("mongoose").Model<OrganizationApplication, any, any, any, any, any, OrganizationApplication>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrganizationApplication, import("mongoose").Document<unknown, {}, OrganizationApplication, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationApplication & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    organizationId?: import("mongoose").SchemaDefinitionProperty<string, OrganizationApplication, import("mongoose").Document<unknown, {}, OrganizationApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicationKey?: import("mongoose").SchemaDefinitionProperty<string, OrganizationApplication, import("mongoose").Document<unknown, {}, OrganizationApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended", OrganizationApplication, import("mongoose").Document<unknown, {}, OrganizationApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    enabledBy?: import("mongoose").SchemaDefinitionProperty<string, OrganizationApplication, import("mongoose").Document<unknown, {}, OrganizationApplication, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrganizationApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OrganizationApplication>;
