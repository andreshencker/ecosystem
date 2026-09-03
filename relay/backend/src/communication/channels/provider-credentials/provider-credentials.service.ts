// src/channels/provider-credentials/provider-credentials.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from './schemas/provider-credentials.schema';

import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto';

import { ProviderCredentialsResponseDto } from './dto/provider-credentials-response.dto';
import { ProviderCredentialsMapper } from './mappers/provider-credentials.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../company-channel-providers/schemas/company-channel-provider.schema';

import {
  Company,
  CompanyDocument,
} from '../../company/company-info/schemas/company.schema';
import {
  User,
  UserDocument,
} from '../../../ecosystem/identity/schemas/ecosystem-user.schema';

import { CryptoService } from '../../common/security/crypto.service';
import { ChannelsImplementationFactory } from '../implementation/channels-implementation.factory';
import { NotificationService } from '../../notifications/notification.service';

// Credential contracts — used to normalize+validate before encryption and
// to surface field-level errors as structured 422 responses.
import { SmtpCredentialsContract } from '../implementation/email/smtp/smtp-credentials.contract';
import { OAuthEmailCredentialsContract } from '../implementation/email/oauth/oauth-credentials.contract';
import { IdentityCredentialsContract } from '../implementation/identity/oauth/identity-credentials.contract';
import { SendGridCredentialsContract } from '../implementation/email/api_key/sendgrid-credentials.contract';
import { MailgunCredentialsContract } from '../implementation/email/api_key/mailgun-credentials.contract';
import { TwilioCredentialsContract } from '../implementation/sms/api_key/twilio-credentials.contract';
import { S3AccessKeysCredentialsContract } from '../implementation/storage/access_keys/s3-credentials.contract';
import { CredentialsValidationError } from '../implementation/shared/credentials.errors';
import type { ContractSpec } from '../implementation/shared/credentials.types';

import { CalendarImplementationFactory } from '../../../calendar/factory/calendar-implementation.factory';
import { ICloudCredentialsContract } from '../../../calendar/contracts/icloud-credentials.contract';
import { GoogleCalendarCredentialsContract } from '../../../calendar/contracts/google-credentials.contract';
import { OutlookCalendarCredentialsContract } from '../../../calendar/contracts/outlook-credentials.contract';
import { StripeCredentialsContract } from '../../../payments/providers/stripe/stripe.credentials.contract';
import { CoinGateCredentialsContract } from '../../../payments/providers/coingate/coingate.credentials.contract';
import { TokenCredentialsContract } from '../implementation/payment/token/token-credentials.contract';
import { XeroCredentialsContract } from '../../../accounting/providers/xero/xero.credentials.contract';

type PopulateOpts = {
  populateCompanyChannelProvider?: boolean;
};

@Injectable()
export class ProviderCredentialsService {
  private readonly logger = new Logger(ProviderCredentialsService.name);

