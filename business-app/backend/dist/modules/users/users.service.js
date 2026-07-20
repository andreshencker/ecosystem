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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("./schemas/user.schema");
const business_schema_1 = require("../business/schemas/business.schema");
const BCRYPT_ROUNDS = 12;
let UsersService = class UsersService {
    model;
    companyModel;
    constructor(model, companyModel) {
        this.model = model;
        this.companyModel = companyModel;
    }
    async findById(id) {
        return this.model.findById(id).select('-passwordHash').lean().exec();
    }
    async findByIdOrThrow(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async findByEmailWithPassword(email) {
        return this.model
            .findOne({ email: email.toLowerCase().trim() })
            .lean()
            .exec();
    }
    async existsByEmail(email) {
        const doc = await this.model
            .findOne({ email: email.toLowerCase().trim() })
            .select('_id')
            .lean()
            .exec();
        return !!doc;
    }
    async findByEmailVerificationToken(tokenHash) {
        return this.model
            .findOne({
            emailVerificationToken: tokenHash,
            emailVerificationTokenExpiresAt: { $gt: new Date() },
        })
            .lean()
            .exec();
    }
    async findByPasswordResetToken(tokenHash) {
        return this.model
            .findOne({
            passwordResetToken: tokenHash,
            passwordResetTokenExpiresAt: { $gt: new Date() },
        })
            .lean()
            .exec();
    }
    async create(data) {
        try {
            const created = await this.model.create({
                email: data.email.toLowerCase().trim(),
                passwordHash: data.passwordHash,
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
            });
            return created.toObject();
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException('An account with this email already exists');
            }
            throw err;
        }
    }
    async setEmailVerified(userId) {
        await this.model.findByIdAndUpdate(userId, {
            $set: {
                isEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationTokenExpiresAt: null,
            },
        });
    }
    async setEmailVerificationToken(userId, tokenHash, expiresAt) {
        await this.model.findByIdAndUpdate(userId, {
            $set: {
                emailVerificationToken: tokenHash,
                emailVerificationTokenExpiresAt: expiresAt,
            },
        });
    }
    async setPasswordResetToken(userId, tokenHash, expiresAt) {
        await this.model.findByIdAndUpdate(userId, {
            $set: {
                passwordResetToken: tokenHash,
                passwordResetTokenExpiresAt: expiresAt,
            },
        });
    }
    async setPasswordHash(userId, passwordHash) {
        await this.model.findByIdAndUpdate(userId, {
            $set: {
                passwordHash,
                passwordResetToken: null,
                passwordResetTokenExpiresAt: null,
            },
        });
    }
    async createInvitedUser(params) {
        const existing = await this.model
            .findOne({ email: params.email.toLowerCase().trim() })
            .lean()
            .exec();
        if (existing) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const tempPassword = this.generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        const scope = params.role === 'platform_admin' ? 'global' : 'company';
        const user = await this.model.create({
            email: params.email.toLowerCase().trim(),
            passwordHash,
            firstName: params.firstName.trim(),
            lastName: params.lastName.trim(),
            role: params.role,
            scope,
            companyId: params.companyId,
            businessKey: params.businessKey,
            isActive: true,
            isEmailVerified: true,
            mustChangePassword: true,
            temporaryPasswordCreatedAt: new Date(),
            temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        });
        return { user: user.toObject(), tempPassword };
    }
    async refreshTemporaryPassword(userId) {
        const tempPassword = this.generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        await this.model.findByIdAndUpdate(userId, {
            $set: {
                passwordHash,
                mustChangePassword: true,
                temporaryPasswordCreatedAt: new Date(),
                temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            },
        });
        return tempPassword;
    }
    async setUserActive(userId, isActive) {
        const updated = await this.model
            .findByIdAndUpdate(userId, { $set: { isActive } }, { new: true })
            .select('-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt' +
            ' -passwordResetToken -passwordResetTokenExpiresAt')
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async listPlatformUsers(params) {
        const roleFilter = { $in: ['platform_admin', 'business_owner'] };
        const filter = { role: roleFilter };
        if (params.search?.trim()) {
            const re = new RegExp(params.search.trim(), 'i');
            filter['$and'] = [
                { role: roleFilter },
                { $or: [{ email: re }, { firstName: re }, { lastName: re }] },
            ];
            delete filter['role'];
        }
        const skip = (params.page - 1) * params.limit;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .select('-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter),
        ]);
        return {
            items: items,
            total,
            page: params.page,
            limit: params.limit,
        };
    }
    async listByCompanyId(companyId, params) {
        const filter = { companyId };
        if (params.search?.trim()) {
            const re = new RegExp(params.search.trim(), 'i');
            filter['$or'] = [{ email: re }, { firstName: re }, { lastName: re }];
        }
        const skip = (params.page - 1) * params.limit;
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .select('-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(params.limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter),
        ]);
        return {
            items: items,
            total,
            page: params.page,
            limit: params.limit,
        };
    }
    async update(userId, data) {
        const $set = {};
        if (data.firstName !== undefined)
            $set.firstName = data.firstName.trim();
        if (data.lastName !== undefined)
            $set.lastName = data.lastName.trim();
        if (data.avatarUrl !== undefined)
            $set.avatarUrl = data.avatarUrl?.trim() || null;
        const updated = await this.model
            .findByIdAndUpdate(userId, { $set }, { new: true })
            .select('-passwordHash')
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = (await this.model.findById(userId).lean().exec());
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        const updated = await this.model
            .findByIdAndUpdate(userId, { $set: { passwordHash: hash, mustChangePassword: false } }, { new: true })
            .select('-passwordHash -emailVerificationToken -emailVerificationTokenExpiresAt -passwordResetToken -passwordResetTokenExpiresAt')
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('User not found');
        return updated;
    }
    async deleteById(id) {
        const result = await this.model.findByIdAndDelete(id).exec();
        if (!result)
            throw new common_1.NotFoundException('User not found');
    }
    async countActiveOwners(companyId) {
        return this.model
            .countDocuments({
            companyId,
            role: 'business_owner',
            isActive: { $ne: false },
        })
            .exec();
    }
    async createCompanyOwnerWithCompany(params) {
        const email = params.email.toLowerCase().trim();
        const existingUser = await this.model.findOne({ email }).lean().exec();
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const businessKey = this.slugify(params.businessName);
        if (!businessKey) {
            throw new common_1.BadRequestException('businessName must contain at least one alphanumeric character');
        }
        let company;
        try {
            company = await this.companyModel.create({
                businessKey,
                businessName: params.businessName.trim(),
                isActive: true,
            });
        }
        catch (err) {
            if (err?.code === 11000) {
                throw new common_1.ConflictException(`A business with the name "${params.businessName}" already exists. Please choose a different name.`);
            }
            throw err;
        }
        const companyId = String(company._id);
        let user;
        try {
            user = await this.model.create({
                email,
                passwordHash: params.passwordHash,
                firstName: params.firstName.trim(),
                lastName: params.lastName.trim(),
                role: 'business_owner',
                scope: 'company',
                companyId,
                businessKey: businessKey,
                isActive: true,
                isEmailVerified: false,
                mustChangePassword: false,
            });
        }
        catch (err) {
            await this.companyModel
                .findByIdAndDelete(company._id)
                .exec()
                .catch(() => void 0);
            if (err?.code === 11000) {
                throw new common_1.ConflictException('An account with this email already exists');
            }
            throw err;
        }
        await this.companyModel
            .findByIdAndUpdate(company._id, {
            $set: { ownerUserId: String(user._id) },
        })
            .exec()
            .catch(() => void 0);
        return {
            company: company.toObject(),
            user: user.toObject(),
        };
    }
    async getPlatformCompanyId() {
        const company = await this.companyModel
            .findOne({ isPlatformCompany: true })
            .select('_id')
            .lean()
            .exec();
        return company ? String(company._id) : null;
    }
    async getPlatformCompanyDetails() {
        const doc = (await this.companyModel
            .findOne({ isPlatformCompany: true })
            .select('_id businessName businessKey isPlatformCompany')
            .lean()
            .exec());
        if (!doc)
            return null;
        return {
            id: String(doc._id),
            businessName: doc.businessName ?? '',
            businessKey: doc.businessKey ?? '',
            isPlatformCompany: doc.isPlatformCompany ?? false,
        };
    }
    async getCompanyDisplayName(companyId) {
        try {
            if (!companyId)
                return companyId;
            const doc = (await this.companyModel
                .findById(companyId)
                .select('businessName')
                .lean()
                .exec());
            return doc?.businessName ?? companyId;
        }
        catch {
            return companyId;
        }
    }
    generateTempPassword() {
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
        const bytes = (0, crypto_1.randomBytes)(16);
        return Array.from(bytes, (b) => charset[b % charset.length]).join('');
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
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map