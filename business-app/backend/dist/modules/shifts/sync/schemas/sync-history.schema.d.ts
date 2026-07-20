import { HydratedDocument } from 'mongoose';
export type SyncHistoryStatus = 'running' | 'completed' | 'failed';
export type SyncHistoryDocument = HydratedDocument<SyncHistory>;
export declare class SyncHistory {
    businessId: string;
    linkedCalendarId: string | null;
    calendarName: string | null;
    accountIdentifier: string | null;
    providerKey: string | null;
    startedAt: Date;
    finishedAt: Date | null;
    eventsReceived: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: string[];
    durationMs: number | null;
    status: SyncHistoryStatus;
}
export declare const SyncHistorySchema: import("mongoose").Schema<SyncHistory, import("mongoose").Model<SyncHistory, any, any, any, any, any, SyncHistory>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<string, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    linkedCalendarId?: import("mongoose").SchemaDefinitionProperty<string | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarName?: import("mongoose").SchemaDefinitionProperty<string | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    accountIdentifier?: import("mongoose").SchemaDefinitionProperty<string | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    providerKey?: import("mongoose").SchemaDefinitionProperty<string | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startedAt?: import("mongoose").SchemaDefinitionProperty<Date, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    finishedAt?: import("mongoose").SchemaDefinitionProperty<Date | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    eventsReceived?: import("mongoose").SchemaDefinitionProperty<number, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    created?: import("mongoose").SchemaDefinitionProperty<number, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updated?: import("mongoose").SchemaDefinitionProperty<number, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    deleted?: import("mongoose").SchemaDefinitionProperty<number, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    skipped?: import("mongoose").SchemaDefinitionProperty<number, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    errors?: import("mongoose").SchemaDefinitionProperty<string[], SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    durationMs?: import("mongoose").SchemaDefinitionProperty<number | null, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<SyncHistoryStatus, SyncHistory, import("mongoose").Document<unknown, {}, SyncHistory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SyncHistory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, SyncHistory>;
