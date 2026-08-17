import { HydratedDocument } from 'mongoose';
export type SsoCodeDocument = HydratedDocument<SsoCode>;
export declare class SsoCode {
    codeHash: string;
    grapiflyUserId: string;
    appKey: 'relay';
    organizationId: string;
    expiresAt: Date;
    consumedAt: Date | null;
}
export declare const SsoCodeSchema: import("mongoose").Schema<SsoCode, import("mongoose").Model<SsoCode, any, any, any, any, any, SsoCode>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    codeHash?: import("mongoose").SchemaDefinitionProperty<string, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    grapiflyUserId?: import("mongoose").SchemaDefinitionProperty<string, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    appKey?: import("mongoose").SchemaDefinitionProperty<"relay", SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    organizationId?: import("mongoose").SchemaDefinitionProperty<string, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    consumedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, SsoCode, import("mongoose").Document<unknown, {}, SsoCode, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SsoCode & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, SsoCode>;
