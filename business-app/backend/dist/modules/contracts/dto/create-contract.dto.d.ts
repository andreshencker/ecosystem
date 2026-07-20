import type { WorkType, HolidayBehaviour, SuperPaymentFrequency } from '../schemas/contract.schema';
export declare class HolidayRulesDto {
    enabled?: boolean;
    calendarId?: string | null;
    calendarName?: string | null;
    calendarProviderName?: string | null;
    behaviour?: HolidayBehaviour | null;
    multiplier?: number | null;
    fixedHourlyRate?: number | null;
}
export declare class SuperannuationRulesDto {
    enabled?: boolean;
    rate?: number | null;
    paymentFrequency?: SuperPaymentFrequency | null;
}
export declare class RateRuleDto {
    days: string[];
    startTime?: string | null;
    endTime?: string | null;
    hourlyRate: number;
}
export declare class CreateContractDto {
    customerId: string;
    startDate: string;
    endDate?: string;
    positionName: string;
    workType?: WorkType;
    invoiceDescription: string;
    billingCycle: 'per_shift' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';
    paymentTermsDays?: number | null;
    scheduledPaymentEnabled?: boolean;
    scheduledPaymentDay?: string | null;
    rateType: 'fixed' | 'variable' | 'variable_time_range';
    minimumHours?: number;
    defaultBreakMinutes?: number;
    rates: RateRuleDto[];
    notes?: string;
    useInvoicePrefix?: boolean;
    invoicePrefix?: string | null;
    startingInvoiceNumber?: number;
    currency?: string;
    chargeGst?: boolean;
    gstRate?: number | null;
    holidayRules?: HolidayRulesDto;
    superannuationRules?: SuperannuationRulesDto;
    paymentCalendarEnabled?: boolean;
    paymentCalendarSubscriptionId?: string | null;
}
