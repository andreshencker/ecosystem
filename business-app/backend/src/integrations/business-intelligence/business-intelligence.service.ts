import { Injectable, Logger } from '@nestjs/common';

import { BIHttpClient } from './client/bi-http-client';
import { BIUnavailableError } from './errors/bi-unavailable.error';
import type {
  BiCustomerListResponse,
  BiCustomerDetailResponse,
} from '../../modules/platform-admin/dto/bi-customer.dto';
import type {
  BiContractAdminListResponse,
  BiContractAdminDetail,
  BiContractAdminSummaryResponse,
  BiContractSupportIssueListResponse,
  BiContractAdminListParams,
  BiContractAdminSummaryParams,
} from './dto/responses/contract-admin.dto';
import type {
  BiShiftPendingAssignmentItem,
  BiShiftPendingAssignmentListResponse,
  BiShiftPendingSummaryResponse,
  BiShiftAssignmentListParams,
} from './dto/responses/shift-assignment.dto';

export type { BiCustomerListResponse, BiCustomerDetailResponse } from '../../modules/platform-admin/dto/bi-customer.dto';
export type {
  BiContractAdminListResponse,
  BiContractAdminDetail,
  BiContractAdminSummaryResponse,
  BiContractSupportIssueListResponse,
  BiContractAdminListParams,
  BiContractAdminSummaryParams,
  BiContractAdminListItem,
  BiContractSupportIssue,
} from './dto/responses/contract-admin.dto';
export type {
  BiShiftPendingAssignmentItem,
  BiShiftPendingAssignmentListResponse,
  BiShiftPendingSummaryResponse,
  BiShiftAssignmentListParams,
} from './dto/responses/shift-assignment.dto';

// Re-export canonical DTO interfaces so consumers import from a single location
export type { CustomerSummaryResult } from './dto/responses/customer-summary.dto';
export type { DashboardSummaryResult } from './dto/responses/dashboard-summary.dto';
export type { InvoiceSummaryResult } from './dto/responses/invoice-summary.dto';
export type { InvoiceSummaryParams } from './dto/requests/invoice-summary-params.dto';
export type {
  InvoiceSyncRequest,
  InvoiceSyncResult,
} from './dto/requests/invoice-sync.dto';
export type { BiQueryRequest } from './dto/requests/bi-query.dto';
export type { BiQueryResult } from './dto/responses/bi-query-result.dto';
export type {
  BiSemanticIndex,
  BiSemanticDomainDetail,
  BiSemanticMetadata,
} from './dto/responses/bi-semantic-metadata.dto';
export type { SyncResult } from './dto/responses/sync-result.dto';
export type { SyncStatus } from './dto/responses/sync-status.dto';
export type {
  PendingInvoiceGroup,
  PendingInvoiceGroupsResult,
  PendingShiftCalculation,
  PendingGroupStatus,
  ShiftCalcStatus,
} from './dto/responses/pending-invoice-groups.dto';

import type { CustomerSummaryResult } from './dto/responses/customer-summary.dto';
import type { DashboardSummaryResult } from './dto/responses/dashboard-summary.dto';
import type { InvoiceSummaryResult } from './dto/responses/invoice-summary.dto';
import type { InvoiceSummaryParams } from './dto/requests/invoice-summary-params.dto';
import type { InvoiceSyncResult } from './dto/requests/invoice-sync.dto';
import type { BiQueryRequest } from './dto/requests/bi-query.dto';
import type { BiQueryResult } from './dto/responses/bi-query-result.dto';
import type {
  BiSemanticIndex,
  BiSemanticDomainDetail,
  BiSemanticMetadata,
} from './dto/responses/bi-semantic-metadata.dto';
import type { SyncResult } from './dto/responses/sync-result.dto';
import type { SyncStatus } from './dto/responses/sync-status.dto';
import type { PendingInvoiceGroupsResult } from './dto/responses/pending-invoice-groups.dto';

/**
 * Facade for the Business Intelligence service.
 *
 * All HTTP is delegated to BIHttpClient. Methods that must never throw for
 * caller convenience (dashboard / summary fetches) swallow BIUnavailableError
 * and return null. Sync/query methods propagate BIUnavailableError so callers
 * can surface the failure.
 */
