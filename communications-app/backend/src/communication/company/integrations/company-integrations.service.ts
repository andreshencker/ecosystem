import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';

import {
  CompanyIntegration,
  CompanyIntegrationDocument,
} from './schemas/company-integration.schema';
import { Company, CompanyDocument } from '../company-info/schemas/company.schema';
import { User, UserDocument } from '../../../users/schemas/user.schema';
import { CreateCompanyIntegrationDto } from './dto/create-company-integration.dto';
import { UpdateCompanyIntegrationDto } from './dto/update-company-integration.dto';
import {
  CompanyIntegrationPlatformViewDto,
  CompanyIntegrationResponseDto,
  CompanyIntegrationWithTokenDto,
} from './dto/company-integration-response.dto';
import { CompanyIntegrationMapper } from './mappers/company-integration.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';
import { NotificationService } from '../../notifications/notification.service';

@Injectable()
export class CompanyIntegrationsService {
  private readonly logger = new Logger(CompanyIntegrationsService.name);

  constructor(
    @InjectModel(CompanyIntegration.name)
    private readonly model: Model<CompanyIntegrationDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Integration token notifications ──────────────────────────────────────────
  //
  // All token lifecycle events are sent via the Platform Company (Grapifly)
  // regardless of which tenant owns the integration.
  // companyName is a template variable only — never used as a routing key.

  /**
   * Resolves the notification recipient email for a given tenant company.
   *
   * Priority:
   *   1. company.companyEmail  — explicitly configured company address
   *   2. email of the company_owner  — guaranteed to exist after registration
   *   3. email of any active company_admin  — fallback when no owner found
   *   4. null  → caller must skip the notification and log a warning
   */
  private async resolveCompanyRecipient(
    companyId: Types.ObjectId | string,
  ): Promise<string | null> {
    const companyIdStr = String(companyId);

    const company = await this.companyModel
      .findById(companyId)
      .select('companyEmail')
      .lean() as any;

    // Priority 1: explicit company email
    if (company?.companyEmail?.trim()) {
      return company.companyEmail.trim();
    }

    // Priority 2: active company_owner
    const owner = await this.userModel
      .findOne({ companyId: companyIdStr, role: 'company_owner', isActive: { $ne: false } })
      .select('email')
      .lean() as any;
    if (owner?.email) return owner.email;

    // Priority 3: any active company_admin
    const admin = await this.userModel
      .findOne({ companyId: companyIdStr, role: 'company_admin', isActive: { $ne: false } })
      .select('email')
      .lean() as any;
    if (admin?.email) return admin.email;

    this.logger.warn(
      `resolveCompanyRecipient: no email found for companyId=${companyIdStr}` +
      ` (companyEmail empty, no active owner or admin)`,
    );
    return null;
  }

  /**
   * Fires an integration token lifecycle event through the Platform Company.
   *
   * Uses resolveCompanyRecipient() so the notification reaches someone
   * even when company.companyEmail is not configured.
   */
  private async notifyIntegrationEvent(
    event: string,
    integration: {
      companyId: Types.ObjectId | string;
      displayName: string;
      environment: string;
      [k: string]: unknown;
    },
    extraData: Record<string, string>,
  ): Promise<void> {
    const platformCompanyId = await this.getPlatformCompanyId();
    if (!platformCompanyId) {
      this.logger.warn(`[${event}] platform company not found — notification skipped`);
      return;
    }

    const company = await this.companyModel
      .findById(integration.companyId)
      .select('displayName')
      .lean() as any;

    if (!company) {
      this.logger.warn(`[${event}] tenant company not found (id=${String(integration.companyId)}) — skipped`);
      return;
    }

    const recipient = await this.resolveCompanyRecipient(integration.companyId);
    if (!recipient) {
      this.logger.warn(
        `[${event}] no recipient for companyId=${String(integration.companyId)} — notification skipped for "${integration.displayName}"`,
      );
      return;
    }

    this.logger.log(
      `[${event}] platformCompanyId=${platformCompanyId} tenantCompanyId=${String(integration.companyId)}` +
      ` integration="${integration.displayName}" recipient=${recipient}`,
    );

    await this.notificationService.notifyEvent({
      companyId: platformCompanyId,
      event,
      email: recipient,
      payload: {
        data: {
          companyName:     company.displayName,
          integrationName: integration.displayName,
          environment:     integration.environment,
          ...extraData,
        },
      },
    });
  }

  private async getPlatformCompanyId(): Promise<string | null> {
    const c = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean();
    return c ? String((c as any)._id) : null;
  }

  // ── Token generation ───────────────────────────────────────────────────────

  private generateToken(environment: string): {
    rawToken: string;
    tokenHash: string;
    tokenPrefix: string;
  } {
    const envPrefix =
      environment === 'production' ? 'gpf_live_' : 'gpf_test_';
    const randomPart = randomBytes(24).toString('hex'); // 48 chars
    const rawToken = `${envPrefix}${randomPart}`;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    // Display prefix: full env prefix + first 8 chars of random part
    const tokenPrefix = rawToken.slice(0, envPrefix.length + 8);
    return { rawToken, tokenHash, tokenPrefix };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toObjectIdOrThrow(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private async getOrThrow(id: string): Promise<CompanyIntegrationDocument> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const doc = await this.model.findById(_id).lean();
    if (!doc) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }
    return doc as CompanyIntegrationDocument;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(
    dto: CreateCompanyIntegrationDto,
  ): Promise<CompanyIntegrationWithTokenDto> {
    const companyId = this.toObjectIdOrThrow(dto.companyId, 'companyId');
    const environment = dto.environment ?? 'development';
    const integrationKey = dto.integrationKey.toLowerCase().trim();

    if (!integrationKey) {
      throw new HttpException('integrationKey is required', HttpStatus.BAD_REQUEST);
    }

    const { rawToken, tokenHash, tokenPrefix } = this.generateToken(environment);

    try {
      const doc: any = await this.model.create({
        companyId,
        integrationKey,
        displayName:    dto.displayName.trim(),
        description:    dto.description?.trim() ?? '',
        environment:    environment as any,
        tokenHash,
        tokenPrefix,
        isActive:       true,
        expiresAt:      dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy:      dto.createdBy
          ? this.toObjectIdOrThrow(dto.createdBy, 'createdBy')
          : null,
      });

      const result = CompanyIntegrationMapper.toResponseWithToken(
        typeof doc.toObject === 'function' ? doc.toObject() : doc,
        rawToken,
      );

      // Fire-and-forget — never blocks or rolls back the create operation.
      this.notifyIntegrationEvent('notifications.integration_token_created', doc as any, {
        createdBy: dto.createdBy ?? 'system',
        createdAt: new Date().toISOString(),
      }).catch((err) =>
        this.logger.warn(`integration_token_created notification failed for ${doc.integrationKey}: ${err?.message}`),
      );

      return result;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          `Integration key "${integrationKey}" already exists for this company`,
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create integration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(params: {
    companyId: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyIntegrationResponseDto>> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const filter: any = { companyId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit  = params.limit  ?? 50;
    const offset = params.offset ?? 0;

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .select('-tokenHash')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data:   CompanyIntegrationMapper.toResponseList(list),
      total,
      limit,
      offset,
    };
  }

  async findById(id: string): Promise<CompanyIntegrationResponseDto> {
    const doc = await this.getOrThrow(id);
    return CompanyIntegrationMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateCompanyIntegrationDto,
  ): Promise<CompanyIntegrationResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing = await this.model.findById(_id).lean();
    if (!existing) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }

    const $set: any = {};
    if (dto.displayName !== undefined) $set.displayName = dto.displayName.trim();
    if (dto.description !== undefined) $set.description = dto.description.trim();
    if (dto.isActive    !== undefined) $set.isActive    = dto.isActive;
    if (dto.expiresAt   !== undefined) {
      $set.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    // Re-generate token when environment changes (old token used wrong prefix)
    let rawToken: string | undefined;
    if (dto.environment !== undefined && dto.environment !== (existing as any).environment) {
      const generated = this.generateToken(dto.environment);
      $set.environment  = dto.environment;
      $set.tokenHash    = generated.tokenHash;
      $set.tokenPrefix  = generated.tokenPrefix;
      rawToken = generated.rawToken;
    }

    const updated = await this.model
      .findByIdAndUpdate(_id, { $set }, { new: true })
      .select('-tokenHash')
      .lean();

    if (!updated) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }

    return rawToken
      ? CompanyIntegrationMapper.toResponseWithToken(updated, rawToken)
      : CompanyIntegrationMapper.toResponse(updated);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    // Capture before deletion so the notification has the integration details.
    const snapshot = await this.model.findById(_id).lean();

    const res = await this.model.findByIdAndDelete(_id);
    if (!res) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }

    if (snapshot) {
      this.notifyIntegrationEvent('notifications.integration_token_revoked', snapshot as any, {
        revokedBy: 'system',
        revokedAt: new Date().toISOString(),
        reason:    'Integration permanently deleted',
      }).catch((err) =>
        this.logger.warn(`integration_token_revoked notification failed for ${(snapshot as any).integrationKey}: ${err?.message}`),
      );
    }

    return { deleted: true };
  }

  // ── Token rotation ─────────────────────────────────────────────────────────

  async rotateToken(id: string): Promise<CompanyIntegrationWithTokenDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing = await this.model.findById(_id).lean();
    if (!existing) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }

    const { rawToken, tokenHash, tokenPrefix } = this.generateToken(
      (existing as any).environment ?? 'development',
    );

    const updated = await this.model
      .findByIdAndUpdate(
        _id,
        { $set: { tokenHash, tokenPrefix } },
        { new: true },
      )
      .select('-tokenHash')
      .lean();

    this.notifyIntegrationEvent('notifications.integration_token_rotated', updated as any, {
      rotatedBy: 'system',
      rotatedAt: new Date().toISOString(),
    }).catch((err) =>
      this.logger.warn(`integration_token_rotated notification failed for ${(updated as any)?.integrationKey}: ${err?.message}`),
    );

    return CompanyIntegrationMapper.toResponseWithToken(updated, rawToken);
  }

