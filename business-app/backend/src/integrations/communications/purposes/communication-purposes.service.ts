import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { CommunicationConnectionService } from '../connection/communication-connection.service';
import type { CreatePurposeDto } from './dto/create-purpose.dto';
import type { UpdatePurposeDto } from './dto/update-purpose.dto';
import type { PurposeListQueryDto } from './dto/purpose-list-query.dto';
import type {
  CredentialOptionDto,
  PurposeListResponseDto,
  PurposeResponseDto,
} from './dto/purpose-response.dto';

/**
 * CommunicationPurposesService — proxy layer between Business App and the
 * Communications /domain-catalogue and /provider-credentials/options endpoints.
 *
 * AUTH NOTE
 * ---------
 * /domain-catalogue and /provider-credentials controllers in Communications
 * use assertApiKey() which compares x-api-key against COMMUNICATION_API_KEY
 * directly (the admin key), NOT the integration token.
 * Business App must therefore send COMMUNICATION_API_KEY as x-api-key.
 *
 * Tenant isolation is preserved: every request includes companyId resolved
 * from the business's IntegrationConnection.communicationCompanyId.
 * For get/update/delete by ID, ownership is verified before the operation.
 *
 * Rules:
 *   - Never stores any domain data locally. All data lives in Communications.
 *   - Admin key is never logged.
 *   - Forwards validation and conflict errors from Communications to the caller.
 */
@Injectable()
export class CommunicationPurposesService {
  private readonly logger = new Logger(CommunicationPurposesService.name);

