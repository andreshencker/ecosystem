import {
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
import { UpdateCompanyPortalDto } from './dto/update-company-portal.dto';
import { UpdateCompanySmtpDto } from './dto/update-company-smtp.dto';
import { CompanySmtpResponseDto } from './dto/company-smtp-response.dto';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../infrastructure/security/services/relay-tenant-context.service';

@Injectable()
export class CompanyPortalService {
  private readonly logger = new Logger(CompanyPortalService.name);

  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanySmtp.name)
    private readonly smtpModel: Model<CompanySmtpDocument>,
    private readonly crypto: CryptoService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  // ── Own company ───────────────────────────────────────────────────────────

  async getOwnCompany(ctx: AuthContext): Promise<CompanyDocument> {
    const tenant = await this.tenantContext.resolve(ctx, 'relay.use');
    return tenant.company;
  }

  async updateOwnCompany(
    ctx: AuthContext,
    dto: UpdateCompanyPortalDto,
  ): Promise<CompanyDocument> {
    const { companyId } = await this.tenantContext.resolve(
      ctx,
      'relay.organization.manage',
    );

    const $set: Record<string, any> = {};
    const allFields: (keyof UpdateCompanyPortalDto)[] = [
      'displayName',
      'legalName',
      'tagline',
      'timezone',
      'supportEmail',
      'supportPhone',
      'supportHours',
      'addressLine1',
      'addressLine2',
      'addressCity',
      'addressState',
      'addressPostalCode',
      'addressCountry',
      'webBaseUrl',
      'apiBaseUrl',
      'helpCenterUrl',
      'privacyPolicyUrl',
      'termsUrl',
      'unsubscribeUrl',
      'facebook',
      'instagram',
      'linkedin',
      'x',
      'youtube',
      'tiktok',
      'whatsapp',
      'telegram',
      'copyrightText',
      'disclaimerShort',
      'disclaimerLong',
      'logoIconUrl',
      'logoFullUrl',
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
    const { companyId } = await this.tenantContext.resolve(
      ctx,
      'relay.credentials.manage',
    );
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
    const { companyId } = await this.tenantContext.resolve(
      ctx,
      'relay.credentials.manage',
    );

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

    return CompanySmtpResponseDto.from(doc);
  }

  async testSmtp(ctx: AuthContext): Promise<{ ok: boolean; message: string }> {
    const { companyId } = await this.tenantContext.resolve(
      ctx,
      'relay.credentials.manage',
    );
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
