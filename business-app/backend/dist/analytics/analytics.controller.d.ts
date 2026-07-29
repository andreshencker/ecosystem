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
    getShiftPendingList(ctx: AuthContext, rawPage?: string, rawLimit?: string, linkedCalendarId?: string, dateFrom?: string, dateTo?: string, search?: string): Promise<import("../integrations/business-intelligence/business-intelligence.service").BiShiftPendingAssignmentListResponse>;
}
