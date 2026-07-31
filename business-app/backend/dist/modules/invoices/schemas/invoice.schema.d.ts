import { HydratedDocument } from 'mongoose';
export type InvoiceStatus = 'approved';
export type InvoiceDocument = HydratedDocument<Invoice>;
export declare class Invoice {
    businessId: string;
    customerId: string;
    contractId: string;
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    shiftIds: string[];
    subtotal: string;
    taxAmount: string;
    total: string;
    groupId: string;
    status: InvoiceStatus;
}
export declare const InvoiceSchema: import("mongoose").Schema<Invoice, import("mongoose").Model<Invoice, any, any, any, any, any, Invoice>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    customerId?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contractId?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invoiceNumber?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    periodStart?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    periodEnd?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    shiftIds?: import("mongoose").SchemaDefinitionProperty<string[], Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    subtotal?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    taxAmount?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    total?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    groupId?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"approved", Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Invoice>;
