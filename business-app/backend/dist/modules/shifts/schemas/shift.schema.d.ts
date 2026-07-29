import { HydratedDocument } from 'mongoose';
export type ShiftStatus = 'draft' | 'confirmed' | 'cancelled';
export type SyncStatus = 'pending' | 'synced' | 'deleted' | 'error';
export type HourCalcStatus = 'pending' | 'ready' | 'calculated';
export type InvoiceStatus = 'pending' | 'invoiced';
export type ShiftDocument = HydratedDocument<Shift>;
export declare class Shift {
    businessId: string;
    contractId: string | null;
    customerId: string | null;
    date: string;
    startTime: string;
    endDate: string | null;
    endTime: string;
    breakTaken: boolean;
    status: ShiftStatus;
    location: string | null;
    notes: string | null;
    linkedCalendarId: string | null;
    calendarProvider: string | null;
    calendarAccount: string | null;
    calendarId: string | null;
    calendarName: string | null;
    externalEventId: string | null;
    externalOccurrenceId: string | null;
    title: string | null;
    description: string | null;
    start: Date | null;
    end: Date | null;
    allDay: boolean;
    timezone: string | null;
    organizer: string | null;
    attendees: string[];
    lastExternalUpdate: Date | null;
    syncStatus: SyncStatus | null;
    createdFromCalendar: boolean;
    contractAssigned: boolean;
    hourCalculationStatus: HourCalcStatus;
    invoiceStatus: InvoiceStatus;
    metadata: Record<string, any> | null;
}
export declare const ShiftSchema: import("mongoose").Schema<Shift, import("mongoose").Model<Shift, any, any, any, any, any, Shift>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shift, import("mongoose").Document<unknown, {}, Shift, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<string, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contractId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    customerId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<string, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startTime?: import("mongoose").SchemaDefinitionProperty<string, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endDate?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endTime?: import("mongoose").SchemaDefinitionProperty<string, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    breakTaken?: import("mongoose").SchemaDefinitionProperty<boolean, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<ShiftStatus, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    location?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    linkedCalendarId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarProvider?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarAccount?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarName?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    externalEventId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    externalOccurrenceId?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    start?: import("mongoose").SchemaDefinitionProperty<Date | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    end?: import("mongoose").SchemaDefinitionProperty<Date | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    allDay?: import("mongoose").SchemaDefinitionProperty<boolean, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    timezone?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    organizer?: import("mongoose").SchemaDefinitionProperty<string | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    attendees?: import("mongoose").SchemaDefinitionProperty<string[], Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastExternalUpdate?: import("mongoose").SchemaDefinitionProperty<Date | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    syncStatus?: import("mongoose").SchemaDefinitionProperty<SyncStatus | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdFromCalendar?: import("mongoose").SchemaDefinitionProperty<boolean, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contractAssigned?: import("mongoose").SchemaDefinitionProperty<boolean, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    hourCalculationStatus?: import("mongoose").SchemaDefinitionProperty<HourCalcStatus, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invoiceStatus?: import("mongoose").SchemaDefinitionProperty<InvoiceStatus, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, any> | null, Shift, import("mongoose").Document<unknown, {}, Shift, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Shift>;
