import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { ProvisioningService } from '../provisioning/provisioning.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, TokensOnlyDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly commClient: CommunicationsClientService,
    private readonly provisioning: ProvisioningService,
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
  ) {}

  // ─── Register (Flow A — DEC-009 Rev-2) ────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Phase 1: create Company + business_owner (compensating rollback in UsersService).
    const { company, user } = await this.users.createCompanyOwnerWithCompany({
      businessName: dto.businessName,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const userId = String(user._id ?? (user as any).id);
    const companyId = String(company._id ?? (company as any).id);

    // Phase 2a: async business provisioning (fire-and-forget).
    this.provisioning.provisionBusiness(companyId).catch((err) => {
      this.logger.error(
        `[register] Provisioning failed for companyId=${companyId}: ${err?.message}`,
      );
    });

    // Phase 2b: generate email verification token and dispatch notification.
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    await this.users.setEmailVerificationToken(userId, tokenHash, expiresAt);

    this.logger.log(
      `[register] verification token generated userId=${userId} email=${user.email} ` +
        `tokenGenerated=true expiresAt=${expiresAt.toISOString()}`,
    );

    const verificationUrl = this.buildUrl(`/auth/verify-email?token=${rawToken}`);
    const loginUrl = this.buildUrl('/auth/login');

    // Fire-and-forget — never blocks registration.
    // Uses Platform base Business credentials (type='platform').
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
        this.logger.log(
          `[register] security.company_verify_email delivered=${delivered} userId=${userId}`,
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[register] security.company_verify_email threw unexpectedly: ${msg}`);
      });

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  // ─── Verify email ──────────────────────────────────────────────────────────

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = this.sha256(rawToken);
    const user = await this.users.findByEmailVerificationToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.users.setEmailVerified(String(user._id));
    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Email verification gate (DEC-009 §1.1).
    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in.',
      });
    }

    // Account activation gate (DEC-008 A2 BR-005).
    if (!user.isActive) {
      throw new ForbiddenException({
        error: 'ACCOUNT_INACTIVE',
        message: 'This account has been deactivated. Please contact support.',
      });
    }

    const tokens = await this.issueTokens(String(user._id));

    return {
      ...tokens,
      user: UserResponseDto.from(user),
    };
  }

  // ─── Refresh tokens ────────────────────────────────────────────────────────

  async refreshTokens(rawRefreshToken: string): Promise<TokensOnlyDto> {
    const tokenHash = this.sha256(rawRefreshToken);
    const stored = await this.tokenModel.findOne({ tokenHash }).lean().exec();

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.isRevoked) {
      this.logger.warn(
        `Refresh token reuse detected for userId=${stored.userId}. Revoking all sessions.`,
      );
      await this.revokeAllTokensForUser(String(stored.userId));
      throw new UnauthorizedException(
        'Refresh token already used. All sessions have been revoked for security.',
      );
    }

    if (new Date() > stored.expiresAt) {
      throw new UnauthorizedException(
        'Refresh token has expired. Please log in again.',
      );
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

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.sha256(rawRefreshToken);

    await this.tokenModel.findOneAndUpdate(
      { tokenHash, isRevoked: false },
      { $set: { isRevoked: true } },
    );

    return { message: 'Logged out successfully' };
  }

  // ─── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_RESPONSE = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    this.logger.log(`[forgotPassword] request email=${email}`);

    const user = await this.users.findByEmailWithPassword(email);

    if (!user) {
      this.logger.warn(`[forgotPassword] user not found email=${email}`);
      return SAFE_RESPONSE;
    }

    this.logger.log(
      `[forgotPassword] user found id=${user._id} scope=${user.scope} companyId=${user.companyId}`,
    );

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h

    await this.users.setPasswordResetToken(
      String(user._id),
      tokenHash,
      expiresAt,
    );

    this.logger.log(
      `[forgotPassword] reset token generated userId=${user._id} ` +
        `tokenGenerated=true expiresAt=${expiresAt.toISOString()}`,
    );

    const resetUrl = this.buildUrl(`/auth/reset-password?token=${rawToken}`);
    const businessName = user.companyId
      ? await this.users
          .getCompanyDisplayName(String(user.companyId))
          .catch(() => '')
      : '';

    // Awaited so delivery result can be logged before returning.
    // Safe response is always returned regardless of delivery outcome.
    // Uses Platform base Business credentials (type='platform').
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
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[forgotPassword] security.company_forgot_password threw unexpectedly: ${msg}`);
        return false;
      });

    this.logger.log(
      `[forgotPassword] security.company_forgot_password delivered=${delivered} userId=${user._id}`,
    );

    return SAFE_RESPONSE;
  }

  // ─── Reset password ────────────────────────────────────────────────────────

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.sha256(rawToken);
    const user = await this.users.findByPasswordResetToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(String(user._id), passwordHash);

    // Revoke all sessions — password change must invalidate existing sessions.
    await this.revokeAllTokensForUser(String(user._id));

    const businessName = user.companyId
      ? await this.users
          .getCompanyDisplayName(String(user.companyId))
          .catch(() => '')
      : '';

    const when = new Date().toISOString();

    this.logger.log(
      `[resetPassword] password updated userId=${user._id} email=${user.email} when=${when}`,
    );

    // Fire-and-forget — password already updated, notification failure must not cause a retry.
    // Uses Platform base Business credentials (type='platform').
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
        this.logger.log(
          `[resetPassword] security.company_password_changed delivered=${delivered} userId=${user._id}`,
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[resetPassword] security.company_password_changed threw unexpectedly: ${msg}`);
      });

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ─── Private: token helpers ────────────────────────────────────────────────

  private async issueTokens(userId: string): Promise<TokensOnlyDto> {
    const expiresIn = this.accessTokenExpiresInSeconds();

    const accessToken = await this.jwt.signAsync({
      sub: userId,
      type: 'access',
    });

    const rawRefreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = this.sha256(rawRefreshToken);
    const refreshExpiresAt = this.refreshTokenExpiresAt();

    await this.tokenModel.create({
      userId: new Types.ObjectId(userId),
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

  private async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.tokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { $set: { isRevoked: true } },
    );
  }

  // ─── Private: utilities ────────────────────────────────────────────────────

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Builds a URL pointing to the frontend application.
   * FRONTEND_BASE_URL takes precedence over APP_BASE_URL so that email links
   * (verify-email, reset-password) always go to the UI and never to the API.
   */
  private buildUrl(path: string): string {
    const base = (
      this.config.get<string>('FRONTEND_BASE_URL') ||
      this.config.get<string>('APP_BASE_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}${path}`;
  }

  private accessTokenExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 900;
    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return parseInt(match[1], 10) * (multiplier[match[2]] ?? 60);
  }

  private refreshTokenExpiresAt(): Date {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const seconds = this.parseDurationToSeconds(raw);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseDurationToSeconds(raw: string): number {
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 7 * 86400;
    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return parseInt(match[1], 10) * (multiplier[match[2]] ?? 86400);
  }
}
