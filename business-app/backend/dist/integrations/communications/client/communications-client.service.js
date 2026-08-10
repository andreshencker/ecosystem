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
var CommunicationsClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const communication_connection_service_1 = require("../connection/communication-connection.service");
const communication_catalog_1 = require("../catalog/communication-catalog");
let CommunicationsClientService = CommunicationsClientService_1 = class CommunicationsClientService {
    connections;
    http;
    config;
    logger = new common_1.Logger(CommunicationsClientService_1.name);
    constructor(connections, http, config) {
        this.connections = connections;
        this.http = http;
        this.config = config;
    }
    get baseUrl() {
        return (this.config.get('COMMUNICATION_API_URL') ??
            'http://localhost:3001').replace(/\/$/, '');
    }
    get adminApiKey() {
        return this.config.get('COMMUNICATION_API_KEY') ?? '';
    }
    async notifyEvent(params) {
        const tag = `[notifyEvent:${params.event}]`;
        const catalogEntry = (0, communication_catalog_1.findCatalogEvent)(params.event);
        if (!catalogEntry) {
            this.logger.error(`${tag} REJECTED — event "${params.event}" not found in COMMUNICATION_CATALOG. ` +
                'Add it to the catalog before calling notifyEvent().');
            return false;
        }
        const businessId = params.type === 'business' ? params.businessId : undefined;
        this.logger.log(`${tag} type=${params.type}${businessId ? ` businessId=${businessId}` : ''} recipient=${params.email}`);
        const conn = await this.connections.getCommunicationConnectionForContext(params.type, businessId);
        if (!conn) {
            if (params.type === 'platform') {
                this.logger.error(`${tag} SKIPPED — platform base company has no active CommunicationConnection. ` +
                    'Configure the platform company connection in Settings → Communications.');
            }
            else {
                this.logger.warn(`${tag} SKIPPED — no active CommunicationConnection for businessId=${params.businessId}. ` +
                    'Business must configure its Communications integration first.');
            }
            return false;
        }
        const url = `${this.baseUrl}/notifications/event`;
        const body = {
            companyId: conn.communicationCompanyId,
            event: params.event,
            email: params.email,
            payload: { data: params.data },
        };
        this.logger.log(`${tag} POST ${url} remoteCompanyId=${conn.communicationCompanyId} token=${conn.decryptedToken.slice(0, 12)}...`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: { 'x-api-key': conn.decryptedToken },
                timeout: 10_000,
            }));
            this.logger.log(`${tag} DELIVERED — HTTP ${res.status} recipient=${params.email}`);
            return true;
        }
        catch (err) {
            const e = err;
            const responseMsg = typeof e?.response?.data === 'object' && e.response.data !== null
                ? e.response.data['message']
                : undefined;
            this.logger.error(`${tag} FAILED — recipient=${params.email} httpStatus=${e?.response?.status ?? '(no response)'} ` +
                `message=${responseMsg ?? e?.message ?? 'unknown'}`);
            return false;
        }
    }
    async verifyIntegrationToken(rawToken) {
        const url = `${this.baseUrl}/company-integrations/me`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-integration-token': rawToken },
                timeout: 8_000,
            }));
            const d = res.data;
            return {
                success: true,
                message: `Connected — ${d.companyName ?? 'Company found'}`,
                remoteCompanyId: d.companyId,
                remoteCompanyKey: d.companyKey,
                remoteCompanyName: d.companyName,
            };
        }
        catch (err) {
            const e = err;
            return {
                success: false,
                message: e?.response?.status
                    ? `HTTP ${e.response.status}: ${e?.response?.data?.message ?? e.message}`
                    : (e?.message ?? 'Connection failed'),
            };
        }
    }
    async getDomains(remoteCompanyId, apiKey) {
        const url = `${this.baseUrl}/domain-catalogue?companyId=${remoteCompanyId}&limit=200`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-api-key': apiKey },
                timeout: 10_000,
            }));
            return (res.data?.data ?? res.data?.items ?? res.data ?? []);
        }
        catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                this.logger.error(`[getDomains] AUTH FAILED (HTTP ${status}) for remoteCompanyId=${remoteCompanyId} — token is invalid or missing`);
                return null;
            }
            this.logger.warn(`[getDomains] Failed for remoteCompanyId=${remoteCompanyId}: ${err?.message}`);
            return [];
        }
    }
    async createDomain(remoteCompanyId, apiKey, domain) {
        const url = `${this.baseUrl}/domain-catalogue`;
        const body = {
            companyId: remoteCompanyId,
            domainKey: domain.domainKey,
            displayName: domain.displayName,
            domainCategory: domain.domainCategory,
            isActive: true,
            channelsToUse: [],
        };
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: { 'x-api-key': apiKey },
                timeout: 10_000,
            }));
            return String(res.data?._id ?? res.data?.id ?? '');
        }
        catch (err) {
            this.logger.error(`[createDomain] Failed domainKey=${domain.domainKey} remoteCompanyId=${remoteCompanyId}: ${err?.message}`);
            return null;
        }
    }
    async getEvents(domainCatalogueId, apiKey) {
        const url = `${this.baseUrl}/event-catalogue?domainCatalogueId=${domainCatalogueId}&limit=200`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-api-key': apiKey },
                timeout: 10_000,
            }));
            return (res.data?.data ?? res.data?.items ?? res.data ?? []);
        }
        catch (err) {
            this.logger.warn(`[getEvents] Failed for domainCatalogueId=${domainCatalogueId}: ${err?.message}`);
            return [];
        }
    }
    async createEvent(domainCatalogueId, apiKey, event, scope) {
        const url = `${this.baseUrl}/event-catalogue`;
        const channelContent = {};
        if (event.channels.email) {
            channelContent['email'] = {
                enabled: event.channels.email.enabled,
                subject: event.channels.email.subject ?? '',
                content: event.channels.email.content ?? '',
                requiredVariables: event.channels.email.requiredVariables,
                optionalVariables: event.channels.email.optionalVariables,
            };
        }
        if (event.channels.sms) {
            channelContent['sms'] = {
                enabled: event.channels.sms.enabled,
                text: event.channels.sms.text ?? '',
                requiredVariables: event.channels.sms.requiredVariables,
                optionalVariables: event.channels.sms.optionalVariables,
            };
        }
        const body = {
            domainCatalogueId,
            eventKey: event.eventKey,
            displayName: event.displayName,
            description: event.description,
            eventType: event.eventType,
            channelContent,
            isActive: true,
            scope: scope === 'platform' ? 'platform' : 'company',
            senderScope: scope === 'platform' ? 'platform' : 'company',
        };
        try {
            await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: { 'x-api-key': apiKey },
                timeout: 10_000,
            }));
        }
        catch (err) {
            this.logger.error(`[createEvent] Failed eventKey=${event.eventKey} domainCatalogueId=${domainCatalogueId}: ${err?.message}`);
            throw err;
        }
    }
    async getDocumentDomains(remoteCompanyId, apiKey) {
        const url = `${this.baseUrl}/document-domain-catalogue?companyId=${remoteCompanyId}&limit=200`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }));
            return (res.data?.data ?? res.data?.items ?? res.data ?? []);
        }
        catch (err) {
            const status = err?.response?.status;
            if (status === 401 || status === 403)
                return null;
            this.logger.warn(`[getDocumentDomains] Failed remoteCompanyId=${remoteCompanyId}: ${err?.message}`);
            return [];
        }
    }
    async createDocumentDomain(remoteCompanyId, apiKey, domain) {
        const url = `${this.baseUrl}/document-domain-catalogue`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, {
                companyId: remoteCompanyId,
                domainKey: domain.domainKey,
                displayName: domain.displayName,
                description: domain.description,
                domainCategory: domain.domainCategory,
                allowedFormats: domain.allowedFormats,
                isActive: true,
            }, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }));
            return String(res.data?.id ?? res.data?._id ?? '');
        }
        catch (err) {
            this.logger.error(`[createDocumentDomain] Failed domainKey=${domain.domainKey}: ${err?.message}`);
            return null;
        }
    }
    async updateDocumentDomainFormats(documentDomainId, apiKey, allowedFormats) {
        const url = `${this.baseUrl}/document-domain-catalogue/${documentDomainId}`;
        try {
            await (0, rxjs_1.firstValueFrom)(this.http.patch(url, { allowedFormats }, {
                headers: { 'x-api-key': apiKey }, timeout: 10_000,
            }));
            return true;
        }
        catch (err) {
            this.logger.error(`[updateDocumentDomainFormats] Failed documentDomainId=${documentDomainId}: ${err?.message}`);
            return false;
        }
    }
    async getDocuments(documentDomainId, apiKey) {
        const url = `${this.baseUrl}/document-catalogue/domain/${documentDomainId}?limit=200`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }));
            return (res.data?.data ?? res.data?.items ?? res.data ?? []);
        }
        catch (err) {
            this.logger.warn(`[getDocuments] Failed documentDomainId=${documentDomainId}: ${err?.message}`);
            return [];
        }
    }
    async createDocument(documentDomainId, apiKey, document) {
        const url = `${this.baseUrl}/document-catalogue`;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, {
                documentDomainCatalogueId: documentDomainId,
                documentKey: document.documentKey,
                displayName: document.displayName,
                description: document.description,
                formatContracts: document.formatContracts,
                isActive: true,
            }, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }));
            return String(res.data?.id ?? res.data?._id ?? '');
        }
        catch (err) {
            const message = err?.response?.data?.message ?? err?.message;
            this.logger.error(`[createDocument] Failed documentKey=${document.documentKey}: ${typeof message === 'string' ? message : JSON.stringify(message)}`);
            return null;
        }
    }
    async generateDocument(params) {
        const conn = await this.connections.getCommunicationConnectionForContext(params.type, params.businessId);
        if (!conn?.communicationCompanyId) {
            throw new Error('Active verified Communications connection is required');
        }
        const url = `${this.baseUrl}/files/documents/generate`;
        const response = await (0, rxjs_1.firstValueFrom)(this.http.post(url, {
            companyId: conn.communicationCompanyId,
            canonicalKey: params.canonicalKey,
            filename: params.filename,
            data: params.data,
        }, {
            headers: { 'x-api-key': this.adminApiKey },
            responseType: 'arraybuffer',
            timeout: 30_000,
        }));
        const disposition = String(response.headers['content-disposition'] ?? '');
        const matchedFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
        return {
            buffer: Buffer.from(response.data),
            contentType: String(response.headers['content-type'] ?? 'application/pdf'),
            filename: matchedFilename ?? `${params.filename}.pdf`,
        };
    }
};
exports.CommunicationsClientService = CommunicationsClientService;
exports.CommunicationsClientService = CommunicationsClientService = CommunicationsClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [communication_connection_service_1.CommunicationConnectionService,
        axios_1.HttpService,
        config_1.ConfigService])
], CommunicationsClientService);
//# sourceMappingURL=communications-client.service.js.map