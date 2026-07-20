import { HydratedDocument } from 'mongoose';
export type LinkedCalendarStatus = 'active' | 'paused';
export type CalendarFlow = 'holidays' | 'shifts' | 'payments';
export declare const CALENDAR_FLOWS: CalendarFlow[];
export type LinkedCalendarDocument = HydratedDocument<LinkedCalendar>;
export declare class LinkedCalendar {
    companyId: string;
    connectionId: string;
    providerKey: string;
    providerDisplayName: string;
    accountIdentifier: string;
    externalCalendarId: string;
    calendarName: string;
    calendarDescription: string | null;
    timezone: string | null;
    accessRole: string | null;
    isPrimary: boolean;
    status: LinkedCalendarStatus;
    flow: CalendarFlow | null;
    linkedByUserId: string | null;
}
export declare const LinkedCalendarSchema: import("mongoose").Schema<LinkedCalendar, import("mongoose").Model<LinkedCalendar, any, any, any, any, any, LinkedCalendar>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    companyId?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    connectionId?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    providerKey?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    providerDisplayName?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    accountIdentifier?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    externalCalendarId?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarName?: import("mongoose").SchemaDefinitionProperty<string, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarDescription?: import("mongoose").SchemaDefinitionProperty<string | null, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    timezone?: import("mongoose").SchemaDefinitionProperty<string | null, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    accessRole?: import("mongoose").SchemaDefinitionProperty<string | null, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isPrimary?: import("mongoose").SchemaDefinitionProperty<boolean, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<LinkedCalendarStatus, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    flow?: import("mongoose").SchemaDefinitionProperty<CalendarFlow | null, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    linkedByUserId?: import("mongoose").SchemaDefinitionProperty<string | null, LinkedCalendar, import("mongoose").Document<unknown, {}, LinkedCalendar, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LinkedCalendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, LinkedCalendar>;
