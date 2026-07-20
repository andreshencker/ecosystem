import { HydratedDocument, Types } from 'mongoose';
export type IntegrationConnectionDocument = HydratedDocument<IntegrationConnection> & {
    createdAt: Date;
    updatedAt: Date;
};
export declare class IntegrationConnection {
    businessId: Types.ObjectId;
    provider: string;
    encryptedToken: object;
    tokenPrefix: string;
    remoteCompanyId: string | null;
    isActive: boolean;
    lastTestedAt: Date | null;
    lastStatus: 'connected' | 'failed' | null;
    lastError: string | null;
}
export declare const IntegrationConnectionSchema: import("mongoose").Schema<IntegrationConnection, import("mongoose").Model<IntegrationConnection, any, any, any, any, any, IntegrationConnection>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<string, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    encryptedToken?: import("mongoose").SchemaDefinitionProperty<object, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenPrefix?: import("mongoose").SchemaDefinitionProperty<string, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    remoteCompanyId?: import("mongoose").SchemaDefinitionProperty<string | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastTestedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastStatus?: import("mongoose").SchemaDefinitionProperty<"connected" | "failed" | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastError?: import("mongoose").SchemaDefinitionProperty<string | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IntegrationConnection>;
export declare const CommunicationConnection: typeof IntegrationConnection;
export declare const CommunicationConnectionSchema: import("mongoose").Schema<IntegrationConnection, import("mongoose").Model<IntegrationConnection, any, any, any, any, any, IntegrationConnection>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<string, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    encryptedToken?: import("mongoose").SchemaDefinitionProperty<object, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenPrefix?: import("mongoose").SchemaDefinitionProperty<string, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    remoteCompanyId?: import("mongoose").SchemaDefinitionProperty<string | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastTestedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastStatus?: import("mongoose").SchemaDefinitionProperty<"connected" | "failed" | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastError?: import("mongoose").SchemaDefinitionProperty<string | null, IntegrationConnection, import("mongoose").Document<unknown, {}, IntegrationConnection, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<IntegrationConnection & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IntegrationConnection>;
export type CommunicationConnectionDocument = IntegrationConnectionDocument;
