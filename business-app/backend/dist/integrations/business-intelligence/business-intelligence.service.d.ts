import { BIHttpClient } from './client/bi-http-client';
import type { BiCustomerListResponse, BiCustomerDetailResponse } from '../../modules/platform-admin/dto/bi-customer.dto';
import type { BiContractAdminListResponse, BiContractAdminDetail, BiContractAdminSummaryResponse, BiContractSupportIssueListResponse, BiContractAdminListParams, BiContractAdminSummaryParams } from './dto/responses/contract-admin.dto';
import type { BiShiftPendingAssignmentItem, BiShiftPendingAssignmentListResponse, BiShiftPendingSummaryResponse, BiShiftAssignmentListParams } from './dto/responses/shift-assignment.dto';
export type { BiCustomerListResponse, BiCustomerDetailResponse } from '../../modules/platform-admin/dto/bi-customer.dto';
export type { BiContractAdminListResponse, BiContractAdminDetail, BiContractAdminSummaryResponse, BiContractSupportIssueListResponse, BiContractAdminListParams, BiContractAdminSummaryParams, BiContractAdminListItem, BiContractSupportIssue, } from './dto/responses/contract-admin.dto';
export type { BiShiftPendingAssignmentItem, BiShiftPendingAssignmentListResponse, BiShiftPendingSummaryResponse, BiShiftAssignmentListParams, } from './dto/responses/shift-assignment.dto';
export type { CustomerSummaryResult } from './dto/responses/customer-summary.dto';
export type { DashboardSummaryResult } from './dto/responses/dashboard-summary.dto';
export type { InvoiceSummaryResult } from './dto/responses/invoice-summary.dto';
export type { InvoiceSummaryParams } from './dto/requests/invoice-summary-params.dto';
export type { InvoiceSyncRequest, InvoiceSyncResult, } from './dto/requests/invoice-sync.dto';
export type { BiQueryRequest } from './dto/requests/bi-query.dto';
export type { BiQueryResult } from './dto/responses/bi-query-result.dto';
export type { BiSemanticIndex, BiSemanticDomainDetail, BiSemanticMetadata, } from './dto/responses/bi-semantic-metadata.dto';
export type { SyncResult } from './dto/responses/sync-result.dto';
export type { SyncStatus } from './dto/responses/sync-status.dto';
export type { PendingInvoiceGroup, PendingInvoiceGroupsResult, PendingShiftCalculation, PendingGroupStatus, ShiftCalcStatus, } from './dto/responses/pending-invoice-groups.dto';
import type { CustomerSummaryResult } from './dto/responses/customer-summary.dto';
import type { DashboardSummaryResult } from './dto/responses/dashboard-summary.dto';
import type { InvoiceSummaryResult } from './dto/responses/invoice-summary.dto';
import type { InvoiceSummaryParams } from './dto/requests/invoice-summary-params.dto';
import type { InvoiceSyncResult } from './dto/requests/invoice-sync.dto';
import type { BiQueryRequest } from './dto/requests/bi-query.dto';
import type { BiQueryResult } from './dto/responses/bi-query-result.dto';
import type { BiSemanticMetadata } from './dto/responses/bi-semantic-metadata.dto';
import type { SyncResult } from './dto/responses/sync-result.dto';
import type { SyncStatus } from './dto/responses/sync-status.dto';
import type { PendingInvoiceGroupsResult } from './dto/responses/pending-invoice-groups.dto';
import type { ShiftInvoiceBiResult } from './contracts/invoice/shift-invoice';
export declare class BusinessIntelligenceService {
    private readonly client;
    private readonly logger;
    constructor(client: BIHttpClient);
    getShiftInvoiceDocument(businessId: string, invoiceId: string): Promise<ShiftInvoiceBiResult>;
    getCustomerSummary(businessId: string, period?: string): Promise<CustomerSummaryResult | null>;
    getDashboardSummary(businessId: string, period?: string): Promise<DashboardSummaryResult | null>;
    getInvoiceSummary(params: InvoiceSummaryParams): Promise<InvoiceSummaryResult | null>;
    syncInvoices(companyId: string, full?: boolean): Promise<InvoiceSyncResult | null>;
    syncModel(companyId: string, model: string, full?: boolean): Promise<SyncResult>;
    syncAll(companyId: string, full?: boolean): Promise<SyncResult>;
    getSyncStatus(companyId: string): Promise<SyncStatus>;
    query(params: BiQueryRequest): Promise<BiQueryResult>;
    getSemanticMetadata(domain?: string): Promise<BiSemanticMetadata>;
    listPlatformAdminCustomers(params: {
        businessId?: string;
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
        customerType?: string;
        hasContacts?: boolean;
        hasLocations?: boolean;
        hasCommunicationConfiguration?: boolean;
        hasDataQualityIssues?: boolean;
    }): Promise<BiCustomerListResponse>;
    getPlatformAdminCustomerDetail(customerId: string, businessId?: string): Promise<BiCustomerDetailResponse | null>;
    getContractAdminSummary(params: BiContractAdminSummaryParams): Promise<BiContractAdminSummaryResponse>;
    listPlatformAdminContracts(params: BiContractAdminListParams): Promise<BiContractAdminListResponse>;
    getPlatformAdminContractDetail(contractId: string, businessId?: string): Promise<BiContractAdminDetail | null>;
    getPlatformAdminContractSupportIssues(contractId: string, businessId?: string): Promise<BiContractSupportIssueListResponse | null>;
    getShiftAssignmentSummary(params: {
        businessId?: string;
    }): Promise<BiShiftPendingSummaryResponse>;
    getPendingShiftAssignments(params: BiShiftAssignmentListParams): Promise<BiShiftPendingAssignmentListResponse>;
    getPendingShiftAssignmentDetail(shiftId: string, businessId?: string): Promise<BiShiftPendingAssignmentItem | null>;
    getPendingInvoiceGroups(businessId: string): Promise<PendingInvoiceGroupsResult | null>;
    getReceivablesSummary(businessId: string, filters?: Record<string, string | undefined>): Promise<{
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
    getInvoiceCashFlow(businessId: string, filters?: Record<string, string | undefined>): Promise<unknown>;
}
export { BusinessIntelligenceService as BiClientService };