  constructor(
    @InjectModel(ProviderCredentials.name)
    private readonly model: Model<ProviderCredentialsDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly encryption: CryptoService,
    private readonly factory: ChannelsImplementationFactory,
    private readonly calendarFactory: CalendarImplementationFactory,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Provider credential notifications ────────────────────────────────────────
  //
  // All credential lifecycle events are sent via the Platform Company (Grapifly).
  // companyName is a template variable only — never used as a routing key.

  private async getPlatformCompanyId(): Promise<string | null> {
    const c = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean();
    return c ? String((c as any)._id) : null;
  }

  /**
   * Resolves the notification recipient email for a given tenant company.
   * Priority: companyEmail → company_owner → company_admin → null
   */
  private async resolveCompanyRecipient(
    companyId: Types.ObjectId | string,
  ): Promise<string | null> {
    const companyIdStr = String(companyId);

    const company = (await this.companyModel
      .findById(companyId)
      .select('companyEmail')
      .lean()) as any;

    if (company?.companyEmail?.trim()) {
      return company.companyEmail.trim();
    }

    const owner = (await this.userModel
      .findOne({
        companyId: companyIdStr,
        role: 'company_owner',
        isActive: { $ne: false },
      })
      .select('email')
      .lean()) as any;
    if (owner?.email) return owner.email;

    const admin = (await this.userModel
      .findOne({
        companyId: companyIdStr,
        role: 'company_admin',
        isActive: { $ne: false },
      })
      .select('email')
      .lean()) as any;
    if (admin?.email) return admin.email;

    this.logger.warn(
      `resolveCompanyRecipient: no email found for companyId=${companyIdStr}` +
        ` (companyEmail empty, no active owner or admin)`,
    );
    return null;
  }

  /**
   * Resolves provider/channel context from a CompanyChannelProvider ID.
   * Returns null on any failure so the caller can skip the notification safely.
   */
  private async resolveCredentialNotifyContext(ccpId: string): Promise<{
    companyId: string;
    providerName: string;
    channelKey: string;
    connectionType: string;
  } | null> {
    try {
      const ccp = (await this.ccpModel
        .findById(new Types.ObjectId(ccpId))
        .populate('providerId', 'displayName providerKey connectionType')
        .populate('channelId', 'channelKey displayName')
        .lean()) as any;

      if (!ccp) return null;

      return {
        companyId: String(ccp.companyId),
        providerName:
          ccp.providerId?.displayName ||
          ccp.providerId?.providerKey ||
          'Unknown',
        channelKey: String(ccp.channelId?.channelKey || 'unknown'),
        connectionType: String(ccp.providerId?.connectionType || 'unknown'),
      };
    } catch {
      return null;
    }
  }

  /**
   * Fires a provider credential lifecycle event through the Platform Company.
   * Fire-and-forget — callers must `.catch()` to suppress unhandled rejections.
   */
  private async notifyCredentialEvent(
    event: string,
    ctx: {
      companyId: string;
      providerName: string;
      channelKey: string;
      connectionType: string;
    },
    credentialTag: string,
    extraData: Record<string, string>,
  ): Promise<void> {
    const platformCompanyId = await this.getPlatformCompanyId();
    if (!platformCompanyId) {
      this.logger.warn(
        `[${event}] platform company not found — notification skipped`,
      );
      return;
    }

    const company = (await this.companyModel
      .findById(ctx.companyId)
      .select('displayName')
      .lean()) as any;

    if (!company) {
      this.logger.warn(
        `[${event}] tenant company not found (id=${ctx.companyId}) — skipped`,
      );
      return;
    }

    const recipient = await this.resolveCompanyRecipient(ctx.companyId);
    if (!recipient) {
      this.logger.warn(
        `[${event}] no recipient for companyId=${ctx.companyId} — notification skipped for "${credentialTag}"`,
      );
      return;
    }

    this.logger.log(
      `[${event}] platformCompanyId=${platformCompanyId} tenantCompanyId=${ctx.companyId}` +
        ` credential="${credentialTag}" recipient=${recipient}`,
    );

    await this.notificationService.notifyEvent({
      companyId: platformCompanyId,
      event,
      email: recipient,
      payload: {
        data: {
          companyName: company.displayName,
          credentialTag,
          providerName: ctx.providerName,
          channel: ctx.channelKey,
          connectionType: ctx.connectionType,
          ...extraData,
        },
      },
    });
  }

  // =========================================================
  // Helpers
  // =========================================================

  async create(
    dto: CreateProviderCredentialsDto,
  ): Promise<ProviderCredentialsResponseDto> {
    const tag = this.normalizeTag(dto.tag);
    if (!tag) {
      throw new HttpException('tag is required', HttpStatus.BAD_REQUEST);
    }

    // 1) cargar provider/channel desde CompanyChannelProvider
    const {
      doc: ccpDoc,
      provider,
      channel,
    } = await this.getCompanyChannelProviderOrFail(
      dto.companyChannelProviderId,
    );

    const rawCredentials = dto.credentials ?? {};
    const providerKey = this.resolveProviderKey({
      provider,
      credentials: rawCredentials,
    });

    // 2) ✅ normalize + validate via contract (field-level 422 on failure)
    const credentials = await this.normalizeAndValidateCredentials({
      channelKey: channel.channelKey,
      connectionType: provider.connectionType,
      providerKey,
      credentials: rawCredentials,
    });

    // 3) ✅ verify connection (SMTP handshake, S3 bucket access, etc.)
    await this.verifyByImplementation({
      channelKey: channel.channelKey,
      connectionType: provider.connectionType,
      providerKey,
      credentials,
    });

    // 4) ✅ encriptar
    const encrypted = this.encryption.encryptJson(credentials);

    // 5) Derive non-secret display identifier (stored in plain text for UI)
    const displayIdentifier = this.deriveDisplayIdentifier(
      credentials,
      provider.connectionType,
      providerKey,
    );

    // 6) Extract canonical mode from the normalized credentials.
    //    Stored in plain text — mode is not a secret.
    //    Provider-agnostic: any credential contract that normalises to
    //    { mode: 'test' | 'live' } will populate this field.
    const mode = this.extractMode(credentials);
    const oauthAppSource =
      dto.oauthAppSource ?? this.extractOAuthAppSource(credentials);

    try {
      const created = await this.model.create({
        companyChannelProviderId: this.toObjectIdOrThrow(
          dto.companyChannelProviderId,
          'companyChannelProviderId',
        ),
        grapiflyOrganizationId: (ccpDoc as any).grapiflyOrganizationId ?? null,
        tag,
        encrypted,
        isActive: dto.isActive ?? true,
        displayIdentifier: displayIdentifier || undefined,
        mode,
        oauthAppSource,
      });

      const result = ProviderCredentialsMapper.toResponse(
        created.toObject() as any,
      );

      // Fire-and-forget — never blocks or rolls back the create operation.
      this.notifyCredentialEvent(
        'notifications.provider_credential_created',
        {
          companyId: String((ccpDoc as any).companyId),
          providerName:
            provider.displayName || provider.providerKey || 'Unknown',
          channelKey: String(channel.channelKey),
          connectionType: String(provider.connectionType),
        },
        tag,
        { createdBy: 'system', createdAt: new Date().toISOString() },
      ).catch((err) =>
        this.logger.warn(
          `provider_credential_created notification failed for ${tag}: ${err?.message}`,
        ),
      );

      return result;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          this.duplicateKeyToMessage(err),
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Returns all credentials that belong to a company, resolved by joining
   * through CompanyChannelProvider. Encrypted payload is never included.
   * Always populates provider + channel info.
   */
  async findAllByCompany(params: {
    companyId: string;
    active?: boolean;
    /** Optional: restrict results to CCPs that belong to this channel ObjectId string. */
    channelId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ProviderCredentialsResponseDto>> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const company = (await this.companyModel
      .findById(companyId)
      .select({ grapiflyOrganizationId: 1 })
      .lean()) as any;
    if (!company) {
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    }

    const grapiflyOrganizationId = company.grapiflyOrganizationId ?? null;
    const ccpFilter: Record<string, any> = {
      ...(grapiflyOrganizationId
        ? {
            $or: [
              { grapiflyOrganizationId },
              {
                companyId,
                $or: [
                  { grapiflyOrganizationId: null },
                  { grapiflyOrganizationId: { $exists: false } },
                ],
              },
            ],
          }
        : { companyId }),
      isActive: true,
    };
    if (params.channelId) {
      ccpFilter.channelId = new Types.ObjectId(params.channelId);
    }

    const ccpIds = await this.ccpModel
      .find(ccpFilter)
      .select('_id')
      .lean()
      .then((docs) => docs.map((d) => (d as any)._id));

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    if (ccpIds.length === 0) {
      return { data: [], total: 0, limit, offset };
    }

    const filter: any = { companyChannelProviderId: { $in: ccpIds } };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const q = this.model.find(filter).select('-encrypted').sort({ tag: 1 });

    this.populateForValidation(q, { populateCompanyChannelProvider: true });

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: ProviderCredentialsMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async assertCompanyChannelProviderBelongsToCompany(
    companyChannelProviderId: string,
    companyIdValue: string,
  ): Promise<void> {
    const companyId = this.toObjectIdOrThrow(companyIdValue, 'companyId');
    const company = (await this.companyModel
      .findById(companyId)
      .select({ grapiflyOrganizationId: 1 })
      .lean()) as any;
    if (!company) {
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    }

    const grapiflyOrganizationId = company.grapiflyOrganizationId ?? null;
    const tenantFilter = grapiflyOrganizationId
      ? {
          $or: [
            { grapiflyOrganizationId },
            {
              companyId,
              $or: [
                { grapiflyOrganizationId: null },
                { grapiflyOrganizationId: { $exists: false } },
              ],
            },
          ],
        }
      : { companyId };
    const provider = await this.ccpModel
      .findOne({
        _id: this.toObjectIdOrThrow(
          companyChannelProviderId,
          'companyChannelProviderId',
        ),
        ...tenantFilter,
      })
      .select('_id')
      .lean();
    if (!provider) {
      throw new HttpException(
        'CompanyChannelProvider not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async assertCredentialBelongsToCompany(
    credentialId: string,
    companyId: string,
  ): Promise<void> {
    const credential = (await this.model
      .findById(this.toObjectIdOrThrow(credentialId, 'id'))
      .select('companyChannelProviderId')
      .lean()) as any;
    if (!credential) {
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
    }
    await this.assertCompanyChannelProviderBelongsToCompany(
      String(credential.companyChannelProviderId),
      companyId,
    );
  }

  async findAll(params: {
    companyChannelProviderId: string;
    active?: boolean;
    populate?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ProviderCredentialsResponseDto>> {
    const companyChannelProviderId = this.toObjectIdOrThrow(
      params.companyChannelProviderId,
      'companyChannelProviderId',
    );

    const filter: any = { companyChannelProviderId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const q = this.model.find(filter).sort({ tag: 1 });
    q.select('-encrypted');

    if (params.populate) {
      this.populateForValidation(q, { populateCompanyChannelProvider: true });
    }

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: ProviderCredentialsMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async getById(
    id: string,
    populate = false,
  ): Promise<ProviderCredentialsResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const q = this.model.findById(_id);

    q.select('-encrypted');

    if (populate) {
      this.populateForValidation(q, { populateCompanyChannelProvider: true });
    }

    const doc = await q.lean();
    if (!doc)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    return ProviderCredentialsMapper.toResponse(doc as any);
  }

  /**
   * ✅ Método clave para Domain: providerCredentialsId -> (ccp -> provider + channel)
   */
  async getPopulatedForDomain(providerCredentialsId: string) {
    const _id = this.toObjectIdOrThrow(
      providerCredentialsId,
      'providerCredentialsId',
    );

    const q = this.model.findById(_id).select('-encrypted');
    this.populateForValidation(q, { populateCompanyChannelProvider: true });

    const doc: any = await q.lean();

    if (!doc)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
    if (doc.isActive === false)
      throw new HttpException('Credentials inactive', HttpStatus.BAD_REQUEST);

    const ccp = doc.companyChannelProviderId;
    if (!ccp)
      throw new HttpException(
        'CompanyChannelProvider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const provider = ccp.providerId;
    const channel = ccp.channelId;

    if (!provider)
      throw new HttpException(
        'Provider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    if (!channel)
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return { credentials: doc, companyChannelProvider: ccp, provider, channel };
  }

  async update(
    id: string,
    dto: UpdateProviderCredentialsDto,
  ): Promise<ProviderCredentialsResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing: any = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    const $set: any = {};

    if (dto.tag !== undefined) {
      const tag = this.normalizeTag(dto.tag);
      if (!tag)
        throw new HttpException('tag is required', HttpStatus.BAD_REQUEST);
      $set.tag = tag;
    }

    if (dto.isActive !== undefined) $set.isActive = dto.isActive;

    if (dto.credentials !== undefined) {
      // 1) cargar provider/channel
      const ccpId = String(existing.companyChannelProviderId);
      const { provider, channel } =
        await this.getCompanyChannelProviderOrFail(ccpId);

      const rawCredentials = dto.credentials ?? {};
      const providerKey = this.resolveProviderKey({
        provider,
        credentials: rawCredentials,
      });

      // 2) ✅ normalize + validate via contract (field-level 422)
      const credentials = await this.normalizeAndValidateCredentials({
        channelKey: channel.channelKey,
        connectionType: provider.connectionType,
        providerKey,
        credentials: rawCredentials,
      });

      // 3) ✅ verify connection
      await this.verifyByImplementation({
        channelKey: channel.channelKey,
        connectionType: provider.connectionType,
        providerKey,
        credentials,
      });

      // 4) ✅ encriptar
      $set.encrypted = this.encryption.encryptJson(credentials);

      // 5) Re-derive display identifier from the updated credentials
      const displayIdentifier = this.deriveDisplayIdentifier(
        credentials,
        provider.connectionType,
        providerKey,
      );
      $set.displayIdentifier = displayIdentifier || undefined;

      // 6) Re-extract canonical mode from the updated credentials
      $set.mode = this.extractMode(credentials);

      // 7) Re-derive OAuth app source (Ecosystem vs Developer tab)
      $set.oauthAppSource =
        dto.oauthAppSource ?? this.extractOAuthAppSource(credentials);
    }

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );

      if (!updated)
        throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

      const result = ProviderCredentialsMapper.toResponse(
        updated.toObject() as any,
      );

      // Determine which lifecycle event to fire.
      const credentialTag = String((updated as any).tag ?? existing.tag);
      const ccpId = String(existing.companyChannelProviderId);
      const ts = new Date().toISOString();

      let eventKey: string | null = null;
      let extraData: Record<string, string> = {};

      if (dto.credentials !== undefined || dto.tag !== undefined) {
        eventKey = 'notifications.provider_credential_updated';
        extraData = { updatedBy: 'system', updatedAt: ts };
      } else if (dto.isActive === false) {
        eventKey = 'notifications.provider_credential_deactivated';
        extraData = { deactivatedBy: 'system', deactivatedAt: ts };
      } else if (dto.isActive === true) {
        eventKey = 'notifications.provider_credential_activated';
        extraData = { activatedBy: 'system', activatedAt: ts };
      }

      if (eventKey) {
        const finalEvent = eventKey;
        const finalExtra = extraData;
        this.resolveCredentialNotifyContext(ccpId)
          .then((ctx) => {
            if (!ctx) return;
            return this.notifyCredentialEvent(
              finalEvent,
              ctx,
              credentialTag,
              finalExtra,
            );
          })
          .catch((err) =>
            this.logger.warn(
              `${eventKey} notification failed for ${credentialTag}: ${err?.message}`,
            ),
          );
      }

      return result;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          this.duplicateKeyToMessage(err),
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to update credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tests stored credentials for a given provider-credentials record.
   *
   * Decrypts the stored payload server-side, routes to the correct channel
   * implementation, and calls verifyCredentials() — reusing all existing
   * validation and network-check logic.
   *
   * - SMTP:          nodemailer transporter.verify() (real handshake, no email sent)
   * - S3 access_keys: HeadBucket (read permission check, no upload/delete)
   * - SendGrid/Mailgun/Twilio/OAuth: field validation only (no live API call yet)
   *
   * Security:
   *   - Decrypted credentials are never logged or returned.
   *   - Returns only { success, message, provider, connectionType, checkedAt }.
   *   - companyId guard prevents cross-company credential testing.
   */
  async testById(
    id: string,
    expectedCompanyId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    provider: string;
    connectionType: string;
    checkedAt: string;
  }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    // Load credential record (encrypted blob included — needed for decryption)
    const cred = await this.model.findById(_id).lean();
    if (!cred)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    // Company boundary guard — prevents testing another company's credentials
    if (expectedCompanyId) {
      const ccpDoc = await this.ccpModel
        .findById(cred.companyChannelProviderId)
        .select('companyId')
        .lean();
      if (!ccpDoc)
        throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);
      if (String((ccpDoc as any).companyId) !== expectedCompanyId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
    }

    // Load provider + channel info needed for factory routing
    const { provider, channel } = await this.getCompanyChannelProviderOrFail(
      String(cred.companyChannelProviderId),
    );

    // Decrypt — never logged, never returned to caller
    let decrypted: Record<string, any>;
    try {
      decrypted = this.encryption.decryptJson((cred as any).encrypted);
    } catch {
      throw new HttpException(
        'Could not decrypt credentials. The encryption key may have changed.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const providerKey = this.resolveProviderKey({
      provider,
      credentials: decrypted,
    });
    const checkedAt = new Date().toISOString();
    const providerLabel = String(
      provider.displayName ?? provider.providerKey ?? 'Unknown',
    );
    const channelKey = String(channel.channelKey).toLowerCase().trim();
    const connectionType = String(provider.connectionType).toLowerCase().trim();

    // Route to the correct channel implementation and call verifyCredentials()
    // directly — same method used during create/update, but we handle
    // { ok: false } as a safe return value rather than throwing HTTP 400.
    try {
      let res: { ok: boolean; message?: string } = { ok: false };

      if (channelKey === 'email') {
        const emailChannel = this.factory.getEmailChannel(
          connectionType,
          providerKey,
        );
        res = await emailChannel.verifyCredentials(decrypted);
      } else if (channelKey === 'sms') {
        const smsChannel = this.factory.getSmsChannel(
          connectionType,
          providerKey,
        );
        res = await smsChannel.verifyCredentials(decrypted);
      } else if (channelKey === 'storage') {
        const storageChannel = this.factory.getStorageChannel(connectionType);
        res = await storageChannel.verifyCredentials(decrypted);
      } else if (channelKey === 'payment') {
        // Live Stripe API verification is not yet implemented.
        // Format validation is performed during save; this confirms credential format only.
        const contract = this.getContractForProvider(
          channelKey,
          connectionType,
          providerKey,
        );
        if (contract?.verify) {
          res = await contract.verify(decrypted as any);
        } else {
          res = {
            ok: true,
            message:
              'Credential format verified. Live connection test will be available after Stripe integration is complete.',
          };
        }
      } else if (channelKey === 'accounting' || channelKey === 'billing') {
        // OAuth flow for Accounting/Billing providers is deferred to Phase 2.
        // Returns the contract's verify result (format check) or a safe default.
        const contract = this.getContractForProvider(
          channelKey,
          connectionType,
          providerKey,
        );
        if (contract?.verify) {
          res = await contract.verify(decrypted as any);
        } else {
          res = {
            ok: true,
            message:
              'Credential format verified. Complete the OAuth authorization flow to activate the connection.',
          };
        }
      } else {
        throw new HttpException(
          `Unsupported channel "${channelKey}"`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const testResult = {
        success: res.ok,
        message:
          res.message ??
          (res.ok ? 'Credentials verified.' : 'Verification failed.'),
        provider: providerLabel,
        connectionType: provider.connectionType,
        checkedAt,
      };

      if (testResult.success) {
        const ccpId = String(cred.companyChannelProviderId);
        const credentialTag = String((cred as any).tag);
        this.resolveCredentialNotifyContext(ccpId)
          .then((ctx) => {
            if (!ctx) return;
            return this.notifyCredentialEvent(
              'notifications.provider_credential_verified',
              ctx,
              credentialTag,
              { verifiedBy: 'system', verifiedAt: checkedAt },
            );
          })
          .catch((err) =>
            this.logger.warn(
              `provider_credential_verified notification failed for ${credentialTag}: ${err?.message}`,
            ),
          );
      }

      return testResult;
    } catch (err: any) {
      // Channel threw (e.g. UnsupportedConnectionTypeError) — treat as failure
      if (err instanceof HttpException) throw err;
      return {
        success: false,
        message: err?.message ?? 'Verification failed.',
        provider: providerLabel,
        connectionType: provider.connectionType,
        checkedAt,
      };
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    // Capture before deletion so the notification has the credential details.
    const snapshot: any = await this.model.findById(_id).lean();

    const res = await this.model.findByIdAndDelete(_id);
    if (!res)
      throw new HttpException('Credentials not found', HttpStatus.NOT_FOUND);

    if (snapshot) {
      const ccpId = String(snapshot.companyChannelProviderId);
      const credentialTag = String(snapshot.tag);
      this.resolveCredentialNotifyContext(ccpId)
        .then((ctx) => {
          if (!ctx) return;
          return this.notifyCredentialEvent(
            'notifications.provider_credential_deleted',
            ctx,
            credentialTag,
            { deletedBy: 'system', deletedAt: new Date().toISOString() },
          );
        })
        .catch((err) =>
          this.logger.warn(
            `provider_credential_deleted notification failed for ${credentialTag}: ${err?.message}`,
          ),
        );
    }

    return { deleted: true };
  }

  // =========================================================
  // CRUD
  // =========================================================

  /**
   * Picks the right credential contract for the given channel/connectionType/providerKey,
   * normalizes the raw payload, and validates it.
   *
   * Throws HTTP 422 with a structured `errors` array when validation fails,
   * so the frontend can map errors back to specific form fields.
   *
   * Returns the cleaned (normalized) credential object to be encrypted.
   */
  private async normalizeAndValidateCredentials(params: {
    channelKey: string;
    connectionType: string;
    providerKey?: string;
    credentials: Record<string, any>;
  }): Promise<Record<string, any>> {
    const contract = this.getContractForProvider(
      params.channelKey,
      params.connectionType,
      params.providerKey,
    );

    if (!contract) {
      // No contract registered → fall through; verifyByImplementation handles it
      return params.credentials;
    }

    try {
      const { value: normalized } = contract.normalize(params.credentials);
      contract.validate(normalized);
      return normalized as Record<string, any>;
    } catch (err: any) {
      if (
        err instanceof CredentialsValidationError ||
        err.name === 'CredentialsValidationError'
      ) {
        throw new HttpException(
          {
            message: err.message,
            errors: err.field
              ? [{ field: err.field, message: err.message }]
              : [],
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      throw err;
    }
  }

  /**
   * Derives a non-secret human-readable identifier from a cleaned credential
   * payload. The result is safe to store in plain text and display in the UI.
   *
   * Rules:
   *   - Never include passwords, API keys, auth tokens, client secrets,
   *     or secret access keys.
   *   - For access key IDs (AWS), show only a masked form: AKIA***XXXX.
   */
  private deriveDisplayIdentifier(
    credentials: Record<string, any>,
    connectionType: string,
    providerKey?: string,
  ): string {
    const ct = String(connectionType).toLowerCase().trim();
    const pk = providerKey
      ? String(providerKey).toLowerCase().trim()
      : undefined;

    const str = (v: any): string => (v ? String(v).trim() : '');

    // SMTP / Gmail → show fromEmail or username (never the password)
    if (ct === 'smtp' || pk === 'gmail') {
      return (
        str(credentials.fromEmail) ||
        str(credentials.user) ||
        str(credentials.username) ||
        ''
      );
    }

    // SendGrid → fromEmail or generic label
    if (pk === 'sendgrid') {
      return str(credentials.fromEmail) || 'API Key configured';
    }

    // Mailgun → fromEmail or sending domain
    if (pk === 'mailgun') {
      return (
        str(credentials.fromEmail) ||
        str(credentials.domain) ||
        'API Key configured'
      );
    }

    // Twilio → from phone number (not the authToken)
    if (pk === 'twilio') {
      return str(credentials.fromNumber) || str(credentials.fromPhone) || '';
    }

    // AWS S3 / access_keys → bucket name, or masked access key ID
    if (pk === 'aws-s3' || pk === 's3' || ct === 'access_keys') {
      const bucket = str(credentials.bucket);
      if (bucket) return bucket;
      const kid = str(credentials.accessKeyId);
      if (kid.length >= 8) {
        return kid.substring(0, 4) + '***' + kid.substring(kid.length - 4);
      }
      return kid || '';
    }

    // Generic api_key → fromEmail or generic label
    if (ct === 'api_key') {
      return str(credentials.fromEmail) || 'API Key configured';
    }

    // iCloud Calendar (app_password) → Apple ID email (never the app-specific password)
    if (pk === 'icloud' || ct === 'app_password') {
      return str(credentials.appleId) || '';
    }

    // Stripe (payment/api_key) → publishable key (designed to be public; identifies account/mode)
    if (pk === 'stripe') {
      return str(credentials.publishableKey) || 'Stripe configured';
    }

    // Token (payment/token) — never expose the token value; show a generic label
    if (ct === 'token') {
      return 'Token configured';
    }

    // Gmail OAuth / Google Identity → the connected/verified account email
    // (set after the OAuth callback completes; empty for a not-yet-connected
    // shell credential).
    if (pk === 'gmail_oauth' || pk === 'google_identity') {
      return str(credentials.emailAddress) || '';
    }

    // OAuth → client ID (not the secret or tokens)
    // Covers google_calendar, outlook_calendar, and any future OAuth provider.
    if (ct === 'oauth') {
      return str(credentials.clientId) || '';
    }

    return '';
  }

  /**
   * Extracts the canonical execution mode from normalized credentials.
   *
   * Provider-agnostic: any credential contract that normalises to an object
   * containing `{ mode: 'test' | 'live' }` will populate this field.
   * Providers without an explicit mode concept return null.
   *
   * This value is stored in plain text — mode is not a secret.
   * It must NEVER be derived from key prefixes, displayIdentifier, or other
   * presentation fields.
   */
  private extractMode(
    credentials: Record<string, unknown>,
  ): 'test' | 'live' | null {
    const m = credentials['mode'];
    if (m === 'test' || m === 'live') return m;
    return null;
  }

  /**
   * For OAuth credentials: whether this connection was authorised with the
   * platform's own (ecosystem) OAuth app, or with the tenant's own
   * clientId/clientSecret ("own" — Developer tab). Non-secret, stored in
   * plain text alongside the encrypted blob so the UI can render an
   * accurate connected state per auth-mode tab without decrypting.
   */
  private extractOAuthAppSource(
    credentials: Record<string, unknown>,
  ): 'ecosystem' | 'own' | null {
    if (credentials['oauthApplicationId']) return 'ecosystem';
    if (credentials['clientId']) return 'own';
    return null;
  }

  /** Maps channel + connectionType + providerKey to the appropriate credential contract. */
  private getContractForProvider(
    channelKey: string,
    connectionType: string,
    providerKey?: string,
  ): ContractSpec<any> | null {
    const ck = String(channelKey).toLowerCase().trim();
    const ct = String(connectionType).toLowerCase().trim();
    const pk = providerKey
      ? String(providerKey).toLowerCase().trim()
      : undefined;

    if (ck === 'email') {
      if (ct === 'smtp') return SmtpCredentialsContract;
      if (ct === 'oauth') return OAuthEmailCredentialsContract;
      if (ct === 'api_key') {
        if (pk === 'sendgrid') return SendGridCredentialsContract;
        if (pk === 'mailgun') return MailgunCredentialsContract;
      }
    }
    if (ck === 'sms' && ct === 'api_key') return TwilioCredentialsContract;
    if (ck === 'storage' && ct === 'access_keys')
      return S3AccessKeysCredentialsContract;

    if (ck === 'calendar') {
      if (ct === 'app_password' && pk === 'icloud')
        return ICloudCredentialsContract;
      if (ct === 'oauth' && pk === 'google_calendar')
        return GoogleCalendarCredentialsContract;
      if (ct === 'oauth' && pk === 'outlook_calendar')
        return OutlookCalendarCredentialsContract;
    }

    if (ck === 'payment') {
      if (ct === 'api_key' && pk === 'stripe') return StripeCredentialsContract;
      if (ct === 'api_key' && pk === 'stripe-connect')
        return StripeCredentialsContract;
      if (ct === 'token' && pk === 'coingate')
        return CoinGateCredentialsContract;
      if (ct === 'token') return TokenCredentialsContract;
    }

    if ((ck === 'accounting' || ck === 'billing') && pk === 'xero') {
      return XeroCredentialsContract;
    }

    if (ck === 'identity' && ct === 'oauth') {
      return IdentityCredentialsContract;
    }

    return null;
  }

  private normalizeTag(tag: string) {
    return String(tag ?? '')
      .toLowerCase()
      .trim();
  }

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private duplicateKeyToMessage(err: any) {
    const indexName = err?.keyPattern
      ? Object.keys(err.keyPattern).join('_')
      : (err?.indexName ?? err?.index ?? 'unknown_index');

    // The one real-world case today: two credentials with the same tag on
    // the same provider connection. Give a plain-language message instead
    // of the raw Mongo key names.
    if (err?.keyValue?.tag && err?.keyValue?.companyChannelProviderId) {
      return `A credential with the tag "${err.keyValue.tag}" already exists for this provider. Use a different tag.`;
    }

    const keyValue = err?.keyValue;
    if (keyValue) {
      return `Duplicate credentials (${indexName}): ${JSON.stringify(keyValue)}`;
    }

    const keyPattern = err?.keyPattern;
    if (keyPattern) {
      return `Duplicate credentials (${indexName})`;
    }

    return `Duplicate credentials (${indexName}). Raw: ${err?.message ?? 'duplicate key'}`;
  }

  private populateForValidation(query: any, opts?: PopulateOpts) {
    if (!opts?.populateCompanyChannelProvider) return query;

    return query.populate({
      path: 'companyChannelProviderId',
      populate: [{ path: 'providerId' }, { path: 'channelId' }],
    });
  }

  private async getCompanyChannelProviderOrFail(id: string) {
    const _id = this.toObjectIdOrThrow(id, 'companyChannelProviderId');

    const doc = await this.ccpModel
      .findById(_id)
      .populate('providerId')
      .populate('channelId')
      .lean();

    if (!doc) {
      throw new HttpException(
        'CompanyChannelProvider not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    if ((doc as any).isActive === false) {
      throw new HttpException(
        'CompanyChannelProvider inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = (doc as any).providerId;
    const channel = (doc as any).channelId;

    if (!provider) {
      throw new HttpException(
        'Provider not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!channel) {
      throw new HttpException(
        'Channel not populated',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { doc, provider, channel };
  }

  /**
   * ✅ Verifica credenciales usando el factory (single source of truth)
   * - EMAIL: smtp / oauth / api_key (sendgrid/mailgun)
   * - SMS: api_key (twilio default) / oauth
   * - STORAGE: access_keys / iam_role
   */
  private async verifyByImplementation(params: {
    channelKey: string;
    connectionType: string;
    providerKey?: string;
    credentials: Record<string, any>;
  }): Promise<void> {
    const channelKey = String(params.channelKey ?? '')
      .toLowerCase()
      .trim();
    const connectionType = String(params.connectionType ?? '')
      .toLowerCase()
      .trim();
    const providerKey = params.providerKey
      ? String(params.providerKey).toLowerCase().trim()
      : undefined;
    const credentials = params.credentials ?? {};

    // EMAIL
    if (channelKey === 'email') {
      const emailChannel = this.factory.getEmailChannel(
        connectionType,
        providerKey,
      );
      const res = await emailChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'EMAIL credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // SMS
    if (channelKey === 'sms') {
      const smsChannel = this.factory.getSmsChannel(
        connectionType,
        providerKey,
      );
      const res = await smsChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'SMS credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // STORAGE
    if (channelKey === 'storage') {
      const storageChannel = this.factory.getStorageChannel(connectionType);
      const res = await storageChannel.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'STORAGE credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // CALENDAR
    if (channelKey === 'calendar') {
      if (!providerKey) {
        throw new HttpException(
          'providerKey is required for calendar credential verification',
          HttpStatus.BAD_REQUEST,
        );
      }
      const calendarProvider =
        this.calendarFactory.getCalendarProvider(providerKey);
      const res = await calendarProvider.verifyCredentials(credentials);
      if (!res?.ok) {
        throw new HttpException(
          res?.message ?? 'CALENDAR credentials verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // PAYMENT — format validation only; live Stripe API verification added in a future task
    if (channelKey === 'payment') {
      const contract = this.getContractForProvider(
        channelKey,
        connectionType,
        providerKey,
      );
      if (contract?.verify) {
        const res = await contract.verify(credentials as any);
        if (!res?.ok) {
          throw new HttpException(
            res?.message ?? 'PAYMENT credentials verification failed',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return;
    }

    // ACCOUNTING / BILLING — OAuth flow deferred to Phase 2.
    // Format validation is performed by the credential contract during save.
    // Live token verification will be added once the OAuth callback handler exists.
    if (channelKey === 'accounting' || channelKey === 'billing') {
      const contract = this.getContractForProvider(
        channelKey,
        connectionType,
        providerKey,
      );
      if (contract?.verify) {
        const res = await contract.verify(credentials as any);
        if (!res?.ok) {
          throw new HttpException(
            res?.message ?? 'Credentials verification failed',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return;
    }

    // IDENTITY — format validation only, same as Accounting/Billing.
    // Live verification happens on-demand via the connection status endpoint
    // once the OAuth callback has populated real tokens.
    if (channelKey === 'identity') {
      const contract = this.getContractForProvider(
        channelKey,
        connectionType,
        providerKey,
      );
      if (contract?.verify) {
        const res = await contract.verify(credentials as any);
        if (!res?.ok) {
          throw new HttpException(
            res?.message ?? 'IDENTITY credentials verification failed',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return;
    }

    throw new HttpException(
      `Unsupported channelKey="${channelKey}"`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * ✅ Si el providerKey es necesario (api_key), lo resolvemos así:
   * - Preferimos el que venga en credentials (providerKey / PROVIDER_KEY)
   * - Si no viene, usamos provider.providerKey (por ejemplo: "sendgrid", "mailgun")
   */
  private resolveProviderKey(params: {
    provider: any;
    credentials: Record<string, any>;
  }): string | undefined {
    const fromCreds = this.factory.pickProviderKeyFromCredentials(
      params.credentials,
    );
    if (fromCreds) return String(fromCreds).toLowerCase().trim();

    const fromProvider = params.provider?.providerKey;
    return fromProvider ? String(fromProvider).toLowerCase().trim() : undefined;
  }

  async options(params: {
    companyId: string;
    channel?: 'email' | 'sms';
    active?: boolean;
  }) {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');

    const filter: any = {};

    if (typeof params.active === 'boolean') {
      filter.isActive = params.active;
    }

    const list: any[] = await this.model
      .find(filter)
      .select('-encrypted')
      .populate({
        path: 'companyChannelProviderId',
        match: {
          companyId,
          isActive: true,
        },
        populate: [
          {
            path: 'providerId',
            select: 'providerKey displayName connectionType isActive channelId',
          },
          {
            path: 'channelId',
            select: 'channelKey displayName isActive',
          },
        ],
      })
      .sort({ tag: 1 })
      .lean();

    return list
      .filter((cred) => {
        const ccp = cred.companyChannelProviderId;

        if (!ccp) return false;

        const channelKey = String(ccp.channelId?.channelKey ?? '')
          .toLowerCase()
          .trim();

        // ✅ Domain Catalogue solo permite email y sms
        if (channelKey !== 'email' && channelKey !== 'sms') {
          return false;
        }

        if (params.channel && channelKey !== params.channel) {
          return false;
        }

        return true;
      })
      .map((cred) => {
        const ccp = cred.companyChannelProviderId;
        const provider = ccp.providerId;
        const channel = ccp.channelId;

        const channelKey = String(channel?.channelKey ?? '')
          .toLowerCase()
          .trim();

        const providerName =
          provider?.displayName || provider?.providerKey || 'Provider';

        const tag = cred.tag || 'default';

        return {
          id: String(cred._id),
          label: `${channelKey.toUpperCase()} — ${providerName} — ${tag}`,

          channel: channelKey,
          channelKey,
          channelDisplayName: channel?.displayName ?? channelKey,

          providerKey: provider?.providerKey ?? '',
          providerDisplayName: provider?.displayName ?? '',
          connectionType: provider?.connectionType ?? '',

          tag,
          displayIdentifier: cred.displayIdentifier ?? undefined,
          isActive: cred.isActive !== false,

          companyChannelProviderId: String(ccp._id),
        };
      });
  }

  /**
   * Distinct channelKeys ("email", "calendar", "payment", …) and providerKeys
   * ("gmail_oauth", "xero", …) for which this company has at least one active
   * credential. Drives which navbar tabs are shown — a channel with no
   * configured credentials stays hidden, and a tab can additionally require
   * a specific providerKey when only some providers within a channel support
   * the capability it needs (e.g. only gmail_oauth can read a mailbox — the
   * generic "email" channel also covers send-only providers like SMTP).
   */
  async getConfiguredChannels(
    companyId: string,
  ): Promise<{ channels: string[]; providerKeys: string[] }> {
    const companyObjectId = this.toObjectIdOrThrow(companyId, 'companyId');

    const list: any[] = await this.model
      .find({ isActive: true })
      .select('companyChannelProviderId')
      .populate({
        path: 'companyChannelProviderId',
        match: { companyId: companyObjectId, isActive: true },
        select: 'channelId providerId',
        populate: [
          { path: 'channelId', select: 'channelKey' },
          { path: 'providerId', select: 'providerKey' },
        ],
      })
      .lean();

    const channelKeys = new Set<string>();
    const providerKeys = new Set<string>();
    for (const cred of list) {
      const channelKey = cred.companyChannelProviderId?.channelId?.channelKey;
      if (channelKey) channelKeys.add(String(channelKey).toLowerCase().trim());
      const providerKey =
        cred.companyChannelProviderId?.providerId?.providerKey;
      if (providerKey)
        providerKeys.add(String(providerKey).toLowerCase().trim());
    }
    return {
      channels: Array.from(channelKeys),
      providerKeys: Array.from(providerKeys),
    };
  }
}
