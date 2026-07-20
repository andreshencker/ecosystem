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
var CommunicationPurposesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationPurposesService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const communication_connection_service_1 = require("../connection/communication-connection.service");
let CommunicationPurposesService = CommunicationPurposesService_1 = class CommunicationPurposesService {
    connections;
    http;
    config;
    logger = new common_1.Logger(CommunicationPurposesService_1.name);
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
    async resolveConn(businessId) {
        const conn = await this.connections.getCommunicationConnectionForContext('business', businessId);
        if (!conn || !conn.isActive) {
            throw new common_1.HttpException('Communications integration is not configured. Go to Settings → Communications to connect.', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        this.logger.debug(`[resolveConn] businessId=${businessId} remoteCompanyId=${conn.communicationCompanyId} ` +
            `status=${conn.status} — connection resolved`);
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
        this.logger.warn(`[forwardError] HTTP ${status} from Communications — ${message}`);
        throw new common_1.HttpException(message, status);
    }
    commsHeaders() {
        const key = this.adminApiKey;
        if (!key) {
            this.logger.error('[commsHeaders] COMMUNICATION_API_KEY is not set — requests will be rejected by Communications');
        }
        return { 'x-api-key': key };
    }
    async fetchAndAssertOwnership(id, remoteCompanyId) {
        const url = `${this.baseUrl}/domain-catalogue/${id}`;
        this.logger.debug(`[ownership] GET ${url}`);
        let domain;
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            domain = res.data;
        }
        catch (err) {
            this.forwardError(err, 'Communication purpose not found');
        }
        if (domain.companyId !== remoteCompanyId) {
            this.logger.warn(`[ownership] DENIED — domain ${id} belongs to ${domain.companyId}, ` +
                `not to ${remoteCompanyId}`);
            throw new common_1.ForbiddenException('Access denied to this communication purpose');
        }
        return domain;
    }
    async list(businessId, params) {
        const conn = await this.resolveConn(businessId);
        const limit = params.limit ?? 50;
        const offset = ((params.page ?? 1) - 1) * limit;
        const qs = new URLSearchParams({
            companyId: conn.communicationCompanyId,
            limit: String(limit),
            offset: String(offset),
        });
        if (params.active !== undefined)
            qs.set('active', String(params.active));
        const url = `${this.baseUrl}/domain-catalogue?${qs}`;
        this.logger.debug(`[list] GET ${url} remoteCompanyId=${conn.communicationCompanyId}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[list] HTTP ${res.status} — ${res.data?.total ?? '?'} records`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to load communication purposes');
        }
    }
    async findOne(businessId, id) {
        const conn = await this.resolveConn(businessId);
        return this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
    }
    async create(businessId, dto) {
        const conn = await this.resolveConn(businessId);
        const body = {
            companyId: conn.communicationCompanyId,
            domainKey: dto.domainKey,
            displayName: dto.displayName,
            domainCategory: dto.domainCategory,
            isActive: dto.isActive ?? true,
            channelsToUse: dto.channelsToUse ?? [],
        };
        const url = `${this.baseUrl}/domain-catalogue`;
        this.logger.debug(`[create] POST ${url} domainKey=${dto.domainKey} remoteCompanyId=${conn.communicationCompanyId}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            this.logger.debug(`[create] HTTP ${res.status} — id=${res.data?.id}`);
            return res.data;
        }
        catch (err) {
            this.forwardError(err, 'Failed to create communication purpose');
        }
    }
    async update(businessId, id, dto) {
        const conn = await this.resolveConn(businessId);
        await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
        const url = `${this.baseUrl}/domain-catalogue/${id}`;
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
            this.forwardError(err, 'Failed to update communication purpose');
        }
    }
    async remove(businessId, id) {
        const conn = await this.resolveConn(businessId);
        await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
        const url = `${this.baseUrl}/domain-catalogue/${id}`;
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
            this.forwardError(err, 'Failed to delete communication purpose');
        }
    }
    async getCredentialOptions(businessId, channel) {
        const conn = await this.resolveConn(businessId);
        const qs = new URLSearchParams({
            companyId: conn.communicationCompanyId,
            populate: 'true',
            active: 'true',
            limit: '200',
        });
        const url = `${this.baseUrl}/provider-credentials?${qs}`;
        this.logger.debug(`[getCredentialOptions] GET ${url} (filtering to channel=${channel})`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.commsHeaders(),
                timeout: 10_000,
            }));
            const raw = res.data?.data ?? [];
            this.logger.debug(`[getCredentialOptions] HTTP ${res.status} total=${raw.length} before channel filter`);
            const filtered = raw.filter((c) => {
                const channelKey = String(c.companyChannelProvider?.channel?.channelKey ?? '')
                    .toLowerCase()
                    .trim();
                return channelKey === channel;
            });
            this.logger.debug(`[getCredentialOptions] ${filtered.length} credential(s) match channel=${channel}`);
            return filtered.map((c) => {
                const provider = c.companyChannelProvider?.provider ?? {};
                const ch = c.companyChannelProvider?.channel ?? {};
                const channelKey = String(ch.channelKey ?? channel).toLowerCase().trim();
                const providerDisplayName = provider.displayName?.trim() ||
                    provider.providerKey?.trim() ||
                    '';
                const tag = c.tag ?? 'unknown';
                return {
                    id: String(c.id ?? c._id),
                    tag,
                    displayIdentifier: c.displayIdentifier ?? undefined,
                    label: `${channelKey.toUpperCase()} — ${providerDisplayName || 'Provider'} — ${tag}`,
                    channel: channelKey,
                    channelDisplayName: ch.displayName ?? channelKey,
                    providerKey: provider.providerKey ?? '',
                    providerDisplayName: provider.displayName ?? '',
                    connectionType: provider.connectionType ?? '',
                    isActive: c.isActive !== false,
                };
            });
        }
        catch (err) {
            this.logger.warn(`[getCredentialOptions] FAILED channel=${channel}: ${err?.response?.status ?? ''} ${err?.message}`);
            return [];
        }
    }
};
exports.CommunicationPurposesService = CommunicationPurposesService;
exports.CommunicationPurposesService = CommunicationPurposesService = CommunicationPurposesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [communication_connection_service_1.CommunicationConnectionService,
        axios_1.HttpService,
        config_1.ConfigService])
], CommunicationPurposesService);
//# sourceMappingURL=communication-purposes.service.js.map