  constructor(
    private readonly connections: CommunicationConnectionService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private get baseUrl(): string {
    return (
      this.config.get<string>('COMMUNICATION_API_URL') ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  /**
   * The admin API key shared between Business App and Communications.
   * This is what /domain-catalogue and /provider-credentials expect.
   * Never log this value in full.
   */
  private get adminApiKey(): string {
    return this.config.get<string>('COMMUNICATION_API_KEY') ?? '';
  }

  /**
   * Resolve the business's remote company ID in Communications.
   * The integration connection must exist and be active.
   */
  private async resolveConn(businessId: string) {
    const conn = await this.connections.getCommunicationConnectionForContext(
      'business',
      businessId,
    );
    if (!conn || !conn.isActive) {
      throw new HttpException(
        'Communications integration is not configured. Go to Settings → Communications to connect.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.debug(
      `[resolveConn] businessId=${businessId} remoteCompanyId=${conn.communicationCompanyId} ` +
        `status=${conn.status} — connection resolved`,
    );

    return conn;
  }

  /**
   * Re-throw any Communications API error as an NestJS HttpException so the
   * original status code and validation message reach the frontend unchanged.
   */
  private forwardError(err: unknown, fallback: string): never {
    const e = err as {
      response?: { status?: number; data?: { message?: unknown } };
      message?: string;
    };
    const status = e?.response?.status ?? HttpStatus.BAD_GATEWAY;
    const raw = e?.response?.data?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string' && raw
        ? raw
        : fallback;

    this.logger.warn(
      `[forwardError] HTTP ${status} from Communications — ${message}`,
    );
    throw new HttpException(message, status);
  }

  /** Build the common request config for all Communications calls. */
  private commsHeaders() {
    const key = this.adminApiKey;
    if (!key) {
      this.logger.error('[commsHeaders] COMMUNICATION_API_KEY is not set — requests will be rejected by Communications');
    }
    return { 'x-api-key': key };
  }

  /**
   * Fetch a domain by ID and assert it belongs to the given company.
   * Guards update/delete operations against cross-tenant ID manipulation.
   */
  private async fetchAndAssertOwnership(
    id: string,
    remoteCompanyId: string,
  ): Promise<PurposeResponseDto> {
    const url = `${this.baseUrl}/domain-catalogue/${id}`;
    this.logger.debug(`[ownership] GET ${url}`);

    let domain: PurposeResponseDto;
    try {
      const res = await firstValueFrom(
        this.http.get<PurposeResponseDto>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      domain = res.data;
    } catch (err) {
      this.forwardError(err, 'Communication purpose not found');
    }

    if (domain.companyId !== remoteCompanyId) {
      this.logger.warn(
        `[ownership] DENIED — domain ${id} belongs to ${domain.companyId}, ` +
          `not to ${remoteCompanyId}`,
      );
      throw new ForbiddenException('Access denied to this communication purpose');
    }

    return domain;
  }

  // ─── CRUD proxy ───────────────────────────────────────────────────────────

  async list(
    businessId: string,
    params: PurposeListQueryDto,
  ): Promise<PurposeListResponseDto> {
    const conn = await this.resolveConn(businessId);
    const limit = params.limit ?? 50;
    const offset = ((params.page ?? 1) - 1) * limit;

    const qs = new URLSearchParams({
      companyId: conn.communicationCompanyId,
      limit: String(limit),
      offset: String(offset),
    });
    if (params.active !== undefined) qs.set('active', String(params.active));

    const url = `${this.baseUrl}/domain-catalogue?${qs}`;
    this.logger.debug(`[list] GET ${url} remoteCompanyId=${conn.communicationCompanyId}`);

    try {
      const res = await firstValueFrom(
        this.http.get<PurposeListResponseDto>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[list] HTTP ${res.status} — ${res.data?.total ?? '?'} records`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to load communication purposes');
    }
  }

  async findOne(
    businessId: string,
    id: string,
  ): Promise<PurposeResponseDto> {
    const conn = await this.resolveConn(businessId);
    return this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
  }

  async create(
    businessId: string,
    dto: CreatePurposeDto,
  ): Promise<PurposeResponseDto> {
    const conn = await this.resolveConn(businessId);
    const body = {
      companyId:      conn.communicationCompanyId,
      domainKey:      dto.domainKey,
      displayName:    dto.displayName,
      domainCategory: dto.domainCategory,
      isActive:       dto.isActive ?? true,
      channelsToUse:  dto.channelsToUse ?? [],
    };

    const url = `${this.baseUrl}/domain-catalogue`;
    this.logger.debug(
      `[create] POST ${url} domainKey=${dto.domainKey} remoteCompanyId=${conn.communicationCompanyId}`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<PurposeResponseDto>(url, body, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[create] HTTP ${res.status} — id=${res.data?.id}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to create communication purpose');
    }
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePurposeDto,
  ): Promise<PurposeResponseDto> {
    const conn = await this.resolveConn(businessId);

    // Verify ownership before mutating
    await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);

    const url = `${this.baseUrl}/domain-catalogue/${id}`;
    this.logger.debug(`[update] PATCH ${url}`);

    try {
      const res = await firstValueFrom(
        this.http.patch<PurposeResponseDto>(url, dto, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[update] HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to update communication purpose');
    }
  }

  async remove(
    businessId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const conn = await this.resolveConn(businessId);

    // Verify ownership before mutating
    await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);

    const url = `${this.baseUrl}/domain-catalogue/${id}`;
    this.logger.debug(`[remove] DELETE ${url}`);

    try {
      const res = await firstValueFrom(
        this.http.delete<{ deleted: boolean }>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[remove] HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to delete communication purpose');
    }
  }

  // ─── Credential options ───────────────────────────────────────────────────

  /**
   * Returns credential options for a given channel, populated with the same
   * metadata shown on the Communications Credentials page (tag, displayIdentifier,
   * provider, connection type).
   *
   * Uses GET /provider-credentials?companyId=...&populate=true&active=true
   * — the same endpoint used by the Communications Credentials list page —
   * then filters the result to the requested channel.
   *
   * This endpoint always returns `displayIdentifier` and populated
   * provider/channel info. Calendar and other non-email/sms channels are
   * excluded by the channel filter applied here.
   *
   * Never exposes encrypted payloads, passwords, API keys or secrets.
   */
  async getCredentialOptions(
    businessId: string,
    channel: 'email' | 'sms',
  ): Promise<CredentialOptionDto[]> {
    const conn = await this.resolveConn(businessId);

    const qs = new URLSearchParams({
      companyId: conn.communicationCompanyId,
      populate:  'true',
      active:    'true',
      limit:     '200',
    });
    const url = `${this.baseUrl}/provider-credentials?${qs}`;

    this.logger.debug(
      `[getCredentialOptions] GET ${url} (filtering to channel=${channel})`,
    );

    try {
      const res = await firstValueFrom(
        this.http.get<{ data: any[]; total: number }>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );

      const raw: any[] = res.data?.data ?? [];
      this.logger.debug(
        `[getCredentialOptions] HTTP ${res.status} total=${raw.length} before channel filter`,
      );

      const filtered = raw.filter((c) => {
        const channelKey = String(
          c.companyChannelProvider?.channel?.channelKey ?? '',
        )
          .toLowerCase()
          .trim();
        return channelKey === channel;
      });

      this.logger.debug(
        `[getCredentialOptions] ${filtered.length} credential(s) match channel=${channel}`,
      );

      return filtered.map((c): CredentialOptionDto => {
        const provider   = c.companyChannelProvider?.provider ?? {};
        const ch         = c.companyChannelProvider?.channel  ?? {};
        const channelKey = String(ch.channelKey ?? channel).toLowerCase().trim();
        const providerDisplayName =
          (provider.displayName as string | undefined)?.trim() ||
          (provider.providerKey as string | undefined)?.trim() ||
          '';
        const tag = (c.tag as string | undefined) ?? 'unknown';

        return {
          id:                  String(c.id ?? c._id),
          tag,
          displayIdentifier:   (c.displayIdentifier as string | undefined) ?? undefined,
          label:               `${channelKey.toUpperCase()} — ${providerDisplayName || 'Provider'} — ${tag}`,
          channel:             channelKey,
          channelDisplayName:  (ch.displayName as string | undefined) ?? channelKey,
          providerKey:         (provider.providerKey as string | undefined) ?? '',
          providerDisplayName: (provider.displayName as string | undefined) ?? '',
          connectionType:      (provider.connectionType as string | undefined) ?? '',
          isActive:            c.isActive !== false,
        };
      });
    } catch (err: any) {
      this.logger.warn(
        `[getCredentialOptions] FAILED channel=${channel}: ${err?.response?.status ?? ''} ${err?.message}`,
      );
      return [];
    }
  }
}
