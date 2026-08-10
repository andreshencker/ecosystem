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
var CommunicationConnectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationConnectionService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const rxjs_1 = require("rxjs");
const communication_connection_schema_1 = require("./communication-connection.schema");
const crypto_service_1 = require("../../../infrastructure/common/security/crypto.service");
const communication_connection_dto_1 = require("./dto/communication-connection.dto");
const user_schema_1 = require("../../../modules/users/schemas/user.schema");
const business_schema_1 = require("../../../modules/business/schemas/business.schema");
let CommunicationConnectionService = CommunicationConnectionService_1 = class CommunicationConnectionService {
    model;
    userModel;
    businessModel;
    crypto;
    http;
    config;
    logger = new common_1.Logger(CommunicationConnectionService_1.name);
    constructor(model, userModel, businessModel, crypto, http, config) {
        this.model = model;
        this.userModel = userModel;
        this.businessModel = businessModel;
        this.crypto = crypto;
        this.http = http;
        this.config = config;
    }
    get baseUrl() {
        return (this.config.get('COMMUNICATION_API_URL') ??
            'http://localhost:3001').replace(/\/$/, '');
    }
    async resolveBusinessId(userId) {
        const user = (await this.userModel
            .findById(userId)
            .select('companyId')
            .lean()
            .exec());
        if (!user?.companyId)
            throw new common_1.HttpException('User has no business associated.', common_1.HttpStatus.FORBIDDEN);
        return String(user.companyId);
    }
    async resolveBusinessIdForUser(userId) {
        return this.resolveBusinessId(userId);
    }
    businessQuery(businessId) {
        const oid = new mongoose_2.Types.ObjectId(businessId);
        return { $or: [{ businessId: oid }, { companyId: oid }] };
    }
    async verifyTokenWithRemote(token) {
        const url = `${this.baseUrl}/company-integrations/me`;
        try {
            this.logger.log(`[verify] GET ${url}`);
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: { 'x-integration-token': token },
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
            const message = e?.response?.status
                ? `HTTP ${e.response.status}: ${e?.response?.data?.message ?? e.message}`
                : e?.code === 'ECONNREFUSED' || e?.code === 'ENOTFOUND'
                    ? 'Cannot reach the Communications server — verify COMMUNICATION_API_URL'
                    : (e?.message ?? 'Connection failed');
            return { success: false, message };
        }
    }
    async getCommunicationConnectionForContext(type, businessId) {
        if (type === 'platform') {
            const platformBusiness = (await this.businessModel
                .findOne({ isPlatformCompany: true })
                .select('_id businessName businessKey isPlatformCompany')
                .lean()
                .exec());
            if (!platformBusiness?._id) {
                this.logger.warn('[getCommunicationConnectionForContext] type=platform: no Business with isPlatformCompany=true found — returning null.');
                return null;
            }
            return this.getConnectionForBusiness(String(platformBusiness._id));
        }
        if (!businessId) {
            this.logger.error('[getCommunicationConnectionForContext] type=business requires businessId — none provided.');
            return null;
        }
        return this.getConnectionForBusiness(businessId);
    }
    async getConnectionForBusiness(businessId) {
        const doc = (await this.model
            .findOne({
            ...this.businessQuery(businessId),
            provider: 'communications',
            isActive: true,
        })
            .lean());
        if (!doc)
            return null;
        try {
            const { token } = this.crypto.decryptJson(doc.encryptedToken);
            return {
                communicationCompanyId: doc.remoteCompanyId ?? '',
                decryptedToken: token,
                status: doc.lastStatus ?? null,
                isActive: doc.isActive,
            };
        }
        catch {
            this.logger.error(`[getConnectionForBusiness] decryption failed for businessId=${businessId}`);
            return null;
        }
    }
    async get(userId, provider) {
        const businessId = await this.resolveBusinessId(userId);
        const doc = await this.model
            .findOne({ ...this.businessQuery(businessId), provider })
            .lean();
        return doc ? communication_connection_dto_1.IntegrationConnectionResponseDto.from(doc) : null;
    }
    async save(userId, provider, token, isActive = true) {
        const businessId = await this.resolveBusinessId(userId);
        this.logger.log(`[save:${provider}] userId=${userId} businessId=${businessId} tokenPresent=${!!token}`);
        const encrypted = this.crypto.encryptJson({ token });
        const tokenPrefix = token.slice(0, 12);
        let remoteCompanyId = null;
        try {
            const info = await this.verifyTokenWithRemote(token);
            if (info.success && info.remoteCompanyId)
                remoteCompanyId = info.remoteCompanyId;
            this.logger.log(`[save:${provider}] verify success=${info.success} remoteCompanyId=${remoteCompanyId ?? 'null'}`);
        }
        catch (err) {
            this.logger.warn(`[save:${provider}] Could not resolve remoteCompanyId — saved without it: ${err?.message}`);
        }
        const setData = {
            businessId: new mongoose_2.Types.ObjectId(businessId),
            provider,
            encryptedToken: encrypted,
            tokenPrefix,
            isActive,
            remoteCompanyId,
            lastTestedAt: null,
            lastStatus: null,
            lastError: null,
        };
        const existing = (await this.model
            .findOne({ ...this.businessQuery(businessId), provider })
            .lean());
        this.logger.log(`[save:${provider}] existing doc: ${existing ? `_id=${existing._id}` : 'none (will create)'}`);
        let doc;
        if (existing) {
            doc = await this.model
                .findOneAndUpdate({ _id: existing._id }, { $set: setData }, { new: true })
                .lean();
        }
        else {
            doc = await this.model
                .findOneAndUpdate({ businessId: new mongoose_2.Types.ObjectId(businessId), provider }, { $set: setData }, { upsert: true, new: true, setDefaultsOnInsert: true })
                .lean();
        }
        this.logger.log(`[save:${provider}] persisted _id=${doc?._id}`);
        return communication_connection_dto_1.IntegrationConnectionResponseDto.from(doc);
    }
    async test(userId, provider, token) {
        const checkedAt = new Date().toISOString();
        if (token) {
            const result = await this.verifyTokenWithRemote(token);
            return {
                success: result.success,
                status: result.success ? 'connected' : 'failed',
                message: result.message,
                checkedAt,
                remoteCompanyId: result.remoteCompanyId,
                remoteCompanyKey: result.remoteCompanyKey,
                remoteCompanyName: result.remoteCompanyName,
            };
        }
        const businessId = await this.resolveBusinessId(userId);
        const doc = (await this.model
            .findOne({ ...this.businessQuery(businessId), provider })
            .lean());
        if (!doc)
            throw new common_1.HttpException('No connection configured. Save a token first.', common_1.HttpStatus.NOT_FOUND);
        const { token: storedToken } = this.crypto.decryptJson(doc.encryptedToken);
        const result = await this.verifyTokenWithRemote(storedToken);
        const status = result.success
            ? 'connected'
            : 'failed';
        const $set = {
            lastTestedAt: new Date(checkedAt),
            lastStatus: status,
            lastError: result.success ? null : result.message,
        };
        if (result.success && result.remoteCompanyId)
            $set.remoteCompanyId = result.remoteCompanyId;
        await this.model.findOneAndUpdate({ ...this.businessQuery(businessId), provider }, { $set });
        return {
            success: result.success,
            status,
            message: result.message,
            checkedAt,
            remoteCompanyId: result.remoteCompanyId,
            remoteCompanyKey: result.remoteCompanyKey,
            remoteCompanyName: result.remoteCompanyName,
        };
    }
    async toggle(userId, provider, isActive) {
        const businessId = await this.resolveBusinessId(userId);
        const doc = await this.model
            .findOneAndUpdate({ ...this.businessQuery(businessId), provider }, { $set: { isActive } }, { new: true })
            .lean();
        if (!doc)
            throw new common_1.HttpException('No connection configured.', common_1.HttpStatus.NOT_FOUND);
        return communication_connection_dto_1.IntegrationConnectionResponseDto.from(doc);
    }
    async delete(userId, provider) {
        const businessId = await this.resolveBusinessId(userId);
        const res = await this.model.findOneAndDelete({
            ...this.businessQuery(businessId),
            provider,
        });
        if (!res)
            throw new common_1.HttpException('No connection found.', common_1.HttpStatus.NOT_FOUND);
        return { deleted: true };
    }
    async findAllActiveBusinessConnections() {
        const platformBusiness = await this.businessModel
            .findOne({ isPlatformCompany: true })
            .select('_id')
            .lean()
            .exec();
        const platformBusinessId = platformBusiness?._id
            ? String(platformBusiness._id)
            : null;
        const docs = (await this.model
            .find({
            provider: 'communications',
            isActive: true,
            remoteCompanyId: { $ne: null },
        })
            .lean());
        const results = [];
        for (const doc of docs) {
            try {
                const { token } = this.crypto.decryptJson(doc.encryptedToken);
                const bid = doc.businessId ?? doc.companyId;
                if (bid &&
                    String(bid) !== platformBusinessId &&
                    doc.remoteCompanyId &&
                    token) {
                    results.push({
                        businessId: String(bid),
                        remoteCompanyId: doc.remoteCompanyId,
                        decryptedToken: token,
                    });
                }
            }
            catch {
            }
        }
        return results;
    }
};
exports.CommunicationConnectionService = CommunicationConnectionService;
exports.CommunicationConnectionService = CommunicationConnectionService = CommunicationConnectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(communication_connection_schema_1.IntegrationConnection.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(2, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        crypto_service_1.CryptoService,
        axios_1.HttpService,
        config_1.ConfigService])
], CommunicationConnectionService);
//# sourceMappingURL=communication-connection.service.js.map