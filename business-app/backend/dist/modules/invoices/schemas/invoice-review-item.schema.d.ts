import { HydratedDocument } from 'mongoose';
export type InvoiceReviewItemDocument = HydratedDocument<InvoiceReviewItem>;
export declare class InvoiceReviewItem {
    businessId: string;
    groupId: string;
    date: string;
    concept: string;
    amount: string;
}
export declare const InvoiceReviewItemSchema: import("mongoose").Schema<InvoiceReviewItem, import("mongoose").Model<InvoiceReviewItem, any, any, any, any, any, InvoiceReviewItem>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<string, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    groupId?: import("mongoose").SchemaDefinitionProperty<string, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<string, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    concept?: import("mongoose").SchemaDefinitionProperty<string, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<string, InvoiceReviewItem, import("mongoose").Document<unknown, {}, InvoiceReviewItem, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InvoiceReviewItem & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, InvoiceReviewItem>;
