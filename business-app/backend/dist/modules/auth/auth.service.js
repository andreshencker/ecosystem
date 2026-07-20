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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const users_service_1 = require("../users/users.service");
const refresh_token_schema_1 = require("./schemas/refresh-token.schema");
const communications_client_service_1 = require("../../integrations/communications/client/communications-client.service");
const provisioning_service_1 = require("../provisioning/provisioning.service");
const user_response_dto_1 = require("../users/dto/user-response.dto");
const BCRYPT_ROUNDS = 12;
let AuthService = AuthService_1 = class AuthService {
    users;
    jwt;
    config;
    commClient;
    provisioning;
    tokenModel;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(users, jwt, config, commClient, provisioning, tokenModel) {
        this.users = users;
        this.jwt = jwt;
        this.config = config;
        this.commClient = commClient;
        this.provisioning = provisioning;
        this.tokenModel = tokenModel;
    }
    async register(dto) {
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const { company, user } = await this.users.createCompanyOwnerWithCompany({
            businessName: dto.businessName,
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
        });
        const userId = String(user._id ?? user.id);
        const companyId = String(company._id ?? company.id);
        this.provisioning.provisionBusiness(companyId).catch((err) => {
            this.logger.error(`[register] Provisioning failed for companyId=${companyId}: ${err?.message}`);
        });
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.sha256(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.users.setEmailVerificationToken(userId, tokenHash, expiresAt);
        this.logger.log(`[register] verification token generated userId=${userId} email=${user.email} ` +
            `tokenGenerated=true expiresAt=${expiresAt.toISOString()}`);
        const verificationUrl = this.buildUrl(`/auth/verify-email?token=${rawToken}`);
        const loginUrl = this.buildUrl('/auth/login');
        this.commClient
            .notifyEvent({
            type: 'platform',
            event: 'security.company_verify_email',
            email: user.email,
            data: {
                firstName: user.firstName,
                email: user.email,
                verificationUrl,
                expiresAt: expiresAt.toISOString(),
                loginUrl,
            },
        })
            .then((delivered) => {
            this.logger.log(`[register] security.company_verify_email delivered=${delivered} userId=${userId}`);
        })
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[register] security.company_verify_email threw unexpectedly: ${msg}`);
        });
        return {
            message: 'Registration successful. Please check your email to verify your account.',
        };
    }
    async verifyEmail(rawToken) {
        const tokenHash = this.sha256(rawToken);
        const user = await this.users.findByEmailVerificationToken(tokenHash);
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired verification link');
        }
        await this.users.setEmailVerified(String(user._id));
        return { message: 'Email verified successfully. You can now log in.' };
    }
    async login(dto) {
        const user = await this.users.findByEmailWithPassword(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isEmailVerified) {
            throw new common_1.ForbiddenException({
                error: 'EMAIL_NOT_VERIFIED',
                message: 'Please verify your email address before logging in.',
            });
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException({
                error: 'ACCOUNT_INACTIVE',
                message: 'This account has been deactivated. Please contact support.',
            });
        }
        const tokens = await this.issueTokens(String(user._id));
        return {
            ...tokens,
            user: user_response_dto_1.UserResponseDto.from(user),
        };
    }
    async refreshTokens(rawRefreshToken) {
        const tokenHash = this.sha256(rawRefreshToken);
        const stored = await this.tokenModel.findOne({ tokenHash }).lean().exec();
        if (!stored) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (stored.isRevoked) {
            this.logger.warn(`Refresh token reuse detected for userId=${stored.userId}. Revoking all sessions.`);
            await this.revokeAllTokensForUser(String(stored.userId));
            throw new common_1.UnauthorizedException('Refresh token already used. All sessions have been revoked for security.');
        }
        if (new Date() > stored.expiresAt) {
            throw new common_1.UnauthorizedException('Refresh token has expired. Please log in again.');
        }
        const newTokens = await this.issueTokens(String(stored.userId));
        await this.tokenModel.findByIdAndUpdate(stored._id, {
            $set: {
                isRevoked: true,
                replacedByTokenHash: this.sha256(newTokens.refreshToken),
            },
        });
        return newTokens;
    }
    async logout(rawRefreshToken) {
        const tokenHash = this.sha256(rawRefreshToken);
        await this.tokenModel.findOneAndUpdate({ tokenHash, isRevoked: false }, { $set: { isRevoked: true } });
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(email) {
        const SAFE_RESPONSE = {
            message: 'If an account with that email exists, a password reset link has been sent.',
        };
        this.logger.log(`[forgotPassword] request email=${email}`);
        const user = await this.users.findByEmailWithPassword(email);
        if (!user) {
            this.logger.warn(`[forgotPassword] user not found email=${email}`);
            return SAFE_RESPONSE;
        }
        this.logger.log(`[forgotPassword] user found id=${user._id} scope=${user.scope} companyId=${user.companyId}`);
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = this.sha256(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.users.setPasswordResetToken(String(user._id), tokenHash, expiresAt);
        this.logger.log(`[forgotPassword] reset token generated userId=${user._id} ` +
            `tokenGenerated=true expiresAt=${expiresAt.toISOString()}`);
        const resetUrl = this.buildUrl(`/auth/reset-password?token=${rawToken}`);
        const businessName = user.companyId
            ? await this.users
                .getCompanyDisplayName(String(user.companyId))
                .catch(() => '')
            : '';
        const delivered = await this.commClient
            .notifyEvent({
            type: 'platform',
            event: 'security.company_forgot_password',
            email: user.email,
            data: {
                firstName: user.firstName,
                email: user.email,
                businessName,
                resetUrl,
                expiresAt: expiresAt.toISOString(),
            },
        })
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[forgotPassword] security.company_forgot_password threw unexpectedly: ${msg}`);
            return false;
        });
        this.logger.log(`[forgotPassword] security.company_forgot_password delivered=${delivered} userId=${user._id}`);
        return SAFE_RESPONSE;
    }
    async resetPassword(rawToken, newPassword) {
        const tokenHash = this.sha256(rawToken);
        const user = await this.users.findByPasswordResetToken(tokenHash);
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset link');
        }
        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.users.setPasswordHash(String(user._id), passwordHash);
        await this.revokeAllTokensForUser(String(user._id));
        const businessName = user.companyId
            ? await this.users
                .getCompanyDisplayName(String(user.companyId))
                .catch(() => '')
            : '';
        const when = new Date().toISOString();
        this.logger.log(`[resetPassword] password updated userId=${user._id} email=${user.email} when=${when}`);
        this.commClient
            .notifyEvent({
            type: 'platform',
            event: 'security.company_password_changed',
            email: user.email,
            data: {
                firstName: user.firstName,
                email: user.email,
                businessName,
                when,
            },
        })
            .then((delivered) => {
            this.logger.log(`[resetPassword] security.company_password_changed delivered=${delivered} userId=${user._id}`);
        })
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[resetPassword] security.company_password_changed threw unexpectedly: ${msg}`);
        });
        return { message: 'Password reset successfully. You can now log in.' };
    }
    async issueTokens(userId) {
        const expiresIn = this.accessTokenExpiresInSeconds();
        const accessToken = await this.jwt.signAsync({
            sub: userId,
            type: 'access',
        });
        const rawRefreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const refreshTokenHash = this.sha256(rawRefreshToken);
        const refreshExpiresAt = this.refreshTokenExpiresAt();
        await this.tokenModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            tokenHash: refreshTokenHash,
            isRevoked: false,
            expiresAt: refreshExpiresAt,
        });
        return {
            accessToken,
            refreshToken: rawRefreshToken,
            expiresIn,
        };
    }
    async revokeAllTokensForUser(userId) {
        await this.tokenModel.updateMany({ userId: new mongoose_2.Types.ObjectId(userId), isRevoked: false }, { $set: { isRevoked: true } });
    }
    sha256(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    buildUrl(path) {
        const base = (this.config.get('FRONTEND_BASE_URL') ||
            this.config.get('APP_BASE_URL') ||
            'http://localhost:3000').replace(/\/$/, '');
        return `${base}${path}`;
    }
    accessTokenExpiresInSeconds() {
        const raw = this.config.get('JWT_ACCESS_EXPIRES_IN', '15m');
        const match = /^(\d+)([smhd])$/.exec(raw);
        if (!match)
            return 900;
        const multiplier = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
        };
        return parseInt(match[1], 10) * (multiplier[match[2]] ?? 60);
    }
    refreshTokenExpiresAt() {
        const raw = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
        const seconds = this.parseDurationToSeconds(raw);
        return new Date(Date.now() + seconds * 1000);
    }
    parseDurationToSeconds(raw) {
        const match = /^(\d+)([smhd])$/.exec(raw);
        if (!match)
            return 7 * 86400;
        const multiplier = {
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
        };
        return parseInt(match[1], 10) * (multiplier[match[2]] ?? 86400);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, mongoose_1.InjectModel)(refresh_token_schema_1.RefreshToken.name)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        communications_client_service_1.CommunicationsClientService,
        provisioning_service_1.ProvisioningService,
        mongoose_2.Model])
], AuthService);
//# sourceMappingURL=auth.service.js.map