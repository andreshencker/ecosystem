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
var ProvisioningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvisioningService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const business_schema_1 = require("../business/schemas/business.schema");
let ProvisioningService = ProvisioningService_1 = class ProvisioningService {
    companyModel;
    logger = new common_1.Logger(ProvisioningService_1.name);
    constructor(companyModel) {
        this.companyModel = companyModel;
    }
    async provisionBusiness(companyId) {
        this.logger.log(`[PROVISION] Starting provisioning for companyId=${companyId}`);
        await this.p03FiscalProfileDefaults(companyId);
        this.p14ChartOfAccountsStub(companyId);
        this.pDocumentPackagesStub(companyId);
        this.pCommunicationConnectionStub(companyId);
        this.logger.log(`[PROVISION] Phase 2 complete for companyId=${companyId}`);
    }
    async p03FiscalProfileDefaults(companyId) {
        try {
            const company = (await this.companyModel
                .findById(companyId)
                .lean()
                .exec());
            if (!company) {
                this.logger.warn(`[PROVISION:P-03] Company not found companyId=${companyId}`);
                return;
            }
            const patch = {};
            if (!company.defaultCurrency)
                patch.defaultCurrency = 'AUD';
            if (!company.depositAccount)
                patch.depositAccount = { bsb: null, accountNumber: null };
            if (Object.keys(patch).length > 0) {
                await this.companyModel
                    .findByIdAndUpdate(companyId, { $set: patch })
                    .exec();
                this.logger.log(`[PROVISION:P-03] Applied fiscal defaults patch for companyId=${companyId}`);
            }
            else {
                this.logger.log(`[PROVISION:P-03] Fiscal defaults already present companyId=${companyId}`);
            }
        }
        catch (err) {
            this.logger.error(`[PROVISION:P-03] Failed companyId=${companyId}: ${err?.message}`);
        }
    }
    p14ChartOfAccountsStub(companyId) {
        this.logger.log(`[PROVISION:P-14] ChartOfAccounts AU — pending Sprint 8 (AccountingModule) companyId=${companyId}`);
    }
    pDocumentPackagesStub(companyId) {
        this.logger.log(`[PROVISION:P-xx] DocumentPackages — pending Sprint 9 (DocumentModule) companyId=${companyId}`);
    }
    pCommunicationConnectionStub(companyId) {
        this.logger.log(`[PROVISION:P-xx] CommunicationConnection — requires admin configuration companyId=${companyId}`);
    }
};
exports.ProvisioningService = ProvisioningService;
exports.ProvisioningService = ProvisioningService = ProvisioningService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProvisioningService);
//# sourceMappingURL=provisioning.service.js.map