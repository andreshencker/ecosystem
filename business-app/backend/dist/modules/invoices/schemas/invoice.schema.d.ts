import { HydratedDocument } from 'mongoose';
export type InvoiceStatus = 'approved' | 'outstanding' | 'sent' | 'send_failed' | 'paid' | 'voided';
export type InvoiceDocument = HydratedDocument<Invoice>;
export declare class Invoice {
    businessId: string;
    customerId: string;
    customerName: string | null;
    contractId: string;
    invoiceNumber: string;
    invoiceDate: string | null;
    dueDate: string | null;
    periodStart: string;
    periodEnd: string;
    currency: string;
    shiftIds: string[];
    additionalConcepts: Array<{
        date: string;
        concept: string;
        amount: string;
    }>;
    subtotal: string;
    taxAmount: string;
    total: string;
    amountPaid: string;
    balance: string;
    groupId: string;
    status: InvoiceStatus;
    sentAt: Date | null;
    lastReminderAt: Date | null;
    reminderCount: number;
    paidAt: Date | null;
    paymentReference: string | null;
    paymentNotes: string | null;
    voidedAt: Date | null;
    voidReason: string | null;
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
    customerName?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
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
    invoiceDate?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    dueDate?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
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
    additionalConcepts?: import("mongoose").SchemaDefinitionProperty<{
        date: string;
        concept: string;
        amount: string;
    }[], Invoice, import("mongoose").Document<unknown, {}, Invoice, {
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
    amountPaid?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    balance?: import("mongoose").SchemaDefinitionProperty<string, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
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
    status?: import("mongoose").SchemaDefinitionProperty<InvoiceStatus, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sentAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastReminderAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reminderCount?: import("mongoose").SchemaDefinitionProperty<number, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paidAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentReference?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentNotes?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    voidedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    voidReason?: import("mongoose").SchemaDefinitionProperty<string | null, Invoice, import("mongoose").Document<unknown, {}, Invoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Invoice & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Invoice>;
