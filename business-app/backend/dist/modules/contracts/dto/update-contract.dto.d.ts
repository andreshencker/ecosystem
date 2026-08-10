import { HolidayRulesDto, RateRuleDto, SuperannuationRulesDto } from './create-contract.dto';
import type { WorkType } from '../schemas/contract.schema';
export declare class UpdateContractDto {
    startDate?: string;
    endDate?: string | null;
    positionName?: string;
    workType?: WorkType;
    invoiceDescription?: string;
    billingCycle?: 'per_shift' | 'daily' | 'weekly' | 'fortnightly' | 'monthly';
    invoiceDueRule?: 'from_invoice_date' | 'end_of_week' | 'end_of_month';
    paymentTermsDays?: number | null;
    scheduledPaymentEnabled?: boolean;
    scheduledPaymentDay?: string | null;
    rateType?: 'fixed' | 'variable' | 'variable_time_range';
    minimumHours?: number;
    defaultBreakMinutes?: number;
    rates?: RateRuleDto[];
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
