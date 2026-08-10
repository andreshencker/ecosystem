import { BusinessIntelligenceService as BiClientService } from '../integrations/business-intelligence/business-intelligence.service';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';
export declare class AnalyticsController {
    private readonly bi;
    constructor(bi: BiClientService);
    private resolveCompanyId;
    getCustomerSummary(ctx: AuthContext, period?: string): Promise<import("../integrations/business-intelligence/business-intelligence.service").CustomerSummaryResult>;
    getDashboardSummary(ctx: AuthContext, period?: string): Promise<import("../integrations/business-intelligence/business-intelligence.service").DashboardSummaryResult>;
    getShiftAssignmentSummary(ctx: AuthContext): Promise<import("../integrations/business-intelligence/business-intelligence.service").BiShiftPendingSummaryResponse>;
    getPendingInvoiceGroups(ctx: AuthContext): Promise<import("../integrations/business-intelligence/business-intelligence.service").PendingInvoiceGroupsResult>;
    getReceivablesSummary(ctx: AuthContext, dateFrom?: string, dateTo?: string, customerId?: string, invoiceStatus?: string, search?: string): Promise<{
        currency: string;
        totalIncome: string;
        outstanding: string;
        paid: string;
        invoiceCount: number;
        trend: Array<{
            label: string;
            totalIncome: string;
            paid: string;
            outstanding: string;
        }>;
        statuses: Array<{
            label: string;
            value: string;
            count: number;
        }>;
        customers: Array<{
            label: string;
            totalIncome: string;
            paid: string;
            outstanding: string;
            overdue: string;
            count: number;
        }>;
        aging: Array<{
            label: string;
            value: string;
            count: number;
        }>;
        paymentTrend: Array<{
            label: string;
            paid: string;
            count: number;
        }>;
        overdue: string;
        overdueCount: number;
        collectionRate: string;
        customerTimeline: Array<{
            label: string;
            customer: string;
            totalIncome: string;
            paid: string;
            outstanding: string;
            share: string;
        }>;
        customerGrowth: Array<{
            label: string;
            current: string;
            previous: string;
            growthRate: string;
        }>;
    }>;
    getInvoiceCashFlow(ctx: AuthContext, dateFrom?: string, dateTo?: string, customerId?: string): Promise<unknown>;
    getShiftPendingList(ctx: AuthContext, rawPage?: string, rawLimit?: string, linkedCalendarId?: string, dateFrom?: string, dateTo?: string, search?: string): Promise<import("../integrations/business-intelligence/business-intelligence.service").BiShiftPendingAssignmentListResponse>;
}
