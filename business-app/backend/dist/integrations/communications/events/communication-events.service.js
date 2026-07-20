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
var CommunicationEventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationEventsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const communication_connection_service_1 = require("../connection/communication-connection.service");
let CommunicationEventsService = CommunicationEventsService_1 = class CommunicationEventsService {
    connections;
    http;
    config;
    logger = new common_1.Logger(CommunicationEventsService_1.name);
    constructor(connections, http, config) {
        this.connections = connections;
        this.http = http;
        this.config = config;
    }
    get baseUrl() {
        return (this.config.get('COMMUNICATION_API_URL') ?? 'http://localhost:3001').replace(/\/$/, '');
    }
    get adminApiKey() {
        return this.config.get('COMMUNICATION_API_KEY') ?? '';
    }
    commsHeaders() {
        const key = this.adminApiKey;
        if (!key) {
            this.logger.error('[commsHeaders] COMMUNICATION_API_KEY is not set');
        }
        return { 'x-api-key': key };
    }
    async resolveConn(businessId) {
        const conn = await this.connections.getCommunicationConnectionForContext('business', businessId);
        if (!conn || !conn.isActive) {
            throw new common_1.HttpException('Communications integration is not configured. Go to Settings → Communications to connect.', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        this.logger.debug(`[resolveConn] businessId=${businessId} remoteCompanyId=${conn.communicationCompanyId}`);
        return conn;
    }
    forwardError(err, fallback) {
        const e = err;
        const status = e?.response?.status ?? common_1.HttpStatus.BAD_GATEWAY;
        const raw = e?.response?.data?.message;
        const message = Array.isArray(raw)
            ? raw.join(', ')
            : typeof raw === 'string' && raw
                ? raw
                : fallback;
        this.logger.warn(`[forwardError] HTTP ${status} — ${message}`);
        throw new common_1.HttpException(message, status);
    }
    async fetchAndAssertOwnership(id, remoteCompanyId) {
        const url = `${this.baseUrl}/event-catalogue/${id}?populateDomainCatalogue=true`;
        this.logger.debug(`[ownership] GET ${url}`);
        let event;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            event = res.data;
        }
        catch (err) {
            this.forwardError(err, 'Communication event not found');
        }
        const domain = event.domainCatalogueId;
        const domainCompanyId = typeof domain === 'object' && domain !== null
            ? String(domain.companyId ?? '')
            : '';
        if (!domainCompanyId || domainCompanyId !== remoteCompanyId) {
            this.logger.warn(`[ownership] DENIED — event ${id} belongs to company ${domainCompanyId}, ` +
                `not ${remoteCompanyId}`);
            throw new common_1.ForbiddenException('Access denied to this communication event');
        }
        return event;
    }
    async list(businessId, params) {
        const conn = await this.resolveConn(businessId);
        const limit = params.limit ?? 50;
        const offset = ((params.page ?? 1) - 1) * limit;
        const qs = new URLSearchParams({
            domainCatalogueId: params.domainCatalogueId,
            populateDomainCatalogue: 'true',
            limit: String(limit),
            offset: String(offset),
        });
        if (params.active !== undefined)
            qs.set('active', String(params.active));
        const url = `${this.baseUrl}/event-catalogue?${qs}`;
        this.logger.debug(`[list] GET ${url}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[list] HTTP ${res.status} — total=${res.data?.total ?? '?'}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to load communication events');
        }
    }
    async findOne(businessId, id) {
        const conn = await this.resolveConn(businessId);
        return this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
    }
    async create(businessId, dto) {
        const conn = await this.resolveConn(businessId);
        const domainUrl = `${this.baseUrl}/domain-catalogue/${dto.domainCatalogueId}`;
        try {
            const domainRes = await (0, rxjs_1.firstValueFrom)(this.http.get(domainUrl, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            const domainCompanyId = String(domainRes.data?.companyId ?? '');
            if (domainCompanyId !== conn.communicationCompanyId) {
                throw new common_1.ForbiddenException('Access denied to this communication purpose');
            }
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException)
                throw err;
            this.forwardError(err, 'Communication purpose not found');
        }
        const body = {
            domainCatalogueId: dto.domainCatalogueId,
            eventKey: dto.eventKey,
            displayName: dto.displayName,
            description: dto.description ?? '',
            eventType: dto.eventType,
            channelContent: dto.channelContent ?? {},
            isActive: dto.isActive ?? true,
        };
        const url = `${this.baseUrl}/event-catalogue`;
        this.logger.debug(`[create] POST ${url} eventKey=${dto.eventKey} domain=${dto.domainCatalogueId}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[create] HTTP ${res.status} id=${res.data?.id}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to create communication event');
        }
    }
    async update(businessId, id, dto) {
        const conn = await this.resolveConn(businessId);
        await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
        const url = `${this.baseUrl}/event-catalogue/${id}`;
        this.logger.debug(`[update] PATCH ${url}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.patch(url, dto, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[update] HTTP ${res.status}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to update communication event');
        }
    }
    async remove(businessId, id) {
        const conn = await this.resolveConn(businessId);
        await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
        const url = `${this.baseUrl}/event-catalogue/${id}`;
        this.logger.debug(`[remove] DELETE ${url}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.delete(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[remove] HTTP ${res.status}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to delete communication event');
        }
    }
    async bulkImport(businessId, domainCatalogueId, items) {
        const conn = await this.resolveConn(businessId);
        const domainUrl = `${this.baseUrl}/domain-catalogue/${domainCatalogueId}`;
        try {
            const domainRes = await (0, rxjs_1.firstValueFrom)(this.http.get(domainUrl, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            const domainCompanyId = String(domainRes.data?.companyId ?? '');
            if (domainCompanyId !== conn.communicationCompanyId) {
                throw new common_1.ForbiddenException('Access denied to this communication purpose');
            }
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException)
                throw err;
            this.forwardError(err, 'Communication purpose not found');
        }
        const body = { domainCatalogueId, items };
        const url = `${this.baseUrl}/event-catalogue/bulk`;
        this.logger.debug(`[bulkImport] POST ${url} items=${items.length}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: this.commsHeaders(),
                timeout: 15_000,
            }));
            this.logger.debug(`[bulkImport] HTTP ${res.status}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to bulk import communication events');
        }
    }
};
exports.CommunicationEventsService = CommunicationEventsService;
exports.CommunicationEventsService = CommunicationEventsService = CommunicationEventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [communication_connection_service_1.CommunicationConnectionService,
        axios_1.HttpService,
        config_1.ConfigService])
], CommunicationEventsService);
//# sourceMappingURL=communication-events.service.js.map