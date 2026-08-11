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
import { NotificationService } from '../communication/notifications/notification.service';
import { CompanyProvisioningService } from '../communication/company/provisioning/company-provisioning.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, TokensOnlyDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notification: NotificationService,
    private readonly provisioning: CompanyProvisioningService,
    private readonly http: HttpService,
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
  ) {}

  // ─── Register (Flow A — DEC-009 Rev-2) ────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Phase 1: create Company + company_owner (compensating rollback in UsersService).
    const { company, user } = await this.users.createCompanyOwnerWithCompany({
      companyName: dto.companyName,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const companyId = String(company._id ?? (company as any).id);
    const userId = String(user._id ?? (user as any).id);

    // Phase 2: async provisioning — never blocks the response or rolls back Phase 1.
    this.provisioning
      .provisionCompany(companyId)
      .catch((err) =>
        this.logger.warn(
          `Provisioning failed for company ${companyId}: ${err?.message} — company record intact`,
        ),
      );

    // Phase 2: generate email verification token and dispatch notification.
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    await this.users.setEmailVerificationToken(userId, tokenHash, expiresAt);

    // Fire-and-forget — routed through the modules company (DEC-009 Rev-2 §2).
    this.notifyVerifyEmail({
      email: user.email,
      firstName: user.firstName,
      verificationUrl: this.buildUrl(`/auth/verify-email?token=${rawToken}`),
      expiresAt,
      loginUrl: this.buildUrl('/auth/login'),
    }).catch((err) =>
      this.logger.warn(
        `notifyVerifyEmail failed for ${user.email}: ${err?.message}`,
      ),
    );

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

  async loginWithGrapifly(code: string): Promise<AuthResponseDto> {
    if (!code) throw new UnauthorizedException('Missing Grapifly SSO code');
    const baseUrl = this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101';
    const clientSecret = this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!clientSecret) throw new UnauthorizedException('Grapifly SSO is not configured');

    let identity: {
      grapiflyUserId: string;
      email: string;
      emailVerified: boolean;
      displayName: string;
      avatarUrl: string | null;
    };
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${baseUrl.replace(/\/$/, '')}/auth/sso/exchange`,
          { code, appKey: 'relay' },
          { headers: { 'x-grapifly-sso-secret': clientSecret }, timeout: 5000 },
        ),
      );
      identity = response.data;
    } catch {
      throw new UnauthorizedException('Invalid or expired Grapifly SSO code');
    }

    const user = await this.users.linkGrapiflyIdentity(identity);
    if (!user.isActive) throw new ForbiddenException('Relay account is inactive');
    const tokens = await this.issueTokens(String(user._id));
    return { ...tokens, user: UserResponseDto.from(user) };
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

    this.logger.log(`[forgotPassword] reset token created userId=${user._id}`);

    const resetUrl = this.buildUrl(`/auth/reset-password?token=${rawToken}`);

    if (user.scope === 'company' && user.companyId) {
      const companyName = await this.users
        .getCompanyDisplayName(String(user.companyId))
        .catch(() => String(user.companyId));

      this.logger.log(
        `[forgotPassword] dispatch company event companyId=${user.companyId} email=${user.email}`,
      );

      this.notifyCompanyForgotPassword({
        companyId: String(user.companyId),
        companyName,
        email: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresAt,
      }).catch((err) =>
        this.logger.warn(
          `notifyCompanyForgotPassword failed for ${user.email}: ${err?.message}`,
        ),
      );
    } else {
      this.logger.log(
        `[forgotPassword] dispatch platform event companyId=${user.companyId ?? 'null'} email=${user.email}`,
      );

      this.notifyPlatformForgotPassword({
        companyId: user.companyId ? String(user.companyId) : null,
        email: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresAt,
      }).catch((err) =>
        this.logger.warn(
          `notifyPlatformForgotPassword failed for ${user.email}: ${err?.message}`,
        ),
      );
    }

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

    // Fire-and-forget — route through the correct event based on user scope.
    const changedAt = new Date().toISOString();
    if (user.scope === 'company' && user.companyId) {
      const companyName = await this.users
        .getCompanyDisplayName(String(user.companyId))
        .catch(() => String(user.companyId));
      this.notifyCompanyPasswordChanged({
        companyId: String(user.companyId),
        companyName,
        email: user.email,
        firstName: user.firstName,
        changedAt,
      }).catch((err) =>
        this.logger.warn(
          `notifyCompanyPasswordChanged failed for ${user.email}: ${err?.message}`,
        ),
      );
    } else {
      this.notifyPlatformPasswordChanged({
        companyId: user.companyId ? String(user.companyId) : null,
        email: user.email,
        firstName: user.firstName,
        changedAt,
      }).catch((err) =>
        this.logger.warn(
          `notifyPlatformPasswordChanged failed for ${user.email}: ${err?.message}`,
        ),
      );
    }

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ─── Private: notification helpers ────────────────────────────────────────

  /**
   * Verification email after public self-registration.
   * Always routed through the modules company because new companies have no
   * delivery channel configured yet (DEC-009 Rev-2 §2).
   * → security.company_verify_email
   */
  private async notifyVerifyEmail(params: {
    email: string;
    firstName: string;
    verificationUrl: string;
    expiresAt: Date;
    loginUrl: string;
  }): Promise<void> {
    const platformCompanyId = await this.users
      .getPlatformCompanyId()
      .catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(
        `company_verify_email: platform company not found — notification skipped for ${params.email}`,
      );
      return;
    }
    await this.fireNotification(
      platformCompanyId,
      'security.company_verify_email',
      params.email,
      {
        firstName: params.firstName,
        email: params.email,
        verificationUrl: params.verificationUrl,
        expiresAt: params.expiresAt.toISOString(),
        loginUrl: params.loginUrl,
      },
    );
  }

  /**
   * Password reset email for company users.
   * Always routed through the Platform Company (Grapifly) — same pattern as
   * notifyVerifyEmail(). companyName is a template variable only.
   * → security.company_forgot_password
   */
  private async notifyCompanyForgotPassword(params: {
    companyId: string;
    companyName: string;
    email: string;
    firstName: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const platformCompanyId = await this.users
      .getPlatformCompanyId()
      .catch(() => null);

    if (!platformCompanyId) {
      this.logger.warn(
        `[company_forgot_password] platform company not found - skipped for ${params.email}`,
      );
      return;
    }

    this.logger.log(
      `[company_forgot_password] platformCompanyId=${platformCompanyId} ` +
        `originalCompanyId=${params.companyId} email=${params.email}`,
    );

    const delivered = await this.fireNotification(
      platformCompanyId,
      'security.company_forgot_password',
      params.email,
      {
        firstName: params.firstName,
        email: params.email,
        companyName: params.companyName,
        resetUrl: params.resetUrl,
        expiresAt: params.expiresAt.toISOString(),
      },
    );

    this.logger.log(
      `[company_forgot_password] delivered=${delivered} email=${params.email}`,
    );
  }
  /**
   * Password reset email for modules administrators.
   * Always routed through the Platform Company (Grapifly) — same pattern as
   * notifyVerifyEmail(). originalCompanyId is logged for debugging only.
   * → security.platform_forgot_password
   */
  private async notifyPlatformForgotPassword(params: {
    companyId: string | null;
    email: string;
    firstName: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const platformCompanyId = await this.users
      .getPlatformCompanyId()
      .catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(
        `platform_forgot_password: platform company not found — notification skipped for ${params.email}`,
      );
      return;
    }
    this.logger.log(
      `[platform_forgot_password] event=security.platform_forgot_password` +
        ` platformCompanyId=${platformCompanyId} originalCompanyId=${params.companyId ?? 'null'} email=${params.email}`,
    );
    await this.fireNotification(
      platformCompanyId,
      'security.platform_forgot_password',
      params.email,
      {
        firstName: params.firstName,
        email: params.email,
        resetUrl: params.resetUrl,
        expiresAt: params.expiresAt.toISOString(),
      },
    );
  }

  /**
   * Password-changed confirmation for company users.
   * Always routed through the Platform Company (Grapifly) — same pattern as
   * notifyVerifyEmail(). companyName is a template variable only.
   * → security.company_password_changed
   */
  private async notifyCompanyPasswordChanged(params: {
    companyId: string;
    companyName: string;
    email: string;
    firstName: string;
    changedAt: string;
  }): Promise<void> {
    const platformCompanyId = await this.users
      .getPlatformCompanyId()
      .catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(
        `company_password_changed: platform company not found — notification skipped for ${params.email}`,
      );
      return;
    }
    this.logger.log(
      `[company_password_changed] event=security.company_password_changed` +
        ` platformCompanyId=${platformCompanyId} originalCompanyId=${params.companyId} email=${params.email}`,
    );
    await this.fireNotification(
      platformCompanyId,
      'security.company_password_changed',
      params.email,
      {
        firstName: params.firstName,
        email: params.email,
        companyName: params.companyName,
        when: params.changedAt,
        changedAt: params.changedAt,
      },
    );
  }

  /**
   * Password-changed confirmation for modules administrators.
   * Always routed through the Platform Company (Grapifly) — same pattern as
   * notifyVerifyEmail(). originalCompanyId is logged for debugging only.
   * → security.platform_password_changed
   */
  private async notifyPlatformPasswordChanged(params: {
    companyId: string | null;
    email: string;
    firstName: string;
    changedAt: string;
  }): Promise<void> {
    const platformCompanyId = await this.users
      .getPlatformCompanyId()
      .catch(() => null);
    if (!platformCompanyId) {
      this.logger.warn(
        `platform_password_changed: platform company not found — notification skipped for ${params.email}`,
      );
      return;
    }
    this.logger.log(
      `[platform_password_changed] event=security.platform_password_changed` +
        ` platformCompanyId=${platformCompanyId} originalCompanyId=${params.companyId ?? 'null'} email=${params.email}`,
    );
    await this.fireNotification(
      platformCompanyId,
      'security.platform_password_changed',
      params.email,
      {
        firstName: params.firstName,
        email: params.email,
        when: params.changedAt,
        changedAt: params.changedAt,
      },
    );
  }

  /**
   * Thin wrapper around NotificationService.notifyEvent().
   * Returns true if at least one channel delivered successfully.
   * Logs warnings but never throws — callers decide how to handle the result.
   * Follows the same contract as UserInvitationsService.fireNotification().
   */
  private async fireNotification(
    companyId: string,
    event: string,
    email: string,
    data: Record<string, string | undefined>,
  ): Promise<boolean> {
    try {
      const result = await this.notification.notifyEvent({
        companyId,
        event,
        email,
        payload: { data },
      });
      const delivered = result.results.some((r) => r.success);
      if (!delivered) {
        const errors = result.results
          .map((r) => r.error)
          .filter(Boolean)
          .join('; ');
        this.logger.warn(`[${event}] did not deliver for ${email}: ${errors}`);
      }
      return delivered;
    } catch (err: any) {
      this.logger.warn(`[${event}] threw for ${email}: ${err?.message}`);
      return false;
    }
  }

  // ─── Private: token helpers ────────────────────────────────────────────────

  private async issueTokens(userId: string): Promise<TokensOnlyDto> {
    const expiresIn = this.accessTokenExpiresInSeconds();

    // Resolve companyId so GlobalAuthGuard can populate authContext.companyId.
    // Platform admins (scope='global') with a null companyId fall back to the
    // platform company so scoped controllers (e.g. CalendarController) work.
    const user = await this.users.findById(userId);
    let companyId: string | undefined = user?.companyId
      ? String(user.companyId)
      : undefined;
    if (!companyId && (user as any)?.scope === 'global') {
      companyId =
        (await this.users.getPlatformCompanyId().catch(() => null)) ??
        undefined;
    }

    const accessToken = await this.jwt.signAsync({
      sub: userId,
      type: 'access',
      ...(companyId !== undefined && { companyId }),
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
