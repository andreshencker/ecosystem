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
var CommunicationCatalogProvisioningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationCatalogProvisioningService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const communications_client_service_1 = require("../client/communications-client.service");
const communication_connection_service_1 = require("../connection/communication-connection.service");
const communication_catalog_1 = require("../catalog/communication-catalog");
const communication_catalog_validator_1 = require("../catalog/communication-catalog.validator");
let CommunicationCatalogProvisioningService = CommunicationCatalogProvisioningService_1 = class CommunicationCatalogProvisioningService {
    commClient;
    connectionService;
    config;
    logger = new common_1.Logger(CommunicationCatalogProvisioningService_1.name);
    constructor(commClient, connectionService, config) {
        this.commClient = commClient;
        this.connectionService = connectionService;
        this.config = config;
    }
    get adminApiKey() {
        return this.config.get('COMMUNICATION_API_KEY') ?? '';
    }
    async provisionPlatformCatalog() {
        this.logger.log('[provisionPlatformCatalog] Starting...');
        try {
            (0, communication_catalog_validator_1.assertCatalogValid)(communication_catalog_1.COMMUNICATION_CATALOG);
        }
        catch (err) {
            this.logger.error(`[provisionPlatformCatalog] Catalog invalid: ${err.message}`);
            return;
        }
        const apiKey = this.adminApiKey;
        if (!apiKey) {
            this.logger.error('[provisionPlatformCatalog] SKIPPED — COMMUNICATION_API_KEY env var is not set. ' +
                'Set it to the admin API key of Communications App.');
            return;
        }
        const conn = await this.connectionService.getCommunicationConnectionForContext('platform');
        if (!conn) {
            this.logger.warn('[provisionPlatformCatalog] Platform company has no active CommunicationConnection — ' +
                'platform event catalog provisioning skipped. ' +
                'Configure the integration token in Settings → Communications to enable notifications.');
            return;
        }
        const remoteCompanyId = conn.communicationCompanyId;
        let created = 0;
        let skipped = 0;
        let errors = 0;
        for (const domain of communication_catalog_1.COMMUNICATION_CATALOG.platform) {
            const result = await this.provisionDomain(remoteCompanyId, apiKey, domain, 'platform');
            if (result.authFailed) {
                this.logger.error('[provisionPlatformCatalog] SKIPPED — cannot provision Communications catalog because authentication failed. ' +
                    'The platform integration token is invalid or missing. Fix the token in Settings → Integrations → Communications.');
                return;
            }
            created += result.created;
            skipped += result.skipped;
            errors += result.errors;
        }
        this.logger.log(`[provisionPlatformCatalog] Done — created=${created} skipped=${skipped} errors=${errors}`);
    }
    async provisionBusinessCatalog(businessId) {
        if (communication_catalog_1.COMMUNICATION_CATALOG.business.length === 0) {
            this.logger.log(`[provisionBusinessCatalog] No business domains defined yet — nothing to provision for businessId=${businessId}`);
            return;
        }
        const apiKey = this.adminApiKey;
        if (!apiKey) {
            this.logger.error(`[provisionBusinessCatalog] SKIPPED businessId=${businessId} — COMMUNICATION_API_KEY env var is not set.`);
            return;
        }
        const conn = await this.connectionService.getCommunicationConnectionForContext('business', businessId);
        if (!conn) {
            this.logger.warn(`[provisionBusinessCatalog] No active CommunicationConnection for businessId=${businessId} — skipping.`);
            return;
        }
        try {
            (0, communication_catalog_validator_1.assertCatalogValid)(communication_catalog_1.COMMUNICATION_CATALOG);
        }
        catch (err) {
            this.logger.error(`[provisionBusinessCatalog] Catalog invalid: ${err.message}`);
            return;
        }
        const remoteCompanyId = conn.communicationCompanyId;
        let created = 0;
        let skipped = 0;
        let errors = 0;
        for (const domain of communication_catalog_1.COMMUNICATION_CATALOG.business) {
            const result = await this.provisionDomain(remoteCompanyId, apiKey, domain, 'business');
            if (result.authFailed) {
                this.logger.error(`[provisionBusinessCatalog] SKIPPED businessId=${businessId} — cannot provision Communications catalog because authentication failed. ` +
                    'The business integration token is invalid or expired.');
                return;
            }
            created += result.created;
            skipped += result.skipped;
            errors += result.errors;
        }
        this.logger.log(`[provisionBusinessCatalog] Done businessId=${businessId} — created=${created} skipped=${skipped} errors=${errors}`);
    }
    async syncBusinessCatalog(businessId) {
        return this.provisionBusinessCatalog(businessId);
    }
    async syncAllBusinessesWithActiveConnection() {
        this.logger.log('[syncAllBusinessesWithActiveConnection] Starting...');
        const connections = await this.connectionService.findAllActiveBusinessConnections();
        this.logger.log(`[syncAllBusinessesWithActiveConnection] Found ${connections.length} active connections`);
        let succeeded = 0;
        let failed = 0;
        for (const conn of connections) {
            try {
                await this.provisionBusinessCatalog(conn.businessId);
                succeeded++;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.error(`[syncAllBusinessesWithActiveConnection] Failed for businessId=${conn.businessId}: ${msg}`);
                failed++;
            }
        }
        this.logger.log(`[syncAllBusinessesWithActiveConnection] Done — succeeded=${succeeded} failed=${failed}`);
    }
    async provisionDomain(remoteCompanyId, apiKey, domain, scope) {
        let created = 0;
        let skipped = 0;
        let errors = 0;
        const existingDomains = await this.commClient.getDomains(remoteCompanyId, apiKey);
        if (existingDomains === null) {
            return { created: 0, skipped: 0, errors: 0, authFailed: true };
        }
        const existingDomain = existingDomains.find((d) => d['domainKey'] === domain.domainKey);
        let domainId;
        if (existingDomain) {
            domainId = String(existingDomain['_id'] ?? existingDomain['id'] ?? '');
            this.logger.log(`[provisionDomain] SKIP domain="${domain.domainKey}" already exists id=${domainId}`);
            skipped++;
        }
        else {
            this.logger.log(`[provisionDomain] CREATE domain="${domain.domainKey}"`);
            const newId = await this.commClient.createDomain(remoteCompanyId, apiKey, domain);
            if (!newId) {
                this.logger.error(`[provisionDomain] FAILED to create domain="${domain.domainKey}"`);
                errors++;
                return { created, skipped, errors };
            }
            domainId = newId;
            created++;
            this.logger.log(`[provisionDomain] CREATED domain="${domain.domainKey}" id=${domainId}`);
        }
        const existingEvents = await this.commClient.getEvents(domainId, apiKey);
        const existingKeys = new Set(existingEvents.map((e) => e['eventKey']));
        for (const event of domain.events) {
            if (existingKeys.has(event.eventKey)) {
                this.logger.log(`[provisionDomain] SKIP event="${domain.domainKey}.${event.eventKey}" already exists`);
                skipped++;
                continue;
            }
            this.logger.log(`[provisionDomain] CREATE event="${domain.domainKey}.${event.eventKey}"`);
            try {
                await this.commClient.createEvent(domainId, apiKey, event, scope);
                created++;
                this.logger.log(`[provisionDomain] CREATED event="${domain.domainKey}.${event.eventKey}"`);
            }
            catch {
                this.logger.error(`[provisionDomain] FAILED event="${domain.domainKey}.${event.eventKey}"`);
                errors++;
            }
        }
        return { created, skipped, errors };
    }
};
exports.CommunicationCatalogProvisioningService = CommunicationCatalogProvisioningService;
exports.CommunicationCatalogProvisioningService = CommunicationCatalogProvisioningService = CommunicationCatalogProvisioningService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [communications_client_service_1.CommunicationsClientService,
        communication_connection_service_1.CommunicationConnectionService,
        config_1.ConfigService])
], CommunicationCatalogProvisioningService);
//# sourceMappingURL=communication-catalog-provisioning.service.js.map