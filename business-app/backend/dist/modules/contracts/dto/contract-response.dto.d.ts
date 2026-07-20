import type { ContractDocument, ContractStatus, BillingCycle, RateType, WorkType, HolidayBehaviour, SuperPaymentFrequency, ScheduledPaymentDay } from '../schemas/contract.schema';
export interface HolidayRulesResponseDto {
    enabled: boolean;
    calendarId: string | null;
    calendarName: string | null;
    calendarProviderName: string | null;
    behaviour: HolidayBehaviour | null;
    multiplier: number | null;
    fixedHourlyRate: number | null;
}
export interface SuperannuationRulesResponseDto {
    enabled: boolean;
    rate: number | null;
    paymentFrequency: SuperPaymentFrequency | null;
}
export interface RateRuleResponseDto {
    days: string[];
    startTime: string | null;
    endTime: string | null;
    hourlyRate: number;
}
export interface ContractResponseDto {
    id: string;
    businessId: string;
    customerId: string;
    customerName: string | null;
    startDate: string;
    endDate: string | null;
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
    rates: RateRuleResponseDto[];
    notes: string | null;
    useInvoicePrefix: boolean;
    invoicePrefix: string | null;
    startingInvoiceNumber: number;
    currency: string;
    chargeGst: boolean;
    gstRate: number | null;
    holidayRules: HolidayRulesResponseDto;
    superannuationRules: SuperannuationRulesResponseDto;
    paymentCalendarEnabled: boolean;
    paymentCalendarSubscriptionId: string | null;
    createdAt: string;
    updatedAt: string;
}
export declare function toContractResponse(doc: ContractDocument | Record<string, any>): ContractResponseDto;
