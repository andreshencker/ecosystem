"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BusinessIntelligenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiClientService = exports.BusinessIntelligenceService = void 0;
const common_1 = require("@nestjs/common");
const bi_http_client_1 = require("./client/bi-http-client");
const bi_unavailable_error_1 = require("./errors/bi-unavailable.error");
let BusinessIntelligenceService = BusinessIntelligenceService_1 = class BusinessIntelligenceService {
    client;
    logger = new common_1.Logger(BusinessIntelligenceService_1.name);
    constructor(client) {
        this.client = client;
    }
    async getCustomerSummary(businessId, period) {
        const params = { businessId };
        if (period)
            params['period'] = period;
        try {
            return await this.client.get('/internal/customers/summary', params);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                this.logger.error(`[BI] getCustomerSummary failed businessId=${businessId}: ${err.message}`);
                return null;
            }
            throw err;
        }
    }
    async getDashboardSummary(businessId, period) {
        const params = { businessId };
        if (period)
            params['period'] = period;
        try {
            return await this.client.get('/internal/dashboard/summary', params);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                this.logger.error(`[BI] getDashboardSummary failed businessId=${businessId}: ${err.message}`);
                return null;
            }
            throw err;
        }
    }
    async getInvoiceSummary(params) {
        const queryParams = {
            businessId: params.businessId,
        };
        if (params.dateFrom)
            queryParams['dateFrom'] = params.dateFrom;
        if (params.dateTo)
            queryParams['dateTo'] = params.dateTo;
        if (params.currency)
            queryParams['currency'] = params.currency;
        if (params.customerId)
            queryParams['customerId'] = params.customerId;
        try {
            return await this.client.get('/internal/invoices/summary', queryParams);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                this.logger.error(`[BI] getInvoiceSummary failed businessId=${params.businessId}: ${err.message}`);
                return null;
            }
            throw err;
        }
    }
    async syncInvoices(companyId, full = false) {
        try {
            return await this.client.post('/internal/sync/invoices', { companyId, full });
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError) {
                this.logger.error(`[BI] syncInvoices failed companyId=${companyId}: ${err.message}`);
                return null;
            }
            throw err;
        }
    }
    async syncModel(companyId, model, full = false) {
        return this.client.post(`/internal/sync/${encodeURIComponent(model)}`, { companyId, full });
    }
    async syncAll(companyId, full = false) {
        return this.client.post('/internal/sync', { companyId, full });
    }
    async getSyncStatus(companyId) {
        return this.client.get(`/internal/sync/status/${encodeURIComponent(companyId)}`);
    }
    async query(params) {
        return this.client.post('/internal/query', params);
    }
    async getSemanticMetadata(domain) {
        if (domain) {
            return this.client.get(`/internal/semantic/${encodeURIComponent(domain)}`);
        }
        return this.client.get('/internal/semantic');
    }
    async listPlatformAdminCustomers(params) {
        const query = {};
        if (params.businessId)
            query['businessId'] = params.businessId;
        if (params.page !== undefined)
            query['page'] = String(params.page);
        if (params.limit !== undefined)
            query['limit'] = String(params.limit);
        if (params.search)
            query['search'] = params.search;
        if (params.isActive !== undefined)
            query['isActive'] = String(params.isActive);
        if (params.customerType)
            query['customerType'] = params.customerType;
        if (params.hasContacts !== undefined)
            query['hasContacts'] = String(params.hasContacts);
        if (params.hasLocations !== undefined)
            query['hasLocations'] = String(params.hasLocations);
        if (params.hasCommunicationConfiguration !== undefined)
            query['hasCommunicationConfiguration'] = String(params.hasCommunicationConfiguration);
        if (params.hasDataQualityIssues !== undefined)
            query['hasDataQualityIssues'] = String(params.hasDataQualityIssues);
        return this.client.get('/internal/customers', query);
    }
    async getPlatformAdminCustomerDetail(customerId, businessId) {
        const query = {};
        if (businessId)
            query['businessId'] = businessId;
        try {
            return await this.client.get(`/internal/customers/${encodeURIComponent(customerId)}`, query);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError && err.message.includes('404')) {
                return null;
            }
            throw err;
        }
    }
    async getContractAdminSummary(params) {
        const query = {};
        if (params.businessId)
            query['businessId'] = params.businessId;
        if (params.status)
            query['status'] = params.status;
        if (params.createdFrom)
            query['createdFrom'] = params.createdFrom;
        if (params.createdTo)
            query['createdTo'] = params.createdTo;
        return this.client.get('/internal/contracts/admin/summary', query);
    }
    async listPlatformAdminContracts(params) {
        const query = {};
        if (params.businessId)
            query['businessId'] = params.businessId;
        if (params.customerId)
            query['customerId'] = params.customerId;
        if (params.status)
            query['status'] = params.status;
        if (params.workType)
            query['workType'] = params.workType;
        if (params.billingCycle)
            query['billingCycle'] = params.billingCycle;
        if (params.currency)
            query['currency'] = params.currency;
        if (params.chargeGst !== undefined)
            query['chargeGst'] = String(params.chargeGst);
        if (params.superEnabled !== undefined)
            query['superEnabled'] = String(params.superEnabled);
        if (params.holidayRulesEnabled !== undefined)
            query['holidayRulesEnabled'] = String(params.holidayRulesEnabled);
        if (params.paymentCalendarEnabled !== undefined)
            query['paymentCalendarEnabled'] = String(params.paymentCalendarEnabled);
        if (params.configurationStatus)
            query['configurationStatus'] = params.configurationStatus;
        if (params.search)
            query['search'] = params.search;
        if (params.startDateFrom)
            query['startDateFrom'] = params.startDateFrom;
        if (params.startDateTo)
            query['startDateTo'] = params.startDateTo;
        if (params.createdFrom)
            query['createdFrom'] = params.createdFrom;
        if (params.createdTo)
            query['createdTo'] = params.createdTo;
        if (params.updatedFrom)
            query['updatedFrom'] = params.updatedFrom;
        if (params.updatedTo)
            query['updatedTo'] = params.updatedTo;
        if (params.page !== undefined)
            query['page'] = String(params.page);
        if (params.limit !== undefined)
            query['limit'] = String(params.limit);
        if (params.sortBy)
            query['sortBy'] = params.sortBy;
        if (params.sortDir)
            query['sortDir'] = params.sortDir;
        return this.client.get('/internal/contracts/admin', query);
    }
    async getPlatformAdminContractDetail(contractId, businessId) {
        const query = {};
        if (businessId)
            query['businessId'] = businessId;
        try {
            return await this.client.get(`/internal/contracts/admin/${encodeURIComponent(contractId)}`, query);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError && err.message.includes('404')) {
                return null;
            }
            throw err;
        }
    }
    async getPlatformAdminContractSupportIssues(contractId, businessId) {
        const query = {};
        if (businessId)
            query['businessId'] = businessId;
        try {
            return await this.client.get(`/internal/contracts/admin/${encodeURIComponent(contractId)}/issues`, query);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError && err.message.includes('404')) {
                return null;
            }
            throw err;
        }
    }
    async getShiftAssignmentSummary(params) {
        const query = {};
        if (params.businessId)
            query['businessId'] = params.businessId;
        return this.client.get('/internal/shifts/assignment/summary', query);
    }
    async getPendingShiftAssignments(params) {
        const query = {};
        if (params.businessId)
            query['businessId'] = params.businessId;
        if (params.linkedCalendarId)
            query['linkedCalendarId'] = params.linkedCalendarId;
        if (params.dateFrom)
            query['dateFrom'] = params.dateFrom;
        if (params.dateTo)
            query['dateTo'] = params.dateTo;
        if (params.minAgeDays !== undefined)
            query['minAgeDays'] = String(params.minAgeDays);
        if (params.search)
            query['search'] = params.search;
        if (params.page !== undefined)
            query['page'] = String(params.page);
        if (params.limit !== undefined)
            query['limit'] = String(params.limit);
        if (params.sortBy)
            query['sortBy'] = params.sortBy;
        if (params.sortDir)
            query['sortDir'] = params.sortDir;
        return this.client.get('/internal/shifts/assignment/pending', query);
    }
    async getPendingShiftAssignmentDetail(shiftId, businessId) {
        const query = {};
        if (businessId)
            query['businessId'] = businessId;
        try {
            return await this.client.get(`/internal/shifts/assignment/pending/${encodeURIComponent(shiftId)}`, query);
        }
        catch (err) {
            if (err instanceof bi_unavailable_error_1.BIUnavailableError && err.message.includes('404')) {
                return null;
            }
            throw err;
        }
    }
};
exports.BusinessIntelligenceService = BusinessIntelligenceService;
exports.BiClientService = BusinessIntelligenceService;
exports.BiClientService = exports.BusinessIntelligenceService = BusinessIntelligenceService = BusinessIntelligenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bi_http_client_1.BIHttpClient])
], BusinessIntelligenceService);
//# sourceMappingURL=business-intelligence.service.js.map