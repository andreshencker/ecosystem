import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import {
  IntegrationConnection,
  IntegrationConnectionDocument,
} from './communication-connection.schema';
import { CryptoService } from '../../../infrastructure/common/security/crypto.service';
import { IntegrationConnectionResponseDto } from './dto/communication-connection.dto';
import { User, UserDocument } from '../../../modules/users/schemas/user.schema';
import {
  Business,
  BusinessDocument,
} from '../../../modules/business/schemas/business.schema';

export interface TestResult {
  success: boolean;
  status: 'connected' | 'failed';
  message: string;
  checkedAt: string;
  remoteCompanyId?: string;
  remoteCompanyKey?: string;
  remoteCompanyName?: string;
}

/**
 * BusinessConnection — resolved connection context for outbound HTTP calls.
 *
 * communicationCompanyId = remoteCompanyId: the ID of this Business in Communications App.
 * decryptedToken         = plaintext integration token (never log in full).
 */
export interface BusinessConnection {
  communicationCompanyId: string;
  decryptedToken: string;
  status: 'connected' | 'failed' | null;
  isActive: boolean;
}

@Injectable()
export class CommunicationConnectionService {
  private readonly logger = new Logger(CommunicationConnectionService.name);

  constructor(
    @InjectModel(IntegrationConnection.name)
    private readonly model: Model<IntegrationConnectionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly crypto: CryptoService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get baseUrl(): string {
    return (
      this.config.get<string>('COMMUNICATION_API_URL') ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  /** Resolve businessId from userId (JWT only carries sub+type). */
  private async resolveBusinessId(userId: string): Promise<string> {
    const user = (await this.userModel
      .findById(userId)
      .select('companyId')
      .lean()
      .exec()) as { companyId?: unknown } | null;
    if (!user?.companyId)
      throw new HttpException(
        'User has no business associated.',
        HttpStatus.FORBIDDEN,
      );
    return String(user.companyId);
  }

  /** Resolve the authenticated user's Business for post-save provisioning. */
  async resolveBusinessIdForUser(userId: string): Promise<string> {
    return this.resolveBusinessId(userId);
  }

  /**
   * Build a query that matches documents by businessId, also handling legacy
   * documents that still use the old 'companyId' field name.
   */
  private businessQuery(businessId: string): object {
    const oid = new Types.ObjectId(businessId);
    return { $or: [{ businessId: oid }, { companyId: oid }] };
  }

  /**
   * Verify a raw integration token against Communications App.
   * Returns the Communications companyId as remoteCompanyId.
   */
  private async verifyTokenWithRemote(token: string): Promise<{
    success: boolean;
    message: string;
    remoteCompanyId?: string;
    remoteCompanyKey?: string;
    remoteCompanyName?: string;
  }> {
    const url = `${this.baseUrl}/company-integrations/me`;
    try {
      this.logger.log(`[verify] GET ${url}`);
      const res = await firstValueFrom(
        this.http.get<{
          companyId?: string;
          companyKey?: string;
          companyName?: string;
        }>(url, {
          headers: { 'x-integration-token': token },
          timeout: 8_000,
        }),
      );
      const d = res.data;
      return {
        success: true,
        message: `Connected — ${d.companyName ?? 'Company found'}`,
        remoteCompanyId: d.companyId, // Communications App's own field name
        remoteCompanyKey: d.companyKey,
        remoteCompanyName: d.companyName,
      };
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
        code?: string;
        message?: string;
      };
      const message = e?.response?.status
        ? `HTTP ${e.response.status}: ${e?.response?.data?.message ?? e.message}`
        : e?.code === 'ECONNREFUSED' || e?.code === 'ENOTFOUND'
          ? 'Cannot reach the Communications server — verify COMMUNICATION_API_URL'
          : (e?.message ?? 'Connection failed');
      return { success: false, message };
    }
  }

  // ─── Public API (internal service-to-service) ─────────────────────────────

  /**
   * Resolves the correct BusinessConnection based on routing context.
   *
   * type = 'platform': uses the base company (isPlatformCompany: true).
   *   All platform lifecycle events (verify email, invitations, etc.) use this path
   *   so they work even before a tenant has configured their own connection.
   *
   * type = 'business': uses the BusinessId's own CommunicationConnection.
   *   For tenant-owned business events (invoices, payments, documents).
   *   Requires the Business to have configured a connection.
   *
   * Communications App never receives the 'type' — it only sees the resolved
   * token and remoteCompanyId. The routing decision is entirely internal.
   */
  async getCommunicationConnectionForContext(
    type: 'platform' | 'business',
    businessId?: string,
  ): Promise<BusinessConnection | null> {
    if (type === 'platform') {
      const platformBusiness = (await this.businessModel
        .findOne({ isPlatformCompany: true })
        .select('_id businessName businessKey isPlatformCompany')
        .lean()
        .exec()) as any;

      if (!platformBusiness?._id) {
        this.logger.warn(
          '[getCommunicationConnectionForContext] type=platform: no Business with isPlatformCompany=true found — returning null.',
        );
        return null;
      }

      return this.getConnectionForBusiness(String(platformBusiness._id));
    }

    // type = 'business'
    if (!businessId) {
      this.logger.error(
        '[getCommunicationConnectionForContext] type=business requires businessId — none provided.',
      );
      return null;
    }
    return this.getConnectionForBusiness(businessId);
  }

  /** Returns the full BusinessConnection for a given businessId. */
  async getConnectionForBusiness(
    businessId: string,
  ): Promise<BusinessConnection | null> {
    const doc = (await this.model
      .findOne({
        ...this.businessQuery(businessId),
        provider: 'communications',
        isActive: true,
      })
      .lean()) as any;

    if (!doc) return null;

    // remoteCompanyId may be null if Communications was unreachable during save.
    // The decrypted token is still usable for outbound API calls (Communications
    // resolves the company from the token itself). Callers that need remoteCompanyId
    // (e.g. notifications) handle a null value gracefully.
    try {
      const { token } = this.crypto.decryptJson(doc.encryptedToken);
      return {
        communicationCompanyId: doc.remoteCompanyId ?? '',
        decryptedToken: token as string,
        status: doc.lastStatus ?? null,
        isActive: doc.isActive,
      };
    } catch {
      this.logger.error(
        `[getConnectionForBusiness] decryption failed for businessId=${businessId}`,
      );
      return null;
    }
  }

  // ─── CRUD (called from controller) ───────────────────────────────────────

  async get(
    userId: string,
    provider: string,
  ): Promise<IntegrationConnectionResponseDto | null> {
    const businessId = await this.resolveBusinessId(userId);
    const doc = await this.model
      .findOne({ ...this.businessQuery(businessId), provider })
      .lean();
    return doc ? IntegrationConnectionResponseDto.from(doc) : null;
  }

  /**
   * Save (create or replace) a connection token.
   * Verifies the token against Communications to resolve remoteCompanyId.
   * If Communications is unreachable, saves without remoteCompanyId (notifications will be skipped).
   *
   * WHY two-step upsert:
   *   The legacy-compatibility filter businessQuery() includes `{ $or: [{ businessId }, { companyId }] }`.
   *   Mongoose strict mode rejects `companyId` in the filter when `upsert: true` is set, because it
   *   validates filter fields against the schema before potentially creating a new document.
   *   Fix: read first (no upsert → no strict validation), then update by `_id` or create by `businessId`.
   */
  async save(
    userId: string,
    provider: string,
    token: string,
    isActive = true,
  ): Promise<IntegrationConnectionResponseDto> {
    const businessId = await this.resolveBusinessId(userId);

    this.logger.log(
      `[save:${provider}] userId=${userId} businessId=${businessId} tokenPresent=${!!token}`,
    );

    const encrypted = this.crypto.encryptJson({ token });
    const tokenPrefix = token.slice(0, 12);

    let remoteCompanyId: string | null = null;
    try {
      const info = await this.verifyTokenWithRemote(token);
      if (info.success && info.remoteCompanyId)
        remoteCompanyId = info.remoteCompanyId;
      this.logger.log(
        `[save:${provider}] verify success=${info.success} remoteCompanyId=${remoteCompanyId ?? 'null'}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[save:${provider}] Could not resolve remoteCompanyId — saved without it: ${err?.message}`,
      );
    }

    const setData = {
      businessId: new Types.ObjectId(businessId),
      provider,
      encryptedToken: encrypted,
      tokenPrefix,
      isActive,
      remoteCompanyId,
      lastTestedAt: null,
      lastStatus: null,
      lastError: null,
    };

    // Step 1: find existing doc using the legacy-safe OR query (no upsert → no strict-mode conflict).
    const existing = (await this.model
      .findOne({ ...this.businessQuery(businessId), provider })
      .lean()) as any;

    this.logger.log(
      `[save:${provider}] existing doc: ${existing ? `_id=${existing._id}` : 'none (will create)'}`,
    );

    let doc: any;
    if (existing) {
      // Step 2a: update the found document by its immutable _id — no schema-field conflict possible.
      doc = await this.model
        .findOneAndUpdate(
          { _id: existing._id },
          { $set: setData },
          { new: true },
        )
        .lean();
    } else {
      // Step 2b: create a new document using only schema-valid fields.
      doc = await this.model
        .findOneAndUpdate(
          { businessId: new Types.ObjectId(businessId), provider },
          { $set: setData },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .lean();
    }

    this.logger.log(`[save:${provider}] persisted _id=${doc?._id}`);

    return IntegrationConnectionResponseDto.from(doc);
  }

  /**
   * Test a token.
   * - If token provided: verify that token without persisting.
   * - If absent: decrypt and verify stored token, then persist result.
   */
  async test(
    userId: string,
    provider: string,
    token?: string,
  ): Promise<TestResult> {
    const checkedAt = new Date().toISOString();

    if (token) {
      const result = await this.verifyTokenWithRemote(token);
      return {
        success: result.success,
        status: result.success ? 'connected' : 'failed',
        message: result.message,
        checkedAt,
        remoteCompanyId: result.remoteCompanyId,
        remoteCompanyKey: result.remoteCompanyKey,
        remoteCompanyName: result.remoteCompanyName,
      };
    }

    const businessId = await this.resolveBusinessId(userId);
    const doc = (await this.model
      .findOne({ ...this.businessQuery(businessId), provider })
      .lean()) as any;

    if (!doc)
      throw new HttpException(
        'No connection configured. Save a token first.',
        HttpStatus.NOT_FOUND,
      );

    const { token: storedToken } = this.crypto.decryptJson(doc.encryptedToken);
    const result = await this.verifyTokenWithRemote(storedToken as string);
    const status: 'connected' | 'failed' = result.success
      ? 'connected'
      : 'failed';

    const $set: any = {
      lastTestedAt: new Date(checkedAt),
      lastStatus: status,
      lastError: result.success ? null : result.message,
    };
    if (result.success && result.remoteCompanyId)
      $set.remoteCompanyId = result.remoteCompanyId;

    await this.model.findOneAndUpdate(
      { ...this.businessQuery(businessId), provider },
      { $set },
    );

    return {
      success: result.success,
      status,
      message: result.message,
      checkedAt,
      remoteCompanyId: result.remoteCompanyId,
      remoteCompanyKey: result.remoteCompanyKey,
      remoteCompanyName: result.remoteCompanyName,
    };
  }

  async toggle(
    userId: string,
    provider: string,
    isActive: boolean,
  ): Promise<IntegrationConnectionResponseDto> {
    const businessId = await this.resolveBusinessId(userId);
    const doc = await this.model
      .findOneAndUpdate(
        { ...this.businessQuery(businessId), provider },
        { $set: { isActive } },
        { new: true },
      )
      .lean();
    if (!doc)
      throw new HttpException(
        'No connection configured.',
        HttpStatus.NOT_FOUND,
      );
    return IntegrationConnectionResponseDto.from(doc);
  }

  async delete(
    userId: string,
    provider: string,
  ): Promise<{ deleted: boolean }> {
    const businessId = await this.resolveBusinessId(userId);
    const res = await this.model.findOneAndDelete({
      ...this.businessQuery(businessId),
      provider,
    });
    if (!res)
      throw new HttpException('No connection found.', HttpStatus.NOT_FOUND);
    return { deleted: true };
  }

  /** Find all connections with an active Communications connection (for catalog sync). */
  async findAllActiveBusinessConnections(): Promise<
    Array<{
      businessId: string;
      remoteCompanyId: string;
      decryptedToken: string;
    }>
  > {
    const platformBusiness = await this.businessModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean()
      .exec();
    const platformBusinessId = platformBusiness?._id
      ? String(platformBusiness._id)
      : null;

    const docs = (await this.model
      .find({
        provider: 'communications',
        isActive: true,
        remoteCompanyId: { $ne: null },
      })
      .lean()) as any[];

    const results: Array<{
      businessId: string;
      remoteCompanyId: string;
      decryptedToken: string;
    }> = [];
    for (const doc of docs) {
      try {
        const { token } = this.crypto.decryptJson(doc.encryptedToken);
        const bid = doc.businessId ?? doc.companyId;
        if (
          bid &&
          String(bid) !== platformBusinessId &&
          doc.remoteCompanyId &&
          token
        ) {
          results.push({
            businessId: String(bid),
            remoteCompanyId: doc.remoteCompanyId,
            decryptedToken: token as string,
          });
        }
      } catch {
        // skip undecryptable records
      }
    }
    return results;
  }
}
