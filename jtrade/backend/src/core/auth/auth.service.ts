// src/core/auth/auth.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserMapper } from '../users/mappers/user.mapper';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { AuthMapper } from './mappers/auth.mapper';

import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import {
  PasswordReset,
  PasswordResetDocument,
} from './schemas/password-reset.schema';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// ✅ Email verification
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerifyEmailDto } from './dto/resend-verify-email.dto';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';

// 🔔 Cliente hacia communications (3001)
import { NotificationsClient } from '../../microservices/communications-client/notifications/notifications-client';

// ✅ Enum tipado de eventos
import { AuthNotificationEvent } from '../../microservices/communications-client/eventCatalogue/events/auth-notification-events.enum';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordReset.name)
    private readonly passwordResetModel: Model<PasswordResetDocument>,
    @InjectModel(EmailVerification.name)
    private readonly emailVerificationModel: Model<EmailVerificationDocument>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsClient,
  ) {}

  // ==========================
  // Helpers internos
  // ==========================

  async onModuleInit() {
    await this.ensureAdminSeed();
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const found: any = await this.userModel
      .findOne({ email })
      .select('+passwordHash')
      .lean();

    if (!found) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const ok = await bcrypt.compare(dto.password, found.passwordHash);
    if (!ok) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (found.emailVerified !== true) {
      throw new HttpException('Email not verified', HttpStatus.FORBIDDEN);
    }

    const userDto: any = UserMapper.toResponse(found as any);

    // ✅ flags para frontend
    userDto.emailVerified = found.emailVerified ?? false;
    userDto.mustChangePassword = found.mustChangePassword ?? false;

    return this.buildAuthResponse(userDto);
  }

  // ✅ Register (CLIENT) - flujo estricto: NO tokens hasta verificar email
  async register(
    dto: RegisterDto,
  ): Promise<{ registered: boolean; email: string }> {
    const email = dto.email.toLowerCase().trim();

    const exists = await this.userModel.exists({ email }).lean();
    if (exists) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const doc = await this.userModel.create({
      firstName: dto.firstName.trim(),
      middleName: dto.middleName?.trim() || undefined,
      lastName: dto.lastName.trim(),
      secondLastName: dto.secondLastName?.trim() || undefined,
      email,
      passwordHash,
      role: UserRole.CLIENT,
      isActive: true,

      // ✅ requiere verificación antes de login
      emailVerified: false,
      emailVerifiedAt: null,

      mustChangePassword: false,
      mustChangePasswordAt: null,
    });

    const userDto: any = UserMapper.toResponse(doc.toObject() as any);

    // ✅ Crear token de verificación + enviar correo
    const token = await this.createEmailVerificationToken(String(doc._id));
    const verifyUrl = this.buildVerifyUrl(token);

    await this.sendVerifyEmail({
      email: userDto.email,
      firstName: userDto.firstName,
      verifyUrl,
      role: userDto.role,
    });

    // ✅ Importante: NO devolver tokens / NO iniciar sesión
    return { registered: true, email };
  }

  async createAdminAsAdmin(dto: CreateUserAdminDto): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const exists = await this.userModel.exists({ email }).lean();
    if (exists) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    // ✅ ahora el admin puede crear ADMIN o CLIENT (y cualquier rol permitido por el DTO)
    const autoPassword = this.generateAutoPassword(dto.firstName);
    const passwordHash = await bcrypt.hash(autoPassword, 12);

    const doc = await this.userModel.create({
      firstName: dto.firstName.trim(),
      middleName: dto.middleName?.trim() || undefined,
      lastName: dto.lastName.trim(),
      secondLastName: dto.secondLastName?.trim() || undefined,
      email,
      passwordHash,
      role: dto.role,
      isActive: dto.isActive ?? true,
      avatarUrl: dto.avatarUrl?.trim() || undefined,

      // ✅ todos deben verificar email
      emailVerified: false,
      emailVerifiedAt: null,

      // ✅ todos reciben password temporal y deben cambiarla
      mustChangePassword: true,
      mustChangePasswordAt: new Date(),
    });

    const user: any = UserMapper.toResponse(doc.toObject() as any);

    // ✅ link de login para el correo
    const loginUrl = this.config.get<string>('FRONTEND_LOGIN_PATH')
      ? this.buildFrontendUrl(this.config.get<string>('FRONTEND_LOGIN_PATH')!)
      : this.buildFrontendUrl('/login');

    // ✅ enviar credenciales temporales (usa el mismo evento que ya tienes)
    await this.safeNotify({
      event: AuthNotificationEvent.ADMIN_CREATED, // si quieres, luego lo renombramos a USER_CREATED
      email: user.email,
      variables: {
        firstName: user.firstName,
        companyName: this.config.get<string>('APP_NAME') ?? 'JTrade',
        email: user.email,
        password: autoPassword,
        role: user.role,
        mustChangePassword: true,
        loginUrl,
      },
    });

    // ✅ crear token de verificación y enviar correo
    const token = await this.createEmailVerificationToken(String(doc._id));
    const verifyUrl = this.buildVerifyUrl(token);

    await this.sendVerifyEmail({
      email: user.email,
      firstName: user.firstName ?? 'there',
      verifyUrl,
      role: user.role,
    });

    return user;
  }
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    const found: any = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .lean();

    if (!found) return null;

    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) return null;

    const dto: any = UserMapper.toResponse(found as any);
    dto.emailVerified = found.emailVerified ?? false;
    dto.mustChangePassword = found.mustChangePassword ?? false;
    return dto;
  }

  async me(userId: string): Promise<UserResponseDto> {
    const _id = new Types.ObjectId(userId);
    const doc: any = await this.userModel
      .findById(_id, { passwordHash: 0 })
      .lean();

    if (!doc) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const dto: any = UserMapper.toResponse(doc as any);
    dto.emailVerified = doc.emailVerified ?? false;
    dto.mustChangePassword = doc.mustChangePassword ?? false;
    return dto;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ changed: boolean }> {
    const raw: any = await this.userModel
      .findById(userId)
      .select('+passwordHash')
      .lean();

    if (!raw) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const ok = await bcrypt.compare(dto.current, raw.passwordHash);
    if (!ok) {
      throw new HttpException(
        'Invalid current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await bcrypt.hash(dto.next, 12);

    await this.userModel.updateOne(
      { _id: raw._id },
      {
        $set: {
          passwordHash: newHash,
          mustChangePassword: false,
          mustChangePasswordAt: null,
        },
      },
    );

    await this.safeNotify({
      event: AuthNotificationEvent.PASSWORD_CHANGED,
      email: raw.email,
      variables: {
        firstName: raw.firstName,
        email: raw.email,
        changedAt: new Date().toISOString(),
      },
    });

    return { changed: true };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const stored: any = await this.refreshTokenModel
      .findOne({ token: dto.refreshToken })
      .lean();

    if (
      !stored ||
      stored.isRevoked ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new HttpException(
        'Invalid or expired refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userDoc: any = await this.userModel.findById(stored.user).lean();
    if (!userDoc)
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    await this.refreshTokenModel.updateOne(
      { _id: stored._id },
      { $set: { isRevoked: true } },
    );

    const userDto: any = UserMapper.toResponse(userDoc as any);
    userDto.emailVerified = userDoc.emailVerified ?? false;
    userDto.mustChangePassword = userDoc.mustChangePassword ?? false;

    return this.buildAuthResponse(userDto);
  }

  // ==========================
  // FRONTEND URL helpers (reusable base)
  // ==========================

  async logout(dto: RefreshTokenDto): Promise<{ loggedOut: boolean }> {
    await this.refreshTokenModel.deleteOne({ token: dto.refreshToken });
    return { loggedOut: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: boolean }> {
    const email = dto.email.toLowerCase().trim();
    const user: any = await this.userModel.findOne({ email }).lean();
    if (!user) return { ok: true };

    const ttlMinutes = parseInt(
      this.config.get<string>('RESET_TOKEN_MINUTES') ?? '30',
      10,
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.passwordResetModel.create({
      user: user._id,
      token,
      expiresAt,
      used: false,
    });

    const resetPath =
      this.config.get<string>('FRONTEND_RESET_PASSWORD_PATH') ??
      process.env.FRONTEND_RESET_PASSWORD_PATH ??
      '/reset-password';

    const resetUrl = this.buildFrontendUrl(resetPath, { token });

    const event =
      user.role === UserRole.ADMIN
        ? AuthNotificationEvent.ADMIN_PASSWORD_RESET_REQUESTED
        : AuthNotificationEvent.PASSWORD_RESET_REQUESTED;

    await this.safeNotify({
      event,
      email: user.email,
      variables: {
        firstName: user.firstName ?? 'there',
        email: user.email,
        resetUrl,
      },
    });

    return { ok: true };
  }

  // ==========================
  // Email verification helpers
  // ==========================

  async resetPassword(dto: ResetPasswordDto): Promise<{ changed: boolean }> {
    const reset: any = await this.passwordResetModel
      .findOne({ token: dto.token })
      .lean();

    if (!reset || reset.used || reset.expiresAt.getTime() < Date.now()) {
      throw new HttpException(
        'Invalid or expired reset token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);

    await this.userModel.updateOne(
      { _id: reset.user },
      {
        $set: {
          passwordHash: newHash,
          mustChangePassword: false,
          mustChangePasswordAt: null,
        },
      },
    );

    await this.passwordResetModel.updateOne(
      { _id: reset._id },
      { $set: { used: true } },
    );

    await this.refreshTokenModel.deleteMany({ user: reset.user });

    const userDoc: any = await this.userModel.findById(reset.user).lean();
    if (userDoc) {
      await this.safeNotify({
        event: AuthNotificationEvent.PASSWORD_CHANGED,
        email: userDoc.email,
        variables: {
          firstName: userDoc.firstName ?? 'there',
          email: userDoc.email,
          changedAt: new Date().toISOString(),
        },
      });
    }

    return { changed: true };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    const record: any = await this.emailVerificationModel
      .findOne({ token: dto.token })
      .lean();

    if (!record || record.used || record.expiresAt.getTime() < Date.now()) {
      throw new HttpException(
        'Invalid or expired verification token',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.userModel.updateOne(
      { _id: record.user },
      { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
    );

    await this.emailVerificationModel.updateOne(
      { _id: record._id },
      { $set: { used: true } },
    );

    return { verified: true };
  }

  async resendVerifyEmail(dto: ResendVerifyEmailDto): Promise<{ ok: boolean }> {
    const email = dto.email.toLowerCase().trim();
    const user: any = await this.userModel.findOne({ email }).lean();

    if (!user) return { ok: true };
    if (user.emailVerified === true) return { ok: true };

    const cooldownMs = this.getVerifyEmailCooldownSeconds() * 1000;

    const recent: any = await this.emailVerificationModel
      .findOne({
        user: user._id,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (recent?.createdAt) {
      const ageMs = Date.now() - new Date(recent.createdAt).getTime();
      if (ageMs < cooldownMs) return { ok: true };
    }

    const token = await this.createEmailVerificationToken(String(user._id));
    const verifyUrl = this.buildVerifyUrl(token);

    await this.sendVerifyEmail({
      email: user.email,
      firstName: user.firstName ?? 'there',
      verifyUrl,
      role: user.role,
    });

    return { ok: true };
  }

  private generateAutoPassword(firstName: string): string {
    const clean = String(firstName ?? '')
      .trim()
      .replace(/\s+/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `JTRADE-${clean}-${random}`;
  }

  private getSystemCompanyId(): string {
    const companyId =
      this.config.get<string>('SYSTEM_COMPANY_ID') ??
      process.env.SYSTEM_COMPANY_ID ??
      '';

    if (!companyId.trim()) {
      // Si prefieres no tumbar el servicio, cambia esto por:
      // return '';
      throw new Error('SYSTEM_COMPANY_ID is not configured');
    }

    return companyId.trim();
  }

  private async ensureAdminSeed() {
    const adminEmail =
      this.config.get<string>('ADMIN_EMAIL') ?? process.env.ADMIN_EMAIL ?? null;
    const adminPassword =
      this.config.get<string>('ADMIN_PASSWORD') ??
      process.env.ADMIN_PASSWORD ??
      null;

    if (!adminEmail || !adminPassword) return;

    const exists = await this.userModel
      .exists({ email: adminEmail.toLowerCase().trim(), role: UserRole.ADMIN })
      .lean();

    if (exists) return;

    const firstName =
      this.config.get<string>('ADMIN_FIRST_NAME') ??
      process.env.ADMIN_FIRST_NAME ??
      'Admin';
    const lastName =
      this.config.get<string>('ADMIN_LAST_NAME') ??
      process.env.ADMIN_LAST_NAME ??
      'User';

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const doc = await this.userModel.create({
      firstName,
      lastName,
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),

      // ✅ seed admin NO necesita cambiar password
      mustChangePassword: false,
      mustChangePasswordAt: null,
    });

    const admin = UserMapper.toResponse(doc.toObject() as any);
    // eslint-disable-next-line no-console
    console.log(`👑 Admin seed created: ${admin.email} (id: ${admin.id})`);
  }

  // ==========================
  // Casos de uso AUTH
  // ==========================

  /**
   * Notificación segura:
   * - NO rompe flujo
   * - SIEMPRE envía companyId requerido por 3001
   */
  private async safeNotify(params: {
    event: AuthNotificationEvent | string;
    email?: string;
    phone?: string;
    variables?: Record<string, any>;
    payload?: Record<string, any>;
    companyId?: string;
  }): Promise<void> {
    try {
      if (!params.email && !params.phone) return;

      const companyId = (params.companyId ?? this.getSystemCompanyId()).trim();
      if (!companyId) {
        console.error(
          '[Notifications] SYSTEM_COMPANY_ID missing. Skip notify.',
        );
        return;
      }

      const res = await this.notifications.notifyEvent({
        companyId,
        event: String(params.event),
        email: params.email,
        phone: params.phone,
        variables: params.variables,
        payload: params.payload,
      });

      // ✅ Si llega aquí, ya fue OK porque el client ahora hace throw si falla
      console.log('[Notifications] sent ok:', {
        event: String(params.event),
        companyId,
        resultsCount: res.data?.length ?? 0,
      });
    } catch (e: any) {
      console.error(
        `[Notifications] Failed for event ${String(params.event)}:`,
        e?.message ?? e,
      );
      if (e?.raw) console.error('[Notifications] raw:', e.raw);
    }
  }

  private async generateAccessToken(user: UserResponseDto): Promise<string> {
    const payload: any = {
      sub: user.id,
      email: user.email,
      role: user.role,
      // ✅ útil para frontend
      emailVerified: (user as any).emailVerified,
      mustChangePassword: (user as any).mustChangePassword,
    };
    return this.jwt.signAsync(payload);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const ttlDays = parseInt(
      this.config.get<string>('JWT_REFRESH_DAYS') ?? '7',
      10,
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const token = randomBytes(32).toString('hex');

    await this.refreshTokenModel.create({
      user: new Types.ObjectId(userId),
      token,
      isRevoked: false,
      expiresAt,
    });

    return token;
  }

  private async buildAuthResponse(
    user: UserResponseDto,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    const tokens: AuthTokensDto = { accessToken, refreshToken };
    return AuthMapper.buildAuthResponse(user, tokens);
  }

  private getFrontendBaseUrl(): string {
    const base =
      this.config.get<string>('FRONTEND_BASE_URL') ??
      process.env.FRONTEND_BASE_URL ??
      '/frontend';

    return base.replace(/\/+$/, '');
  }

  private buildFrontendUrl(
    path: string,
    query?: Record<string, string>,
  ): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    const base = `${this.getFrontendBaseUrl()}${p}`;

    if (!query || Object.keys(query).length === 0) return base;

    const usp = new URLSearchParams(query);
    return `${base}?${usp.toString()}`;
  }

  private getVerifyEmailPath(): string {
    return (
      this.config.get<string>('FRONTEND_VERIFY_EMAIL_PATH') ??
      process.env.FRONTEND_VERIFY_EMAIL_PATH ??
      '/verify-email'
    );
  }

  private getVerifyEmailTokenHours(): number {
    const raw =
      this.config.get<string>('VERIFY_EMAIL_TOKEN_HOURS') ??
      process.env.VERIFY_EMAIL_TOKEN_HOURS ??
      '24';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 24;
  }

  private getVerifyEmailCooldownSeconds(): number {
    const raw =
      this.config.get<string>('VERIFY_EMAIL_COOLDOWN_SECONDS') ??
      process.env.VERIFY_EMAIL_COOLDOWN_SECONDS ??
      '120';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 120;
  }

  private buildVerifyUrl(token: string): string {
    return this.buildFrontendUrl(this.getVerifyEmailPath(), { token });
  }

  // ✅ acepta ObjectId o string y normaliza
  private async createEmailVerificationToken(
    userId: Types.ObjectId | string,
  ): Promise<string> {
    const _id =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    const ttlHours = this.getVerifyEmailTokenHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const token = randomBytes(32).toString('hex');

    await this.emailVerificationModel.create({
      user: _id,
      token,
      expiresAt,
      used: false,
    });

    return token;
  }

  private async sendVerifyEmail(params: {
    email: string;
    firstName: string;
    verifyUrl: string;
    role?: string;
  }) {
    await this.safeNotify({
      event: AuthNotificationEvent.EMAIL_VERIFICATION_REQUESTED,
      email: params.email,
      variables: {
        firstName: params.firstName,
        email: params.email,
        verifyUrl: params.verifyUrl,
        role: params.role,
        expiresHours: this.getVerifyEmailTokenHours(),
        loginUrl: this.buildFrontendUrl('/login'),
      },
    });
  }
}
