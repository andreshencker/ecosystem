import { HydratedDocument } from 'mongoose';
export type OutboxEventStatus = 'pending' | 'delivered' | 'failed' | 'dead_letter';
export type OutboxEventDocument = HydratedDocument<OutboxEvent>;
export declare class OutboxEvent {
    eventId: string;
    eventName: string;
    version: number;
    tenantId: string;
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    occurredAt: Date;
    status: OutboxEventStatus;
    attempts: number;
    lastAttemptAt: Date | null;
    deliveredAt: Date | null;
    error: string | null;
}
export declare const OutboxEventSchema: import("mongoose").Schema<OutboxEvent, import("mongoose").Model<OutboxEvent, any, any, any, any, any, OutboxEvent>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    eventId?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    eventName?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    version?: import("mongoose").SchemaDefinitionProperty<number, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tenantId?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    aggregateId?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    aggregateType?: import("mongoose").SchemaDefinitionProperty<string, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payload?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    occurredAt?: import("mongoose").SchemaDefinitionProperty<Date, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<OutboxEventStatus, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    attempts?: import("mongoose").SchemaDefinitionProperty<number, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastAttemptAt?: import("mongoose").SchemaDefinitionProperty<Date | null, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    deliveredAt?: import("mongoose").SchemaDefinitionProperty<Date | null, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    error?: import("mongoose").SchemaDefinitionProperty<string | null, OutboxEvent, import("mongoose").Document<unknown, {}, OutboxEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OutboxEvent & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, OutboxEvent>;
