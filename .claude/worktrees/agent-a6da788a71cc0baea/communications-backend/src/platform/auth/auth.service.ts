import {
  BadRequestException,
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
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { PlatformMailService } from '../../infrastructure/platform-mail/platform-mail.service';

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
    private readonly mail: PlatformMailService,
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // ConflictException (409) is thrown by UsersService on duplicate email.
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // Generate and store a verification token — fire-and-forget the email.
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    await this.users.setEmailVerificationToken(
      String(user._id),
      tokenHash,
      expiresAt,
    );

    const verificationUrl = this.buildUrl(
      `/auth/verify-email?token=${rawToken}`,
    );

    this.mail
      .sendEmailVerification(user.email, user.firstName, verificationUrl)
      .catch((err) =>
        this.logger.warn(`Verification email failed for ${user.email}: ${err?.message}`),
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

    // Never reveal whether the email exists — always say "Invalid credentials".
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
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

    // Look up by hash regardless of revocation status (needed for reuse detection).
    const stored = await this.tokenModel.findOne({ tokenHash }).lean().exec();

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // ── Reuse attack: token exists but was already used ──────────────────────
    if (stored.isRevoked) {
      this.logger.warn(
        `Refresh token reuse detected for userId=${stored.userId}. Revoking all sessions.`,
      );
      await this.revokeAllTokensForUser(String(stored.userId));
      throw new UnauthorizedException(
        'Refresh token already used. All sessions have been revoked for security.',
      );
    }

    // ── Expiry check ─────────────────────────────────────────────────────────
    if (new Date() > stored.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // ── Rotate: revoke old, issue new ─────────────────────────────────────────
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

    // Always return success — idempotent, prevents token existence leakage.
    return { message: 'Logged out successfully' };
  }

  // ─── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_RESPONSE = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    const user = await this.users.findByEmailWithPassword(email);
    if (!user) return SAFE_RESPONSE; // Do not leak user existence.

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h

    await this.users.setPasswordResetToken(String(user._id), tokenHash, expiresAt);

    const resetUrl = this.buildUrl(`/auth/reset-password?token=${rawToken}`);

    this.mail
      .sendPasswordReset(user.email, user.firstName, resetUrl)
      .catch((err) =>
        this.logger.warn(`Password reset email failed for ${user.email}: ${err?.message}`),
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

    // Revoke all sessions — password change should invalidate existing sessions.
    await this.revokeAllTokensForUser(String(user._id));

    return { message: 'Password reset successfully. You can now log in.' };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async issueTokens(userId: string): Promise<TokensOnlyDto> {
    const expiresIn = this.accessTokenExpiresInSeconds();

    const accessToken = await this.jwt.signAsync({
      sub: userId,
      type: 'access',
    });

    // Refresh token: random string, stored as hash.
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

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private buildUrl(path: string): string {
    const base = (
      this.config.get<string>('APP_BASE_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');
    return `${base}${path}`;
  }

  private accessTokenExpiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    // Parse simple duration strings: 15m, 1h, 7d.
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multiplier[unit] ?? 60);
  }

  private refreshTokenExpiresAt(): Date {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const seconds = this.parseDurationToSeconds(raw);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseDurationToSeconds(raw: string): number {
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 7 * 86400;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multiplier[unit] ?? 86400);
  }
}
