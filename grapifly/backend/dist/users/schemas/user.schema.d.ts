import { HydratedDocument } from 'mongoose';
export type GrapiflyUserDocument = HydratedDocument<GrapiflyUser>;
export declare class GrapiflyUser {
    grapiflyUserId: string;
    provider: 'google';
    providerSubject: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string | null;
    isActive: boolean;
    lastLoginAt: Date;
}
export declare const GrapiflyUserSchema: import("mongoose").Schema<GrapiflyUser, import("mongoose").Model<GrapiflyUser, any, any, any, any, any, GrapiflyUser>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<"google", GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    providerSubject?: import("mongoose").SchemaDefinitionProperty<string, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailVerified?: import("mongoose").SchemaDefinitionProperty<boolean, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    displayName?: import("mongoose").SchemaDefinitionProperty<string, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    avatarUrl?: import("mongoose").SchemaDefinitionProperty<string | null, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastLoginAt?: import("mongoose").SchemaDefinitionProperty<Date, GrapiflyUser, import("mongoose").Document<unknown, {}, GrapiflyUser, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<GrapiflyUser & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, GrapiflyUser>;
