import { HydratedDocument } from 'mongoose';
export type ContractStatus = 'draft' | 'active' | 'inactive' | 'finished' | 'cancelled';
export type BillingCycle = 'per_shift' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';
export type RateType = 'fixed' | 'variable' | 'variable_time_range';
export type WorkType = 'casual' | 'contractor' | 'subcontractor' | 'service_agreement' | 'project_based' | 'other';
export declare const VALID_WORK_TYPES: WorkType[];
export declare const SCHEDULED_PAYMENT_DAYS: readonly ["monday", "tuesday", "wednesday", "thursday", "friday"];
export type ScheduledPaymentDay = (typeof SCHEDULED_PAYMENT_DAYS)[number];
export declare const SUPPORTED_CURRENCIES: readonly ["AUD", "USD", "NZD", "GBP", "EUR", "COP"];
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export type HolidayBehaviour = 'normal_rate' | 'multiplier' | 'fixed_rate' | 'no_work';
export declare const VALID_HOLIDAY_BEHAVIOURS: HolidayBehaviour[];
export declare const SUPER_PAYMENT_FREQUENCIES: readonly ["pay_cycle", "monthly", "quarterly"];
export type SuperPaymentFrequency = (typeof SUPER_PAYMENT_FREQUENCIES)[number];
export declare class HolidayRules {
    enabled: boolean;
    calendarId: string | null;
    calendarName: string | null;
    calendarProviderName: string | null;
    behaviour: HolidayBehaviour | null;
    multiplier: number | null;
    fixedHourlyRate: number | null;
}
export declare const HolidayRulesSchema: import("mongoose").Schema<HolidayRules, import("mongoose").Model<HolidayRules, any, any, any, any, any, HolidayRules>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    enabled?: import("mongoose").SchemaDefinitionProperty<boolean, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarId?: import("mongoose").SchemaDefinitionProperty<string | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarName?: import("mongoose").SchemaDefinitionProperty<string | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    calendarProviderName?: import("mongoose").SchemaDefinitionProperty<string | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    behaviour?: import("mongoose").SchemaDefinitionProperty<HolidayBehaviour | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    multiplier?: import("mongoose").SchemaDefinitionProperty<number | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    fixedHourlyRate?: import("mongoose").SchemaDefinitionProperty<number | null, HolidayRules, import("mongoose").Document<unknown, {}, HolidayRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<HolidayRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, HolidayRules>;
export declare class SuperannuationRules {
    enabled: boolean;
    rate: number | null;
    paymentFrequency: SuperPaymentFrequency | null;
}
export declare const SuperannuationRulesSchema: import("mongoose").Schema<SuperannuationRules, import("mongoose").Model<SuperannuationRules, any, any, any, any, any, SuperannuationRules>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SuperannuationRules, import("mongoose").Document<unknown, {}, SuperannuationRules, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SuperannuationRules & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    enabled?: import("mongoose").SchemaDefinitionProperty<boolean, SuperannuationRules, import("mongoose").Document<unknown, {}, SuperannuationRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SuperannuationRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rate?: import("mongoose").SchemaDefinitionProperty<number | null, SuperannuationRules, import("mongoose").Document<unknown, {}, SuperannuationRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SuperannuationRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentFrequency?: import("mongoose").SchemaDefinitionProperty<"monthly" | "pay_cycle" | "quarterly" | null, SuperannuationRules, import("mongoose").Document<unknown, {}, SuperannuationRules, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SuperannuationRules & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, SuperannuationRules>;
export declare const VALID_RATE_DAYS: readonly ["all", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export declare class RateRule {
    days: string[];
    startTime: string | null;
    endTime: string | null;
    hourlyRate: number;
}
export declare const RateRuleSchema: import("mongoose").Schema<RateRule, import("mongoose").Model<RateRule, any, any, any, any, any, RateRule>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RateRule, import("mongoose").Document<unknown, {}, RateRule, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<RateRule & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    days?: import("mongoose").SchemaDefinitionProperty<string[], RateRule, import("mongoose").Document<unknown, {}, RateRule, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RateRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startTime?: import("mongoose").SchemaDefinitionProperty<string | null, RateRule, import("mongoose").Document<unknown, {}, RateRule, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RateRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endTime?: import("mongoose").SchemaDefinitionProperty<string | null, RateRule, import("mongoose").Document<unknown, {}, RateRule, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RateRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    hourlyRate?: import("mongoose").SchemaDefinitionProperty<number, RateRule, import("mongoose").Document<unknown, {}, RateRule, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RateRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, RateRule>;
export type ContractDocument = HydratedDocument<Contract>;
export declare class Contract {
    businessId: string;
    customerId: string;
    startDate: Date;
    endDate: Date | null;
    positionName: string;
    workType: WorkType;
    invoiceDescription: string;
    status: ContractStatus;
    billingCycle: BillingCycle;
    paymentTermsDays: number | null;
    scheduledPaymentEnabled: boolean;
    scheduledPaymentDay: ScheduledPaymentDay | null;
    rateType: RateType;
    minimumHours: number;
    defaultBreakMinutes: number;
    rates: RateRule[];
    notes: string | null;
    useInvoicePrefix: boolean;
    invoicePrefix: string | null;
    startingInvoiceNumber: number;
    currency: Currency;
    chargeGst: boolean;
    gstRate: number | null;
    holidayRules: HolidayRules;
    superannuationRules: SuperannuationRules;
    paymentCalendarEnabled: boolean;
    paymentCalendarSubscriptionId: string | null;
}
export declare const ContractSchema: import("mongoose").Schema<Contract, import("mongoose").Model<Contract, any, any, any, any, any, Contract>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Contract, import("mongoose").Document<unknown, {}, Contract, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    businessId?: import("mongoose").SchemaDefinitionProperty<string, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    customerId?: import("mongoose").SchemaDefinitionProperty<string, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startDate?: import("mongoose").SchemaDefinitionProperty<Date, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endDate?: import("mongoose").SchemaDefinitionProperty<Date | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    positionName?: import("mongoose").SchemaDefinitionProperty<string, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    workType?: import("mongoose").SchemaDefinitionProperty<WorkType, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invoiceDescription?: import("mongoose").SchemaDefinitionProperty<string, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<ContractStatus, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    billingCycle?: import("mongoose").SchemaDefinitionProperty<BillingCycle, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentTermsDays?: import("mongoose").SchemaDefinitionProperty<number | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scheduledPaymentEnabled?: import("mongoose").SchemaDefinitionProperty<boolean, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scheduledPaymentDay?: import("mongoose").SchemaDefinitionProperty<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rateType?: import("mongoose").SchemaDefinitionProperty<RateType, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    minimumHours?: import("mongoose").SchemaDefinitionProperty<number, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    defaultBreakMinutes?: import("mongoose").SchemaDefinitionProperty<number, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rates?: import("mongoose").SchemaDefinitionProperty<RateRule[], Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    useInvoicePrefix?: import("mongoose").SchemaDefinitionProperty<boolean, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    invoicePrefix?: import("mongoose").SchemaDefinitionProperty<string | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startingInvoiceNumber?: import("mongoose").SchemaDefinitionProperty<number, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<"AUD" | "USD" | "NZD" | "GBP" | "EUR" | "COP", Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    chargeGst?: import("mongoose").SchemaDefinitionProperty<boolean, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    gstRate?: import("mongoose").SchemaDefinitionProperty<number | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    holidayRules?: import("mongoose").SchemaDefinitionProperty<HolidayRules, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    superannuationRules?: import("mongoose").SchemaDefinitionProperty<SuperannuationRules, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentCalendarEnabled?: import("mongoose").SchemaDefinitionProperty<boolean, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentCalendarSubscriptionId?: import("mongoose").SchemaDefinitionProperty<string | null, Contract, import("mongoose").Document<unknown, {}, Contract, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Contract & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Contract>;
