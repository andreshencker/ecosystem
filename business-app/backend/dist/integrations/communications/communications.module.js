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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CommunicationsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const communication_connection_schema_1 = require("./connection/communication-connection.schema");
const communication_connection_service_1 = require("./connection/communication-connection.service");
const communication_connection_controller_1 = require("./connection/communication-connection.controller");
const communications_client_service_1 = require("./client/communications-client.service");
const communication_catalog_provisioning_service_1 = require("./provisioning/communication-catalog-provisioning.service");
const security_module_1 = require("../../infrastructure/common/security/security.module");
const user_schema_1 = require("../../modules/users/schemas/user.schema");
const business_schema_1 = require("../../modules/business/schemas/business.schema");
let CommunicationsModule = CommunicationsModule_1 = class CommunicationsModule {
    provisioning;
    connection;
    logger = new common_1.Logger(CommunicationsModule_1.name);
    constructor(provisioning, connection) {
        this.provisioning = provisioning;
        this.connection = connection;
    }
    onApplicationBootstrap() {
        this.dropStaleCompanyProviderIndex()
            .then(() => this.provisioning.provisionPlatformCatalog())
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error('[onApplicationBootstrap] Startup sequence failed unexpectedly: ' + msg);
        });
    }
    async dropStaleCompanyProviderIndex() {
        try {
            const col = this.connection.db.collection('integration_connections');
            const indexes = await col.indexes();
            const stale = indexes.find((i) => i.name === 'uniq_company_provider' && !i.sparse);
            if (stale) {
                await col.dropIndex('uniq_company_provider');
                this.logger.log('[startup] Dropped stale non-sparse index uniq_company_provider on integration_connections.');
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`[startup] Could not drop stale index (non-fatal): ${msg}`);
        }
    }
};
exports.CommunicationsModule = CommunicationsModule;
exports.CommunicationsModule = CommunicationsModule = CommunicationsModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            security_module_1.SecurityModule,
            mongoose_1.MongooseModule.forFeature([
                { name: communication_connection_schema_1.IntegrationConnection.name, schema: communication_connection_schema_1.IntegrationConnectionSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: business_schema_1.Business.name, schema: business_schema_1.BusinessSchema },
            ]),
        ],
        controllers: [communication_connection_controller_1.CommunicationConnectionController],
        providers: [
            communication_connection_service_1.CommunicationConnectionService,
            communications_client_service_1.CommunicationsClientService,
            communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService,
        ],
        exports: [
            communication_connection_service_1.CommunicationConnectionService,
            communications_client_service_1.CommunicationsClientService,
            communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService,
        ],
    }),
    __param(1, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [communication_catalog_provisioning_service_1.CommunicationCatalogProvisioningService,
        mongoose_3.Connection])
], CommunicationsModule);
//# sourceMappingURL=communications.module.js.map