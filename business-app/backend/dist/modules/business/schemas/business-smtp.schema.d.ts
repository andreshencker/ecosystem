import { HydratedDocument } from 'mongoose';
export type BusinessSmtpDocument = HydratedDocument<BusinessSmtp> & {
    createdAt: Date;
    updatedAt: Date;
};
export type EncryptedPayload = {
    alg: string;
    ivBase64: string;
    tagBase64: string;
    dataBase64: string;
};
export declare class BusinessSmtp {
    companyId: string;
    fromEmail: string;
    fromName: string;
    credentials: EncryptedPayload | null;
    isActive: boolean;
    verifiedAt: Date | null;
}
export declare const BusinessSmtpSchema: import("mongoose").Schema<BusinessSmtp, import("mongoose").Model<BusinessSmtp, any, any, any, any, any, BusinessSmtp>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    companyId?: import("mongoose").SchemaDefinitionProperty<string, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fromEmail?: import("mongoose").SchemaDefinitionProperty<string, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fromName?: import("mongoose").SchemaDefinitionProperty<string, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    credentials?: import("mongoose").SchemaDefinitionProperty<EncryptedPayload | null, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    verifiedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, BusinessSmtp, import("mongoose").Document<unknown, {}, BusinessSmtp, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BusinessSmtp & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, BusinessSmtp>;