  // ── Activation ─────────────────────────────────────────────────────────────

  async deactivate(id: string): Promise<CompanyIntegrationResponseDto> {
    const result = await this.setActive(id, false);

    // Fire-and-forget — deactivation counts as a revocation of access.
    this.notifyIntegrationEvent('notifications.integration_token_revoked', result as any, {
      revokedBy: 'system',
      revokedAt: new Date().toISOString(),
      reason:    'Integration deactivated',
    }).catch((err) =>
      this.logger.warn(`integration_token_revoked notification failed for ${result.integrationKey}: ${err?.message}`),
    );

    return result;
  }

  async activate(id: string): Promise<CompanyIntegrationResponseDto> {
    return this.setActive(id, true);
  }

  private async setActive(
    id: string,
    isActive: boolean,
  ): Promise<CompanyIntegrationResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');
    const updated = await this.model
      .findByIdAndUpdate(_id, { $set: { isActive } }, { new: true })
      .select('-tokenHash')
      .lean();

    if (!updated) {
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
    }
    return CompanyIntegrationMapper.toResponse(updated);
  }

  // ── Platform Admin listing ────────────────────────────────────────────────

  async findAllForPlatform(params: {
    search?: string;
    companyId?: string;
    environment?: string;
    active?: boolean;
    expired?: boolean;
    neverUsed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CompanyIntegrationPlatformViewDto>> {
    const filter: any = {};

    if (params.companyId?.trim()) {
      filter.companyId = this.toObjectIdOrThrow(params.companyId.trim(), 'companyId');
    }

    if (typeof params.active === 'boolean') filter.isActive = params.active;

    if (params.environment) filter.environment = params.environment;

    if (params.expired) filter.expiresAt = { $lt: new Date() };

    if (params.neverUsed) filter.lastUsedAt = null;

    if (params.search?.trim()) {
      const re = new RegExp(params.search.trim(), 'i');
      filter['$or'] = [
        { displayName: re },
        { integrationKey: re },
        { description: re },
      ];
    }

    const limit  = params.limit  ?? 50;
    const offset = params.offset ?? 0;

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .select('-tokenHash')
        .populate('companyId', 'displayName companyKey')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data:   CompanyIntegrationMapper.toPlatformResponseList(list),
      total,
      limit,
      offset,
    };
  }

  // ── Token resolver ─────────────────────────────────────────────────────────

  /**
   * Returns the modules company (isPlatformCompany: true).
   * Used by GlobalAuthGuard when authenticating with the admin API key:
   * the modules company is the implicit actor for all admin-key requests.
   * Returns null if no modules company exists (startup misconfiguration).
   */
  async resolvePlatformCompany(): Promise<{
    companyId: string;
    companyKey: string;
    companyName: string;
    isPlatformCompany: true;
  } | null> {
    const company = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id companyKey displayName')
      .lean() as any;

    if (!company) return null;

    return {
      companyId:         String(company._id),
      companyKey:        company.companyKey   ?? '',
      companyName:       company.displayName  ?? '',
      isPlatformCompany: true,
    };
  }

  /**
   * Resolves the company that owns a given integration token.
   * Used by external apps (Business App) to verify their stored token and
   * discover which Communications company it belongs to.
   */
  async resolveCompanyByToken(rawToken: string): Promise<{
    companyId: string;
    companyKey: string;
    companyName: string;
  }> {
    const { companyId } = await this.resolveByToken(rawToken);

    const company = await this.companyModel
      .findById(companyId)
      .select('companyKey displayName')
      .lean() as any;

    if (!company) {
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    }

    return {
      companyId,
      companyKey:  company.companyKey,
      companyName: company.displayName,
    };
  }

  async resolveByToken(rawToken: string): Promise<{
    integrationId: string;
    companyId: string;
    integrationKey: string;
    environment: string;
  }> {
    const tokenHash = this.hashToken(rawToken);

    const doc = await this.model
      .findOne({ tokenHash })
      .select('companyId integrationKey environment isActive expiresAt')
      .lean();

    if (!doc) {
      throw new HttpException('Invalid integration token', HttpStatus.UNAUTHORIZED);
    }

    const d = doc as any;

    if (!d.isActive) {
      throw new HttpException('Integration is inactive', HttpStatus.UNAUTHORIZED);
    }

    if (d.expiresAt && new Date(d.expiresAt) < new Date()) {
      // Fire-and-forget — notify the company that this token has expired.
      // May fire more than once if the caller retries; acceptable for now.
      this.notifyIntegrationEvent('notifications.integration_token_expired', d, {
        expiredAt: new Date(d.expiresAt).toISOString(),
      }).catch((err) =>
        this.logger.warn(`integration_token_expired notification failed for ${d.integrationKey}: ${err?.message}`),
      );
      throw new HttpException('Integration token has expired', HttpStatus.UNAUTHORIZED);
    }

    // Update lastUsedAt without waiting for it to complete (fire-and-forget)
    void this.model.findByIdAndUpdate(d._id, {
      $set: { lastUsedAt: new Date() },
    });

    return {
      integrationId:  String(d._id),
      companyId:      String(d.companyId),
      integrationKey: String(d.integrationKey),
      environment:    String(d.environment),
    };
  }
}
