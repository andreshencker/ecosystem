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
var UsersBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("./schemas/user.schema");
const business_schema_1 = require("../business/schemas/business.schema");
const BCRYPT_ROUNDS = 12;
let UsersBootstrapService = class UsersBootstrapService {
    static { UsersBootstrapService_1 = this; }
    userModel;
    companyModel;
    logger = new common_1.Logger(UsersBootstrapService_1.name);
    static BOOTSTRAP_EMAIL = process.env['PLATFORM_ADMIN_BOOTSTRAP_EMAIL'] ?? 'admin@invoiceapp.com';
    static BOOTSTRAP_PASSWORD = process.env['PLATFORM_ADMIN_BOOTSTRAP_PASSWORD'] ?? 'InvoiceApp123!';
    constructor(userModel, companyModel) {
        this.userModel = userModel;
        this.companyModel = companyModel;
    }
    async onApplicationBootstrap() {
        try {
            const platformCompany = await this.ensurePlatformCompany();
            await this.ensurePlatformAdmin(platformCompany);
            await this.repairOrphanedBusinessUsers();
            this.logBootstrapSummary();
        }
        catch (err) {
            this.logger.error(`Bootstrap failed: ${err?.message}`, err?.stack);
        }
    }
    async ensurePlatformCompany() {
        const existing = await this.companyModel
            .findOne({ isPlatformCompany: true })
            .exec();
        if (existing) {
            this.logger.log(`Bootstrap: platform company — result: already exists (key=${existing.businessKey}, id=${existing._id})`);
            return existing;
        }
        const created = await this.companyModel.create({
            businessKey: 'invoice-app',
            businessName: 'Invoice App',
            isActive: true,
            isPlatformCompany: true,
        });
        this.logger.log(`Bootstrap: platform company — result: created (key=invoice-app, id=${created._id})`);
        return created;
    }
    async ensurePlatformAdmin(platformCompany) {
        const email = UsersBootstrapService_1.BOOTSTRAP_EMAIL;
        const correctCompanyId = String(platformCompany._id);
        const correctBusinessKey = platformCompany.businessKey;
        const existing = await this.userModel.findOne({ email }).exec();
        if (!existing) {
            const passwordHash = await bcrypt.hash(UsersBootstrapService_1.BOOTSTRAP_PASSWORD, BCRYPT_ROUNDS);
            const created = await this.userModel.create({
                email,
                passwordHash,
                firstName: 'Platform',
                lastName: 'Admin',
                role: 'platform_admin',
                scope: 'global',
                companyId: correctCompanyId,
                businessKey: correctBusinessKey,
                isActive: true,
                isEmailVerified: true,
                mustChangePassword: false,
            });
            this.logger.log(`Bootstrap: platform_admin (${email}) — result: created (id=${created._id}, companyId=${correctCompanyId})`);
            return;
        }
        const $set = {};
        const repairs = [];
        if (String(existing.companyId) !== correctCompanyId) {
            $set.companyId = correctCompanyId;
            repairs.push('companyId');
        }
        if (existing.businessKey !== correctBusinessKey) {
            $set.businessKey = correctBusinessKey;
            repairs.push('businessKey');
        }
        if (existing.role !== 'platform_admin') {
            $set.role = 'platform_admin';
            repairs.push('role');
        }
        if (existing.scope !== 'global') {
            $set.scope = 'global';
            repairs.push('scope');
        }
        const pw = existing.passwordHash;
        const hashIsValid = typeof pw === 'string' && pw.startsWith('$2');
        if (!hashIsValid) {
            $set.passwordHash = await bcrypt.hash(UsersBootstrapService_1.BOOTSTRAP_PASSWORD, BCRYPT_ROUNDS);
            repairs.push('passwordHash (was missing or invalid — reset to bootstrap default)');
        }
        if (Object.keys($set).length === 0) {
            this.logger.log(`Bootstrap: platform_admin (${email}) — result: already correct, no changes`);
            return;
        }
        await this.userModel.updateOne({ _id: existing._id }, { $set });
        this.logger.log(`Bootstrap: platform_admin (${email}) — result: repaired [${repairs.join(', ')}]`);
    }
    async repairOrphanedBusinessUsers() {
        const companyUsers = await this.userModel
            .find({ scope: 'company', companyId: { $ne: null } })
            .lean()
            .exec();
        let repaired = 0;
        let healthy = 0;
        for (const user of companyUsers) {
            const companyId = user.companyId ? String(user.companyId) : null;
            if (!companyId)
                continue;
            const exists = await this.companyModel.findById(companyId).lean().exec();
            if (exists) {
                healthy++;
                continue;
            }
            const rawName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
            const businessName = rawName
                ? `${rawName}'s Business`
                : `${user.email}'s Business`;
            let businessKey = this.slugify(rawName || user.email);
            const conflict = await this.companyModel
                .findOne({ businessKey })
                .lean()
                .exec();
            if (conflict)
                businessKey = `${businessKey}-${String(user._id).slice(-4)}`;
            const newCompany = await this.companyModel.create({
                businessKey,
                businessName,
                ownerUserId: String(user._id),
                depositAccount: { bsb: null, accountNumber: null },
                defaultCurrency: 'AUD',
                isActive: true,
                isPlatformCompany: false,
            });
            await this.userModel.updateOne({ _id: user._id }, { $set: { companyId: String(newCompany._id), businessKey } });
            this.logger.log(`Bootstrap: repaired orphaned user ${user.email} — created placeholder Business ` +
                `"${businessName}" (id=${newCompany._id}, key=${businessKey})`);
            repaired++;
        }
        if (repaired > 0 || healthy > 0) {
            this.logger.log(`Bootstrap: company-scoped users — healthy=${healthy} repaired=${repaired}`);
        }
    }
    logBootstrapSummary() {
        this.logger.log(`Bootstrap: complete — admin email: ${UsersBootstrapService_1.BOOTSTRAP_EMAIL}` +
            ` (set PLATFORM_ADMIN_BOOTSTRAP_EMAIL / PLATFORM_ADMIN_BOOTSTRAP_PASSWORD to override)`);
    }
    slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
};
exports.UsersBootstrapService = UsersBootstrapService;
exports.UsersBootstrapService = UsersBootstrapService = UsersBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersBootstrapService);
//# sourceMappingURL=users-bootstrap.service.js.map