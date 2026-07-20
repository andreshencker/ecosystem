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
import type { CreateCommunicationEventDto } from './dto/create-communication-event.dto';
import type { UpdateCommunicationEventDto } from './dto/update-communication-event.dto';
import type { CommunicationEventListQueryDto } from './dto/communication-event-list-query.dto';
import type {
  CommunicationEventListResponseDto,
  CommunicationEventResponseDto,
} from './dto/communication-event-response.dto';

/**
 * CommunicationEventsService — proxy layer between Business App and the
 * Communications /event-catalogue endpoints.
 *
 * Rules:
 *   - Never stores any event data locally; all data lives in Communications.
 *   - Uses COMMUNICATION_API_KEY (not the integration token) as x-api-key.
 *   - Resolves remoteCompanyId from the business integration connection.
 *   - Verifies domain ownership before any mutation to prevent cross-tenant access.
 *   - Forwards Communications validation errors unchanged.
 *   - Admin key is never logged in full.
 */
@Injectable()
export class CommunicationEventsService {
  private readonly logger = new Logger(CommunicationEventsService.name);

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

  private get adminApiKey(): string {
    return this.config.get<string>('COMMUNICATION_API_KEY') ?? '';
  }

  private commsHeaders() {
    const key = this.adminApiKey;
    if (!key) {
      this.logger.error('[commsHeaders] COMMUNICATION_API_KEY is not set');
    }
    return { 'x-api-key': key };
  }

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
      `[resolveConn] businessId=${businessId} remoteCompanyId=${conn.communicationCompanyId}`,
    );
    return conn;
  }

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
    this.logger.warn(`[forwardError] HTTP ${status} — ${message}`);
    throw new HttpException(message, status);
  }

  /**
   * Fetch an event by ID and verify the domain belongs to the authenticated company.
   * Communications stores companyId on the domain (domainCatalogueId), not the event.
   * With populateDomainCatalogue=true, the domain is embedded in the response.
   */
  private async fetchAndAssertOwnership(
    id: string,
    remoteCompanyId: string,
  ): Promise<CommunicationEventResponseDto> {
    const url = `${this.baseUrl}/event-catalogue/${id}?populateDomainCatalogue=true`;
    this.logger.debug(`[ownership] GET ${url}`);

    let event: CommunicationEventResponseDto;
    try {
      const res = await firstValueFrom(
        this.http.get<CommunicationEventResponseDto>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      event = res.data;
    } catch (err) {
      this.forwardError(err, 'Communication event not found');
    }

    // When populated, domainCatalogueId is an object with companyId.
    const domain = event.domainCatalogueId as any;
    const domainCompanyId =
      typeof domain === 'object' && domain !== null
        ? String(domain.companyId ?? '')
        : '';

    if (!domainCompanyId || domainCompanyId !== remoteCompanyId) {
      this.logger.warn(
        `[ownership] DENIED — event ${id} belongs to company ${domainCompanyId}, ` +
          `not ${remoteCompanyId}`,
      );
      throw new ForbiddenException('Access denied to this communication event');
    }

    return event;
  }

  // ─── CRUD proxy ───────────────────────────────────────────────────────────

  async list(
    businessId: string,
    params: CommunicationEventListQueryDto,
  ): Promise<CommunicationEventListResponseDto> {
    const conn = await this.resolveConn(businessId);
    const limit  = params.limit  ?? 50;
    const offset = ((params.page ?? 1) - 1) * limit;

    const qs = new URLSearchParams({
      domainCatalogueId:    params.domainCatalogueId,
      populateDomainCatalogue: 'true',
      limit:  String(limit),
      offset: String(offset),
    });
    if (params.active !== undefined) qs.set('active', String(params.active));

    const url = `${this.baseUrl}/event-catalogue?${qs}`;
    this.logger.debug(`[list] GET ${url}`);

    try {
      const res = await firstValueFrom(
        this.http.get<CommunicationEventListResponseDto>(url, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[list] HTTP ${res.status} — total=${res.data?.total ?? '?'}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to load communication events');
    }
  }

  async findOne(
    businessId: string,
    id: string,
  ): Promise<CommunicationEventResponseDto> {
    const conn = await this.resolveConn(businessId);
    return this.fetchAndAssertOwnership(id, conn.communicationCompanyId);
  }

  async create(
    businessId: string,
    dto: CreateCommunicationEventDto,
  ): Promise<CommunicationEventResponseDto> {
    const conn = await this.resolveConn(businessId);

    // Verify the domain belongs to this business before creating an event in it.
    const domainUrl =
      `${this.baseUrl}/domain-catalogue/${dto.domainCatalogueId}`;
    try {
      const domainRes = await firstValueFrom(
        this.http.get<any>(domainUrl, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      const domainCompanyId = String(domainRes.data?.companyId ?? '');
      if (domainCompanyId !== conn.communicationCompanyId) {
        throw new ForbiddenException('Access denied to this communication purpose');
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.forwardError(err, 'Communication purpose not found');
    }

    const body = {
      domainCatalogueId: dto.domainCatalogueId,
      eventKey:          dto.eventKey,
      displayName:       dto.displayName,
      description:       dto.description ?? '',
      eventType:         dto.eventType,
      channelContent:    dto.channelContent ?? {},
      isActive:          dto.isActive ?? true,
    };

    const url = `${this.baseUrl}/event-catalogue`;
    this.logger.debug(
      `[create] POST ${url} eventKey=${dto.eventKey} domain=${dto.domainCatalogueId}`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<CommunicationEventResponseDto>(url, body, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[create] HTTP ${res.status} id=${res.data?.id}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to create communication event');
    }
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCommunicationEventDto,
  ): Promise<CommunicationEventResponseDto> {
    const conn = await this.resolveConn(businessId);
    await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);

    const url = `${this.baseUrl}/event-catalogue/${id}`;
    this.logger.debug(`[update] PATCH ${url}`);

    try {
      const res = await firstValueFrom(
        this.http.patch<CommunicationEventResponseDto>(url, dto, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      this.logger.debug(`[update] HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to update communication event');
    }
  }

  async remove(
    businessId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const conn = await this.resolveConn(businessId);
    await this.fetchAndAssertOwnership(id, conn.communicationCompanyId);

    const url = `${this.baseUrl}/event-catalogue/${id}`;
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
      this.forwardError(err, 'Failed to delete communication event');
    }
  }

  async bulkImport(
    businessId: string,
    domainCatalogueId: string,
    items: Record<string, any>[],
  ): Promise<CommunicationEventResponseDto[]> {
    const conn = await this.resolveConn(businessId);

    // Verify domain ownership before bulk import.
    const domainUrl = `${this.baseUrl}/domain-catalogue/${domainCatalogueId}`;
    try {
      const domainRes = await firstValueFrom(
        this.http.get<any>(domainUrl, {
          headers: this.commsHeaders(),
          timeout: 10_000,
        }),
      );
      const domainCompanyId = String(domainRes.data?.companyId ?? '');
      if (domainCompanyId !== conn.communicationCompanyId) {
        throw new ForbiddenException('Access denied to this communication purpose');
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.forwardError(err, 'Communication purpose not found');
    }

    const body = { domainCatalogueId, items };
    const url  = `${this.baseUrl}/event-catalogue/bulk`;
    this.logger.debug(`[bulkImport] POST ${url} items=${items.length}`);

    try {
      const res = await firstValueFrom(
        this.http.post<CommunicationEventResponseDto[]>(url, body, {
          headers: this.commsHeaders(),
          timeout: 15_000,
        }),
      );
      this.logger.debug(`[bulkImport] HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      this.forwardError(err, 'Failed to bulk import communication events');
    }
  }
}
