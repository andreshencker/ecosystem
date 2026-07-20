"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BusinessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nodemailer = __importStar(require("nodemailer"));
const business_schema_1 = require("./schemas/business.schema");
const business_smtp_schema_1 = require("./schemas/business-smtp.schema");
const crypto_service_1 = require("../../infrastructure/common/security/crypto.service");
const users_service_1 = require("../users/users.service");
const business_smtp_response_dto_1 = require("./dto/business-smtp-response.dto");
const business_response_dto_1 = require("./dto/business-response.dto");
let BusinessService = BusinessService_1 = class BusinessService {
    businessModel;
    smtpModel;
    crypto;
    users;
    logger = new common_1.Logger(BusinessService_1.name);
    constructor(businessModel, smtpModel, crypto, users) {
        this.businessModel = businessModel;
        this.smtpModel = smtpModel;
        this.crypto = crypto;
        this.users = users;
    }
    async resolveCompanyId(ctx) {
        if (ctx.companyId) {
            return ctx.companyId;
        }
        if (!ctx.userId) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        const user = await this.users.findById(ctx.userId);
        if (!user) {
            throw new common_1.ForbiddenException('Authenticated user not found');
        }
        const companyId = user.companyId ? String(user.companyId) : null;
        if (companyId) {
            return companyId;
        }
        if (user.scope === 'global') {
            const platformBusiness = (await this.businessModel
                .findOne({ isPlatformCompany: true })
                .lean()
                .exec());
            if (platformBusiness?._id) {
                return String(platformBusiness._id);
            }
            throw new common_1.NotFoundException('Platform company not found. Run the bootstrap script to create it.');
        }
        throw new common_1.ForbiddenException('No company assigned to this user account');
    }
    async assertCanEdit(ctx) {
        if (!ctx.userId)
            throw new common_1.ForbiddenException('Authentication required');
        const user = await this.users.findById(ctx.userId);
        if (!user)
            throw new common_1.ForbiddenException('Authenticated user not found');
        if (user.role !== 'platform_admin' && user.role !== 'business_owner') {
            throw new common_1.ForbiddenException('Only platform_admin and business_owner may update company settings');
        }
        return this.resolveCompanyId(ctx);
    }
    async getOwnCompany(ctx) {
        const companyId = await this.resolveCompanyId(ctx);
        const doc = await this.businessModel.findById(companyId).lean().exec();
        if (!doc)
            throw new common_1.NotFoundException('Company not found');
        return business_response_dto_1.BusinessResponseDto.from(doc);
    }
    async updateOwnCompany(ctx, dto) {
        const companyId = await this.assertCanEdit(ctx);
        const $set = {};
        const scalarFields = [
            'businessName',
            'abn',
            'defaultCurrency',
        ];
        for (const field of scalarFields) {
            if (dto[field] !== undefined)
                $set[field] = dto[field];
        }
        if (dto.depositAccount !== undefined) {
            if (dto.depositAccount.bsb !== undefined)
                $set['depositAccount.bsb'] = dto.depositAccount.bsb;
            if (dto.depositAccount.accountNumber !== undefined)
                $set['depositAccount.accountNumber'] = dto.depositAccount.accountNumber;
        }
        if (Object.keys($set).length === 0) {
            const current = await this.businessModel
                .findById(companyId)
                .lean()
                .exec();
            if (!current)
                throw new common_1.NotFoundException('Company not found');
            return business_response_dto_1.BusinessResponseDto.from(current);
        }
        const updated = await this.businessModel
            .findByIdAndUpdate(companyId, { $set }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Company not found');
        return business_response_dto_1.BusinessResponseDto.from(updated);
    }
    async getFiscalProfile(ctx) {
        const companyId = await this.resolveCompanyId(ctx);
        const doc = (await this.businessModel
            .findById(companyId)
            .lean()
            .exec());
        if (!doc)
            throw new common_1.NotFoundException('Company not found');
        return {
            companyId: String(doc._id),
            abn: doc.abn ?? null,
            depositAccount: doc.depositAccount ?? { bsb: null, accountNumber: null },
            defaultCurrency: doc.defaultCurrency ?? 'AUD',
        };
    }
    async updateFiscalProfile(ctx, dto) {
        const companyId = await this.assertCanEdit(ctx);
        const $set = {};
        if (dto.abn !== undefined)
            $set.abn = dto.abn;
        if (dto.defaultCurrency !== undefined)
            $set.defaultCurrency = dto.defaultCurrency;
        if (dto.depositAccount !== undefined) {
            if (dto.depositAccount.bsb !== undefined)
                $set['depositAccount.bsb'] = dto.depositAccount.bsb;
            if (dto.depositAccount.accountNumber !== undefined)
                $set['depositAccount.accountNumber'] = dto.depositAccount.accountNumber;
        }
        if (Object.keys($set).length === 0) {
            return this.getFiscalProfile(ctx);
        }
        const updated = (await this.businessModel
            .findByIdAndUpdate(companyId, { $set }, { new: true })
            .lean()
            .exec());
        if (!updated)
            throw new common_1.NotFoundException('Company not found');
        return {
            companyId: String(updated._id),
            abn: updated.abn ?? null,
            depositAccount: updated.depositAccount ?? {
                bsb: null,
                accountNumber: null,
            },
            defaultCurrency: updated.defaultCurrency ?? 'AUD',
        };
    }
    async getSmtp(ctx) {
        const companyId = await this.resolveCompanyId(ctx);
        const doc = await this.smtpModel.findOne({ companyId }).lean().exec();
        if (!doc) {
            return business_smtp_response_dto_1.BusinessSmtpResponseDto.from({
                companyId,
                fromEmail: '',
                fromName: '',
                credentials: null,
                isActive: false,
                verifiedAt: null,
            });
        }
        return business_smtp_response_dto_1.BusinessSmtpResponseDto.from(doc);
    }
    async updateSmtp(ctx, dto) {
        const companyId = await this.assertCanEdit(ctx);
        const $set = {};
        if (dto.fromEmail !== undefined)
            $set.fromEmail = dto.fromEmail;
        if (dto.fromName !== undefined)
            $set.fromName = dto.fromName;
        const hasCredentialFields = dto.host ||
            dto.user ||
            dto.pass ||
            dto.port !== undefined ||
            dto.secure !== undefined;
        if (hasCredentialFields) {
            const existing = (await this.smtpModel
                .findOne({ companyId })
                .lean()
                .exec());
            let existingDecrypted = {};
            if (existing?.credentials) {
                try {
                    existingDecrypted = this.crypto.decryptJson(existing.credentials);
                }
                catch {
                }
            }
            const merged = {
                host: dto.host ?? existingDecrypted.host ?? '',
                port: dto.port ?? existingDecrypted.port ?? 587,
                secure: dto.secure ?? existingDecrypted.secure ?? false,
                user: dto.user ?? existingDecrypted.user ?? '',
                pass: dto.pass ?? existingDecrypted.pass ?? '',
            };
            $set.credentials = this.crypto.encryptJson(merged);
            $set.verifiedAt = null;
        }
        const doc = await this.smtpModel
            .findOneAndUpdate({ companyId }, { $set }, { new: true, upsert: true })
            .lean()
            .exec();
        return business_smtp_response_dto_1.BusinessSmtpResponseDto.from(doc);
    }
    async testSmtp(ctx) {
        const companyId = await this.resolveCompanyId(ctx);
        const doc = (await this.smtpModel
            .findOne({ companyId })
            .lean()
            .exec());
        if (!doc?.credentials) {
            return { ok: false, message: 'No SMTP credentials configured' };
        }
        let smtp;
        try {
            smtp = this.crypto.decryptJson(doc.credentials);
        }
        catch {
            return { ok: false, message: 'Failed to decrypt SMTP credentials' };
        }
        try {
            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: { user: smtp.user, pass: smtp.pass },
            });
            await transporter.verify();
            await this.smtpModel.findOneAndUpdate({ companyId }, { $set: { verifiedAt: new Date() } });
            return { ok: true, message: 'SMTP connection verified successfully' };
        }
        catch (err) {
            return { ok: false, message: err?.message ?? 'SMTP verification failed' };
        }
    }
};
exports.BusinessService = BusinessService;
exports.BusinessService = BusinessService = BusinessService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __param(1, (0, mongoose_1.InjectModel)(business_smtp_schema_1.BusinessSmtp.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        crypto_service_1.CryptoService,
        users_service_1.UsersService])
], BusinessService);
//# sourceMappingURL=business.service.js.map