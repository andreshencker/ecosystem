import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';

import {
  Company,
  CompanyDocument,
} from '../communication/company/company-info/schemas/company.schema';
import {
  CompanySmtp,
  CompanySmtpDocument,
} from './schemas/company-smtp.schema';
import { CryptoService } from '../communication/common/security/crypto.service';
import { UsersService } from '../users/users.service';
import { UpdateCompanyPortalDto } from './dto/update-company-portal.dto';
import { UpdateCompanySmtpDto } from './dto/update-company-smtp.dto';
import { CompanySmtpResponseDto } from './dto/company-smtp-response.dto';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';

@Injectable()
export class CompanyPortalService {
  private readonly logger = new Logger(CompanyPortalService.name);

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanySmtp.name) private readonly smtpModel: Model<CompanySmtpDocument>,
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
  ) {}

  // ── Company ID resolution ─────────────────────────────────────────────────
  //
  // The JWT only carries { sub, type }.  The auth guard sets authContext.userId
  // but NOT companyId / role / scope.  We resolve the company from the DB:
  //
  //   1. Load the user document by userId to get their real companyId.
  //   2. For platform_admin (scope='global') with a null companyId (edge case
  //      in bootstrapped environments), fall back to the modules company
  //      identified by { isPlatformCompany: true }.
  //   3. For all other roles, require a non-null companyId.

  private async resolveCompanyId(ctx: AuthContext): Promise<string> {
    if (!ctx.userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Load the full user document to get the actual companyId and scope.
    const user = await this.users.findById(ctx.userId);
    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    const companyId = user.companyId ? String(user.companyId) : null;

    if (companyId) {
      return companyId;
    }

    // platform_admin may have a null companyId in early bootstrap environments.
    // Fall back to the designated modules company document.
    if (user.scope === 'global') {
      const platformCompany = await this.companyModel
        .findOne({ isPlatformCompany: true })
        .lean()
        .exec() as any;
      if (platformCompany?._id) {
        return String(platformCompany._id);
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
    if (user.role !== 'platform_admin' && user.role !== 'company_owner') {
      throw new ForbiddenException(
        'Only platform_admin and company_owner may update company settings',
      );
    }
    return this.resolveCompanyId(ctx);
  }

  // ── Own company ───────────────────────────────────────────────────────────

  async getOwnCompany(ctx: AuthContext): Promise<CompanyDocument> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = await this.companyModel.findById(companyId).lean().exec();
    if (!doc) throw new NotFoundException('Company not found');
    return doc as any;
  }

  async updateOwnCompany(
    ctx: AuthContext,
    dto: UpdateCompanyPortalDto,
  ): Promise<CompanyDocument> {
    const companyId = await this.assertCanEdit(ctx);

    const $set: Record<string, any> = {};
    const allFields: (keyof UpdateCompanyPortalDto)[] = [
      'displayName', 'legalName', 'tagline', 'timezone',
      'supportEmail', 'supportPhone', 'supportHours',
      'addressLine1', 'addressLine2', 'addressCity', 'addressState',
      'addressPostalCode', 'addressCountry',
      'webBaseUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl',
      'termsUrl', 'unsubscribeUrl',
      'facebook', 'instagram', 'linkedin', 'x', 'youtube',
      'tiktok', 'whatsapp', 'telegram',
      'copyrightText', 'disclaimerShort', 'disclaimerLong',
      'logoIconUrl', 'logoFullUrl',
    ];
    for (const field of allFields) {
      if (dto[field] !== undefined) $set[field] = dto[field];
    }

    if (Object.keys($set).length === 0) {
      const current = await this.companyModel.findById(companyId).lean().exec();
      if (!current) throw new NotFoundException('Company not found');
      return current as any;
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(companyId, { $set }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Company not found');
    return updated as any;
  }

  // ── SMTP settings ─────────────────────────────────────────────────────────

  async getSmtp(ctx: AuthContext): Promise<CompanySmtpResponseDto> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = await this.smtpModel.findOne({ companyId }).lean().exec();
    if (!doc) {
      return CompanySmtpResponseDto.from({
        companyId,
        fromEmail: '',
        fromName: '',
        credentials: null,
        isActive: false,
        verifiedAt: null,
      });
    }
    return CompanySmtpResponseDto.from(doc);
  }

  async updateSmtp(
    ctx: AuthContext,
    dto: UpdateCompanySmtpDto,
  ): Promise<CompanySmtpResponseDto> {
    const companyId = await this.assertCanEdit(ctx);

    const $set: Record<string, any> = {};
    if (dto.fromEmail !== undefined) $set.fromEmail = dto.fromEmail;
    if (dto.fromName !== undefined) $set.fromName = dto.fromName;

    const hasCredentialFields =
      dto.host || dto.user || dto.pass || dto.port !== undefined || dto.secure !== undefined;
    if (hasCredentialFields) {
      const existing = await this.smtpModel.findOne({ companyId }).lean().exec() as any;
      let existingDecrypted: any = {};
      if (existing?.credentials) {
        try { existingDecrypted = this.crypto.decryptJson(existing.credentials); } catch { /* ignore */ }
      }
      const merged = {
        host:   dto.host   ?? existingDecrypted.host   ?? '',
        port:   dto.port   ?? existingDecrypted.port   ?? 587,
        secure: dto.secure ?? existingDecrypted.secure ?? false,
        user:   dto.user   ?? existingDecrypted.user   ?? '',
        pass:   dto.pass   ?? existingDecrypted.pass   ?? '',
      };
      $set.credentials = this.crypto.encryptJson(merged);
      $set.verifiedAt = null;
    }

    const doc = await this.smtpModel
      .findOneAndUpdate({ companyId }, { $set }, { new: true, upsert: true })
      .lean()
      .exec();

    return CompanySmtpResponseDto.from(doc);
  }

  async testSmtp(ctx: AuthContext): Promise<{ ok: boolean; message: string }> {
    const companyId = await this.resolveCompanyId(ctx);
    const doc = await this.smtpModel.findOne({ companyId }).lean().exec() as any;

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
        host: smtp.host, port: smtp.port, secure: smtp.secure,
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
