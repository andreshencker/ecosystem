import { HydratedDocument } from 'mongoose';
export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;
export declare class PlatformAdmin {
    grapiflyUserId: string;
    email: string;
    role: 'ecosystem_super_admin';
    status: 'active' | 'suspended';
}
export declare const PlatformAdminSchema: import("mongoose").Schema<PlatformAdmin, import("mongoose").Model<PlatformAdmin, any, any, any, any, any, PlatformAdmin>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PlatformAdmin, import("mongoose").Document<unknown, {}, PlatformAdmin, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PlatformAdmin & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, PlatformAdmin, import("mongoose").Document<unknown, {}, PlatformAdmin, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, PlatformAdmin, import("mongoose").Document<unknown, {}, PlatformAdmin, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<"ecosystem_super_admin", PlatformAdmin, import("mongoose").Document<unknown, {}, PlatformAdmin, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "suspended", PlatformAdmin, import("mongoose").Document<unknown, {}, PlatformAdmin, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PlatformAdmin & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, PlatformAdmin>;
