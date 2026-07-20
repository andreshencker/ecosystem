import { HydratedDocument } from 'mongoose';
export type BusinessDocument = HydratedDocument<Business>;
export declare class Business {
    businessKey: string;
    businessName: string;
    ownerUserId: string | null;
    abn: string | null;
    depositAccount: {
        bsb: string | null;
        accountNumber: string | null;
    };
    defaultCurrency: string;
    isActive: boolean;
    isPlatformCompany: boolean;
}
export declare const BusinessSchema: import("mongoose").Schema<Business, import("mongoose").Model<Business, any, any, any, any, any, Business>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Business, import("mongoose").Document<unknown, {}, Business, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessKey?: import("mongoose").SchemaDefinitionProperty<string, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    businessName?: import("mongoose").SchemaDefinitionProperty<string, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    ownerUserId?: import("mongoose").SchemaDefinitionProperty<string | null, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    abn?: import("mongoose").SchemaDefinitionProperty<string | null, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    depositAccount?: import("mongoose").SchemaDefinitionProperty<{
        bsb: string | null;
        accountNumber: string | null;
    }, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    defaultCurrency?: import("mongoose").SchemaDefinitionProperty<string, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isPlatformCompany?: import("mongoose").SchemaDefinitionProperty<boolean, Business, import("mongoose").Document<unknown, {}, Business, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Business & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Business>;
