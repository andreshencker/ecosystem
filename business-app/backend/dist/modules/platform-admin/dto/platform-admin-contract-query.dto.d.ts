export declare class PlatformAdminContractQueryDto {
    search?: string;
    businessId?: string;
    customerId?: string;
    status?: string;
    workType?: string;
    billingCycle?: string;
    currency?: string;
    configurationStatus?: string;
    chargeGst?: boolean;
    superEnabled?: boolean;
    holidayRulesEnabled?: boolean;
    paymentCalendarEnabled?: boolean;
    updatedFrom?: string;
    updatedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
}
export declare class PlatformAdminContractSummaryQueryDto {
    businessId?: string;
    status?: string;
    createdFrom?: string;
    createdTo?: string;
}
