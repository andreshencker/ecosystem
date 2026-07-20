import { HydratedDocument, Types } from 'mongoose';
export type RefreshTokenDocument = HydratedDocument<RefreshToken> & {
    createdAt: Date;
};
export declare class RefreshToken {
    userId: Types.ObjectId;
    tokenHash: string;
    isRevoked: boolean;
    replacedByTokenHash: string | null;
    expiresAt: Date;
}
export declare const RefreshTokenSchema: import("mongoose").Schema<RefreshToken, import("mongoose").Model<RefreshToken, any, any, any, any, any, RefreshToken>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenHash?: import("mongoose").SchemaDefinitionProperty<string, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isRevoked?: import("mongoose").SchemaDefinitionProperty<boolean, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    replacedByTokenHash?: import("mongoose").SchemaDefinitionProperty<string | null, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, RefreshToken, import("mongoose").Document<unknown, {}, RefreshToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RefreshToken & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, RefreshToken>;
