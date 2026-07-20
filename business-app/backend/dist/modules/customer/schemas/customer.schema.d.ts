import { HydratedDocument, Types } from 'mongoose';
export declare const DOCUMENT_TYPES: readonly ["invoice", "quote", "budget", "purchase_order", "statement", "receipt", "contract", "general", "other"];
export type DocumentType = typeof DOCUMENT_TYPES[number];
export type BillingRecipientType = 'to' | 'cc' | 'bcc';
export declare class BillingRecipient {
    documentType: DocumentType;
    email: string;
    recipientType: BillingRecipientType;
}
export declare const BillingRecipientSchema: import("mongoose").Schema<BillingRecipient, import("mongoose").Model<BillingRecipient, any, any, any, any, any, BillingRecipient>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BillingRecipient, import("mongoose").Document<unknown, {}, BillingRecipient, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<BillingRecipient & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    documentType?: import("mongoose").SchemaDefinitionProperty<"invoice" | "quote" | "budget" | "purchase_order" | "statement" | "receipt" | "contract" | "general" | "other", BillingRecipient, import("mongoose").Document<unknown, {}, BillingRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BillingRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, BillingRecipient, import("mongoose").Document<unknown, {}, BillingRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BillingRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    recipientType?: import("mongoose").SchemaDefinitionProperty<BillingRecipientType, BillingRecipient, import("mongoose").Document<unknown, {}, BillingRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BillingRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, BillingRecipient>;
export declare class CommPurposeRecipient {
    email?: string;
    recipientType?: 'to' | 'cc' | 'bcc';
    phone?: string;
}
export declare const CommPurposeRecipientSchema: import("mongoose").Schema<CommPurposeRecipient, import("mongoose").Model<CommPurposeRecipient, any, any, any, any, any, CommPurposeRecipient>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommPurposeRecipient, import("mongoose").Document<unknown, {}, CommPurposeRecipient, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeRecipient & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    email?: import("mongoose").SchemaDefinitionProperty<string | undefined, CommPurposeRecipient, import("mongoose").Document<unknown, {}, CommPurposeRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    recipientType?: import("mongoose").SchemaDefinitionProperty<"to" | "cc" | "bcc" | undefined, CommPurposeRecipient, import("mongoose").Document<unknown, {}, CommPurposeRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | undefined, CommPurposeRecipient, import("mongoose").Document<unknown, {}, CommPurposeRecipient, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeRecipient & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, CommPurposeRecipient>;
export declare class CommPurposeChannel {
    channel: 'email' | 'sms';
    recipients: CommPurposeRecipient[];
}
export declare const CommPurposeChannelSchema: import("mongoose").Schema<CommPurposeChannel, import("mongoose").Model<CommPurposeChannel, any, any, any, any, any, CommPurposeChannel>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommPurposeChannel, import("mongoose").Document<unknown, {}, CommPurposeChannel, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeChannel & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    channel?: import("mongoose").SchemaDefinitionProperty<"email" | "sms", CommPurposeChannel, import("mongoose").Document<unknown, {}, CommPurposeChannel, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeChannel & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    recipients?: import("mongoose").SchemaDefinitionProperty<CommPurposeRecipient[], CommPurposeChannel, import("mongoose").Document<unknown, {}, CommPurposeChannel, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommPurposeChannel & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, CommPurposeChannel>;
export declare class CustomerCommPurpose {
    communicationDomainId: string;
    channels: CommPurposeChannel[];
}
export declare const CustomerCommPurposeSchema: import("mongoose").Schema<CustomerCommPurpose, import("mongoose").Model<CustomerCommPurpose, any, any, any, any, any, CustomerCommPurpose>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomerCommPurpose, import("mongoose").Document<unknown, {}, CustomerCommPurpose, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CustomerCommPurpose & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    communicationDomainId?: import("mongoose").SchemaDefinitionProperty<string, CustomerCommPurpose, import("mongoose").Document<unknown, {}, CustomerCommPurpose, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerCommPurpose & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    channels?: import("mongoose").SchemaDefinitionProperty<CommPurposeChannel[], CustomerCommPurpose, import("mongoose").Document<unknown, {}, CustomerCommPurpose, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerCommPurpose & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, CustomerCommPurpose>;
export declare class CustomerLocation {
    _id: Types.ObjectId;
    tag: string;
    country: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    state: string | null;
}
export declare const CustomerLocationSchema: import("mongoose").Schema<CustomerLocation, import("mongoose").Model<CustomerLocation, any, any, any, any, any, CustomerLocation>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tag?: import("mongoose").SchemaDefinitionProperty<string, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    country?: import("mongoose").SchemaDefinitionProperty<string, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    line1?: import("mongoose").SchemaDefinitionProperty<string, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    line2?: import("mongoose").SchemaDefinitionProperty<string | null, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    city?: import("mongoose").SchemaDefinitionProperty<string, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    postalCode?: import("mongoose").SchemaDefinitionProperty<string, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    state?: import("mongoose").SchemaDefinitionProperty<string | null, CustomerLocation, import("mongoose").Document<unknown, {}, CustomerLocation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerLocation & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, CustomerLocation>;
export declare class Contact {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    locationId: string | null;
    isPrimary: boolean;
}
export declare const ContactSchema: import("mongoose").Schema<Contact, import("mongoose").Model<Contact, any, any, any, any, any, Contact>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Contact, import("mongoose").Document<unknown, {}, Contact, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    firstName?: import("mongoose").SchemaDefinitionProperty<string, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastName?: import("mongoose").SchemaDefinitionProperty<string, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | null, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | null, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<string | null, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    locationId?: import("mongoose").SchemaDefinitionProperty<string | null, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isPrimary?: import("mongoose").SchemaDefinitionProperty<boolean, Contact, import("mongoose").Document<unknown, {}, Contact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contact & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Contact>;
export declare class CustomerAddress {
    country: string;
    state: string | null;
    city: string;
    postalCode: string | null;
    line1: string;
    line2: string | null;
}
export declare const CustomerAddressSchema: import("mongoose").Schema<CustomerAddress, import("mongoose").Model<CustomerAddress, any, any, any, any, any, CustomerAddress>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    country?: import("mongoose").SchemaDefinitionProperty<string, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    state?: import("mongoose").SchemaDefinitionProperty<string | null, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    city?: import("mongoose").SchemaDefinitionProperty<string, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    postalCode?: import("mongoose").SchemaDefinitionProperty<string | null, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    line1?: import("mongoose").SchemaDefinitionProperty<string, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    line2?: import("mongoose").SchemaDefinitionProperty<string | null, CustomerAddress, import("mongoose").Document<unknown, {}, CustomerAddress, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CustomerAddress & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, CustomerAddress>;
export declare class PrimaryContact {
    name: string | null;
    email: string | null;
    phone: string | null;
}
export declare const PrimaryContactSchema: import("mongoose").Schema<PrimaryContact, import("mongoose").Model<PrimaryContact, any, any, any, any, any, PrimaryContact>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PrimaryContact, import("mongoose").Document<unknown, {}, PrimaryContact, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PrimaryContact & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string | null, PrimaryContact, import("mongoose").Document<unknown, {}, PrimaryContact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PrimaryContact & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | null, PrimaryContact, import("mongoose").Document<unknown, {}, PrimaryContact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PrimaryContact & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | null, PrimaryContact, import("mongoose").Document<unknown, {}, PrimaryContact, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PrimaryContact & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, PrimaryContact>;
export type CustomerDocument = HydratedDocument<Customer>;
export type CustomerType = 'company' | 'individual';
export declare class Customer {
    companyId: string;
    type: CustomerType;
    displayName: string;
    abn: string | null;
    contact: PrimaryContact | null;
    email: string | null;
    phone: string | null;
    address: CustomerAddress | null;
    notes: string | null;
    isActive: boolean;
    contacts: Contact[];
    locations: CustomerLocation[];
    communicationPurposes: CustomerCommPurpose[];
    billingRecipients: BillingRecipient[];
}
export declare const CustomerSchema: import("mongoose").Schema<Customer, import("mongoose").Model<Customer, any, any, any, any, any, Customer>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Customer, import("mongoose").Document<unknown, {}, Customer, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    companyId?: import("mongoose").SchemaDefinitionProperty<string, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    type?: import("mongoose").SchemaDefinitionProperty<CustomerType, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    displayName?: import("mongoose").SchemaDefinitionProperty<string, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    abn?: import("mongoose").SchemaDefinitionProperty<string | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contact?: import("mongoose").SchemaDefinitionProperty<PrimaryContact | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    address?: import("mongoose").SchemaDefinitionProperty<CustomerAddress | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | null, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contacts?: import("mongoose").SchemaDefinitionProperty<Contact[], Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    locations?: import("mongoose").SchemaDefinitionProperty<CustomerLocation[], Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    communicationPurposes?: import("mongoose").SchemaDefinitionProperty<CustomerCommPurpose[], Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    billingRecipients?: import("mongoose").SchemaDefinitionProperty<BillingRecipient[], Customer, import("mongoose").Document<unknown, {}, Customer, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Customer & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Customer>;