@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);

  constructor(private readonly client: BIHttpClient) {}

  // ── Read-only summary endpoints ──────────────────────────────────────────

  async getCustomerSummary(
    businessId: string,
    period?: string,
  ): Promise<CustomerSummaryResult | null> {
    const params: Record<string, string> = { businessId };
    if (period) params['period'] = period;
    try {
      return await this.client.get<CustomerSummaryResult>(
        '/internal/customers/summary',
        params,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        this.logger.error(
          `[BI] getCustomerSummary failed businessId=${businessId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }

  async getDashboardSummary(
    businessId: string,
    period?: string,
  ): Promise<DashboardSummaryResult | null> {
    const params: Record<string, string> = { businessId };
    if (period) params['period'] = period;
    try {
      return await this.client.get<DashboardSummaryResult>(
        '/internal/dashboard/summary',
        params,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        this.logger.error(
          `[BI] getDashboardSummary failed businessId=${businessId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }

  async getInvoiceSummary(
    params: InvoiceSummaryParams,
  ): Promise<InvoiceSummaryResult | null> {
    const queryParams: Record<string, string> = {
      businessId: params.businessId,
    };
    if (params.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params.currency) queryParams['currency'] = params.currency;
    if (params.customerId) queryParams['customerId'] = params.customerId;
    try {
      return await this.client.get<InvoiceSummaryResult>(
        '/internal/invoices/summary',
        queryParams,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        this.logger.error(
          `[BI] getInvoiceSummary failed businessId=${params.businessId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }

  // ── Sync endpoints ───────────────────────────────────────────────────────

  async syncInvoices(
    companyId: string,
    full = false,
  ): Promise<InvoiceSyncResult | null> {
    try {
      return await this.client.post<
        { companyId: string; full: boolean },
        InvoiceSyncResult
      >('/internal/sync/invoices', { companyId, full });
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        this.logger.error(
          `[BI] syncInvoices failed companyId=${companyId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }

  async syncModel(
    companyId: string,
    model: string,
    full = false,
  ): Promise<SyncResult> {
    return this.client.post<
      { companyId: string; full: boolean },
      SyncResult
    >(`/internal/sync/${encodeURIComponent(model)}`, { companyId, full });
  }

  async syncAll(companyId: string, full = false): Promise<SyncResult> {
    return this.client.post<
      { companyId: string; full: boolean },
      SyncResult
    >('/internal/sync', { companyId, full });
  }

  async getSyncStatus(companyId: string): Promise<SyncStatus> {
    return this.client.get<SyncStatus>(
      `/internal/sync/status/${encodeURIComponent(companyId)}`,
    );
  }

  // ── Semantic layer ───────────────────────────────────────────────────────

  async query(params: BiQueryRequest): Promise<BiQueryResult> {
    return this.client.post<BiQueryRequest, BiQueryResult>(
      '/internal/query',
      params,
    );
  }

  async getSemanticMetadata(domain?: string): Promise<BiSemanticMetadata> {
    if (domain) {
      return this.client.get<BiSemanticDomainDetail>(
        `/internal/semantic/${encodeURIComponent(domain)}`,
      );
    }
    return this.client.get<BiSemanticIndex>('/internal/semantic');
  }

  // ── Platform Admin customer endpoints ────────────────────────────────────────

  async listPlatformAdminCustomers(params: {
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
  }): Promise<BiCustomerListResponse> {
    const query: Record<string, string> = {};
    if (params.businessId) query['businessId'] = params.businessId;
    if (params.page !== undefined) query['page'] = String(params.page);
    if (params.limit !== undefined) query['limit'] = String(params.limit);
    if (params.search) query['search'] = params.search;
    if (params.isActive !== undefined) query['isActive'] = String(params.isActive);
    if (params.customerType) query['customerType'] = params.customerType;
    if (params.hasContacts !== undefined) query['hasContacts'] = String(params.hasContacts);
    if (params.hasLocations !== undefined) query['hasLocations'] = String(params.hasLocations);
    if (params.hasCommunicationConfiguration !== undefined)
      query['hasCommunicationConfiguration'] = String(params.hasCommunicationConfiguration);
    if (params.hasDataQualityIssues !== undefined)
      query['hasDataQualityIssues'] = String(params.hasDataQualityIssues);
    return this.client.get<BiCustomerListResponse>('/internal/customers', query);
  }

  async getPlatformAdminCustomerDetail(
    customerId: string,
    businessId?: string,
  ): Promise<BiCustomerDetailResponse | null> {
    const query: Record<string, string> = {};
    if (businessId) query['businessId'] = businessId;
    try {
      return await this.client.get<BiCustomerDetailResponse>(
        `/internal/customers/${encodeURIComponent(customerId)}`,
        query,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  // ── Platform Admin contract endpoints ────────────────────────────────────────

  async getContractAdminSummary(
    params: BiContractAdminSummaryParams,
  ): Promise<BiContractAdminSummaryResponse> {
    const query: Record<string, string> = {};
    if (params.businessId)  query['businessId']  = params.businessId;
    if (params.status)      query['status']      = params.status;
    if (params.createdFrom) query['createdFrom'] = params.createdFrom;
    if (params.createdTo)   query['createdTo']   = params.createdTo;
    return this.client.get<BiContractAdminSummaryResponse>(
      '/internal/contracts/admin/summary',
      query,
    );
  }

  async listPlatformAdminContracts(
    params: BiContractAdminListParams,
  ): Promise<BiContractAdminListResponse> {
    const query: Record<string, string> = {};
    if (params.businessId)              query['businessId']              = params.businessId;
    if (params.customerId)              query['customerId']              = params.customerId;
    if (params.status)                  query['status']                  = params.status;
    if (params.workType)                query['workType']                = params.workType;
    if (params.billingCycle)            query['billingCycle']            = params.billingCycle;
    if (params.currency)                query['currency']                = params.currency;
    if (params.chargeGst !== undefined) query['chargeGst']               = String(params.chargeGst);
    if (params.superEnabled !== undefined) query['superEnabled']         = String(params.superEnabled);
    if (params.holidayRulesEnabled !== undefined) query['holidayRulesEnabled'] = String(params.holidayRulesEnabled);
    if (params.paymentCalendarEnabled !== undefined) query['paymentCalendarEnabled'] = String(params.paymentCalendarEnabled);
    if (params.configurationStatus)     query['configurationStatus']     = params.configurationStatus;
    if (params.search)                  query['search']                  = params.search;
    if (params.startDateFrom)           query['startDateFrom']           = params.startDateFrom;
    if (params.startDateTo)             query['startDateTo']             = params.startDateTo;
    if (params.createdFrom)             query['createdFrom']             = params.createdFrom;
    if (params.createdTo)               query['createdTo']               = params.createdTo;
    if (params.updatedFrom)             query['updatedFrom']             = params.updatedFrom;
    if (params.updatedTo)               query['updatedTo']               = params.updatedTo;
    if (params.page !== undefined)      query['page']                    = String(params.page);
    if (params.limit !== undefined)     query['limit']                   = String(params.limit);
    if (params.sortBy)                  query['sortBy']                  = params.sortBy;
    if (params.sortDir)                 query['sortDir']                 = params.sortDir;
    return this.client.get<BiContractAdminListResponse>(
      '/internal/contracts/admin',
      query,
    );
  }

  async getPlatformAdminContractDetail(
    contractId: string,
    businessId?: string,
  ): Promise<BiContractAdminDetail | null> {
    const query: Record<string, string> = {};
    if (businessId) query['businessId'] = businessId;
    try {
      return await this.client.get<BiContractAdminDetail>(
        `/internal/contracts/admin/${encodeURIComponent(contractId)}`,
        query,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  async getPlatformAdminContractSupportIssues(
    contractId: string,
    businessId?: string,
  ): Promise<BiContractSupportIssueListResponse | null> {
    const query: Record<string, string> = {};
    if (businessId) query['businessId'] = businessId;
    try {
      return await this.client.get<BiContractSupportIssueListResponse>(
        `/internal/contracts/admin/${encodeURIComponent(contractId)}/issues`,
        query,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  // ── Shift pending-assignment endpoints ───────────────────────────────────────

  async getShiftAssignmentSummary(
    params: { businessId?: string },
  ): Promise<BiShiftPendingSummaryResponse> {
    const query: Record<string, string> = {};
    if (params.businessId) query['businessId'] = params.businessId;
    return this.client.get<BiShiftPendingSummaryResponse>(
      '/internal/shifts/assignment/summary',
      query,
    );
  }

  async getPendingShiftAssignments(
    params: BiShiftAssignmentListParams,
  ): Promise<BiShiftPendingAssignmentListResponse> {
    const query: Record<string, string> = {};
    if (params.businessId)      query['businessId']      = params.businessId;
    if (params.linkedCalendarId) query['linkedCalendarId'] = params.linkedCalendarId;
    if (params.dateFrom)        query['dateFrom']         = params.dateFrom;
    if (params.dateTo)          query['dateTo']           = params.dateTo;
    if (params.minAgeDays !== undefined) query['minAgeDays'] = String(params.minAgeDays);
    if (params.search)          query['search']           = params.search;
    if (params.page !== undefined) query['page']          = String(params.page);
    if (params.limit !== undefined) query['limit']        = String(params.limit);
    if (params.sortBy)          query['sortBy']           = params.sortBy;
    if (params.sortDir)         query['sortDir']          = params.sortDir;
    return this.client.get<BiShiftPendingAssignmentListResponse>(
      '/internal/shifts/assignment/pending',
      query,
    );
  }

  async getPendingShiftAssignmentDetail(
    shiftId: string,
    businessId?: string,
  ): Promise<BiShiftPendingAssignmentItem | null> {
    const query: Record<string, string> = {};
    if (businessId) query['businessId'] = businessId;
    try {
      return await this.client.get<BiShiftPendingAssignmentItem>(
        `/internal/shifts/assignment/pending/${encodeURIComponent(shiftId)}`,
        query,
      );
    } catch (err) {
      if (err instanceof BIUnavailableError && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  // ── Pending invoice groups ────────────────────────────────────────────────

  async getPendingInvoiceGroups(
    businessId: string,
  ): Promise<PendingInvoiceGroupsResult | null> {
    try {
      return await this.client.get<PendingInvoiceGroupsResult>(
        '/internal/invoices/pending-groups',
        { businessId },
      );
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        this.logger.error(
          `[BI] getPendingInvoiceGroups failed businessId=${businessId}: ${err.message}`,
        );
        return null;
      }
      throw err;
    }
  }
}

// Backwards-compatibility alias — existing imports of BiClientService still compile
// during the migration window.
export { BusinessIntelligenceService as BiClientService };
