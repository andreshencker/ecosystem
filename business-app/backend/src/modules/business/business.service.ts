import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';

import { Business, BusinessDocument } from './schemas/business.schema';
import {
  BusinessSmtp,
  BusinessSmtpDocument,
} from './schemas/business-smtp.schema';
import { CryptoService } from '../../infrastructure/common/security/crypto.service';
import { UsersService } from '../users/users.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessSmtpDto } from './dto/update-business-smtp.dto';
import { BusinessSmtpResponseDto } from './dto/business-smtp-response.dto';
import { BusinessResponseDto } from './dto/business-response.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(BusinessSmtp.name)
    private readonly smtpModel: Model<BusinessSmtpDocument>,
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
  ) {}

  // ── Company ID resolution ─────────────────────────────────────────────────
  //
  // GlobalAuthGuard performs a DB lookup on every request and populates
  // ctx.companyId and ctx.scope before any controller runs.  We use those
  // values directly to avoid a redundant round-trip on every /company call.
  //
  // Fallback sequence (handles edge cases like stale auth context):
  //   1. ctx.companyId is present → use it directly (normal path).
  //   2. ctx.userId is set → load user fresh from DB.
  //      a. user.companyId is set → use it.
  //      b. user.scope === 'global' → find the platform company.
  //      c. Neither → ForbiddenException.
  //   3. No userId → ForbiddenException.

  private async resolveCompanyId(ctx: AuthContext): Promise<string> {
    // Fast path: GlobalAuthGuard already resolved companyId from the DB.
    if (ctx.companyId) {
      return ctx.companyId;
    }

    if (!ctx.userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Slow path: ctx.companyId was null — load the user document fresh.
    const user = await this.users.findById(ctx.userId);
    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    const companyId = user.companyId ? String(user.companyId) : null;
    if (companyId) {
      return companyId;
    }

    // platform_admin (scope='global') may have a null companyId during the
    // bootstrap window before the platform company is created.
    if (user.scope === 'global') {
      const platformBusiness = (await this.businessModel
        .findOne({ isPlatformCompany: true })
        .lean()
        .exec()) as any;
      if (platformBusiness?._id) {
        return String(platformBusiness._id);
      }
      throw new NotFoundException(
        'Platform company not found. Run the bootstrap script to create it.',
      );
    }

    throw new ForbiddenException('No company assigned to this user account');
  }

  // Convenience: load user and check they are allowed to edit.
  private async assertCanEdit(ctx: AuthContext): Promise<string> {
    if (!ctx.userId) throw new ForbiddenException('Authentication required');
    const user = await this.users.findById(ctx.userId);
    if (!user) throw new ForbiddenException('Authenticated user not found');
    if (user.role !== 'platform_admin' && user.role !== 'business_owner') {
      throw new ForbiddenException(
        'Only platform_admin and business_owner may update company settings',
      );
    }
    return this.resolveCompanyId(ctx);
  }

  // ── Own company ───────────────────────────────────────────────────────────

  async getOwnCompany(ctx: AuthContext): Promise<BusinessResponseDto> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = await this.businessModel.findById(companyId).lean().exec();
    if (!doc) throw new NotFoundException('Company not found');
    return BusinessResponseDto.from(doc as any);
  }

  async updateOwnCompany(
    ctx: AuthContext,
    dto: UpdateBusinessDto,
  ): Promise<BusinessResponseDto> {
    const companyId = await this.assertCanEdit(ctx);

    const $set: Record<string, any> = {};
    const scalarFields: (keyof UpdateBusinessDto)[] = [
      'businessName',
      'abn',
      'defaultCurrency',
    ];
    for (const field of scalarFields) {
      if (dto[field] !== undefined) $set[field] = dto[field];
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
      if (!current) throw new NotFoundException('Company not found');
      return BusinessResponseDto.from(current as any);
    }

    const updated = await this.businessModel
      .findByIdAndUpdate(companyId, { $set }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Company not found');
    return BusinessResponseDto.from(updated as any);
  }

  // ── Fiscal profile ────────────────────────────────────────────────────────

  async getFiscalProfile(ctx: AuthContext): Promise<{
    companyId: string;
    abn: string | null;
    depositAccount: { bsb: string | null; accountNumber: string | null };
    defaultCurrency: string;
  }> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = (await this.businessModel
      .findById(companyId)
      .lean()
      .exec()) as any;
    if (!doc) throw new NotFoundException('Company not found');
    return {
      companyId: String(doc._id),
      abn: doc.abn ?? null,
      depositAccount: doc.depositAccount ?? { bsb: null, accountNumber: null },
      defaultCurrency: doc.defaultCurrency ?? 'AUD',
    };
  }

  async updateFiscalProfile(
    ctx: AuthContext,
    dto: {
      abn?: string;
      depositAccount?: { bsb?: string; accountNumber?: string };
      defaultCurrency?: string;
    },
  ): Promise<{
    companyId: string;
    abn: string | null;
    depositAccount: { bsb: string | null; accountNumber: string | null };
    defaultCurrency: string;
  }> {
    const companyId = await this.assertCanEdit(ctx);

    const $set: Record<string, any> = {};
    if (dto.abn !== undefined) $set.abn = dto.abn;
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
      .exec()) as any;

    if (!updated) throw new NotFoundException('Company not found');
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

  // ── SMTP settings ─────────────────────────────────────────────────────────

  async getSmtp(ctx: AuthContext): Promise<BusinessSmtpResponseDto> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = await this.smtpModel.findOne({ companyId }).lean().exec();
    if (!doc) {
      return BusinessSmtpResponseDto.from({
        companyId,
        fromEmail: '',
        fromName: '',
        credentials: null,
        isActive: false,
        verifiedAt: null,
      });
    }
    return BusinessSmtpResponseDto.from(doc);
  }

  async updateSmtp(
    ctx: AuthContext,
    dto: UpdateBusinessSmtpDto,
  ): Promise<BusinessSmtpResponseDto> {
    const companyId = await this.assertCanEdit(ctx);

    const $set: Record<string, any> = {};
    if (dto.fromEmail !== undefined) $set.fromEmail = dto.fromEmail;
    if (dto.fromName !== undefined) $set.fromName = dto.fromName;

    const hasCredentialFields =
      dto.host ||
      dto.user ||
      dto.pass ||
      dto.port !== undefined ||
      dto.secure !== undefined;
    if (hasCredentialFields) {
      const existing = (await this.smtpModel
        .findOne({ companyId })
        .lean()
        .exec()) as any;
      let existingDecrypted: any = {};
      if (existing?.credentials) {
        try {
          existingDecrypted = this.crypto.decryptJson(existing.credentials);
        } catch {
          /* ignore */
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

    return BusinessSmtpResponseDto.from(doc);
  }

  async testSmtp(ctx: AuthContext): Promise<{ ok: boolean; message: string }> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = (await this.smtpModel
      .findOne({ companyId })
      .lean()
      .exec()) as any;

    if (!doc?.credentials) {
      return { ok: false, message: 'No SMTP credentials configured' };
    }

    let smtp: any;
    try {
      smtp = this.crypto.decryptJson(doc.credentials);
    } catch {
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
      await this.smtpModel.findOneAndUpdate(
        { companyId },
        { $set: { verifiedAt: new Date() } },
      );
      return { ok: true, message: 'SMTP connection verified successfully' };
    } catch (err: any) {
      return { ok: false, message: err?.message ?? 'SMTP verification failed' };
    }
  }
}
