import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CommunicationConnectionService } from '../connection/communication-connection.service';
import type { NotifyEventParams } from './dto/notify-event-params.interface';
import { findCatalogEvent } from '../catalog/communication-catalog';
import type {
  CatalogDomain,
  CatalogEvent,
} from '../catalog/communication-catalog.types';
import type {
  DocumentDomainSeed,
  DocumentSeed,
} from '../catalog/document-catalog.types';

/**
 * CommunicationsClientService — single point of contact for all HTTP calls to Communications App.
 *
 * Rules:
 *   - No other service makes direct HTTP calls to Communications App.
 *   - type='platform' uses the base company connection; type='business' uses the Business's own.
 *   - The routing decision (type) is internal — Communications never sees it.
 *   - Communications always receives: { companyId: remoteCompanyId, event, email, payload } + x-api-key.
 *   - Decrypted token is NEVER logged in full — only the first 12 chars.
 *   - Delivery errors log details and return false. Never throws from notifyEvent().
 */
@Injectable()
export class CommunicationsClientService {
  private readonly logger = new Logger(CommunicationsClientService.name);

  constructor(
    private readonly connections: CommunicationConnectionService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>('COMMUNICATION_API_URL') ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private get adminApiKey(): string {
    return this.config.get<string>('COMMUNICATION_API_KEY') ?? '';
  }

  // ─── Notification ─────────────────────────────────────────────────────────

  /**
   * Send a notification event to Communications App.
   * Returns true on successful delivery (2xx), false on any error.
   * Never throws — delivery failures must not block business flows.
   */
  async notifyEvent(params: NotifyEventParams): Promise<boolean> {
    const tag = `[notifyEvent:${params.event}]`;

    // Validate event exists in catalog before making any HTTP call.
    const catalogEntry = findCatalogEvent(params.event);
    if (!catalogEntry) {
      this.logger.error(
        `${tag} REJECTED — event "${params.event}" not found in COMMUNICATION_CATALOG. ` +
          'Add it to the catalog before calling notifyEvent().',
      );
      return false;
    }

    // Resolve businessId from the business variant only — platform events never
    // use a caller-supplied businessId for credential selection.
    const businessId =
      params.type === 'business' ? params.businessId : undefined;

    this.logger.log(
      `${tag} type=${params.type}${businessId ? ` businessId=${businessId}` : ''} recipient=${params.email}`,
    );

    const conn = await this.connections.getCommunicationConnectionForContext(
      params.type,
      businessId,
    );

    if (!conn) {
      if (params.type === 'platform') {
        this.logger.error(
          `${tag} SKIPPED — platform base company has no active CommunicationConnection. ` +
            'Configure the platform company connection in Settings → Communications.',
        );
      } else {
        this.logger.warn(
          `${tag} SKIPPED — no active CommunicationConnection for businessId=${params.businessId}. ` +
            'Business must configure its Communications integration first.',
        );
      }
      return false;
    }

    const url = `${this.baseUrl}/notifications/event`;
    const body = {
      companyId: conn.communicationCompanyId, // remoteCompanyId — Communications App's own field
      event: params.event,
      email: params.email,
      payload: { data: params.data },
    };

    this.logger.log(
      `${tag} POST ${url} remoteCompanyId=${conn.communicationCompanyId} token=${conn.decryptedToken.slice(0, 12)}...`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'x-api-key': conn.decryptedToken },
          timeout: 10_000,
        }),
      );
      this.logger.log(
        `${tag} DELIVERED — HTTP ${res.status} recipient=${params.email}`,
      );
      return true;
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      // Extract message only — never stringify the full response body (may contain sensitive data).
      const responseMsg =
        typeof e?.response?.data === 'object' && e.response.data !== null
          ? ((e.response.data as Record<string, unknown>)['message'] as string | undefined)
          : undefined;
      this.logger.error(
        `${tag} FAILED — recipient=${params.email} httpStatus=${e?.response?.status ?? '(no response)'} ` +
          `message=${responseMsg ?? e?.message ?? 'unknown'}`,
      );
      return false;
    }
  }

  // ─── Token verification ───────────────────────────────────────────────────

  /**
   * Verify a raw integration token against Communications App.
   * Returns remoteCompanyId (Communications App's companyId for this Business).
   */
  async verifyIntegrationToken(rawToken: string): Promise<{
    success: boolean;
    remoteCompanyId?: string;
    remoteCompanyKey?: string;
    remoteCompanyName?: string;
    message: string;
  }> {
    const url = `${this.baseUrl}/company-integrations/me`;
    try {
      const res = await firstValueFrom(
        this.http.get<{
          companyId?: string;
          companyKey?: string;
          companyName?: string;
        }>(url, {
          headers: { 'x-integration-token': rawToken },
          timeout: 8_000,
        }),
      );
      const d = res.data;
      return {
        success: true,
        message: `Connected — ${d.companyName ?? 'Company found'}`,
        remoteCompanyId: d.companyId, // Communications App uses "companyId" internally
        remoteCompanyKey: d.companyKey,
        remoteCompanyName: d.companyName,
      };
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      return {
        success: false,
        message: e?.response?.status
          ? `HTTP ${e.response.status}: ${e?.response?.data?.message ?? e.message}`
          : (e?.message ?? 'Connection failed'),
      };
    }
  }

  // ─── Provisioning helpers ─────────────────────────────────────────────────

  /**
   * List domain catalogues for a given remoteCompanyId.
   * apiKey = COMMUNICATION_API_KEY (for platform) or integration token (for business).
   *
   * Returns null when the server responds with 401 or 403 — the caller must treat
   * null as an authentication failure and must NOT attempt any write operations.
   * Returns [] when the request succeeded but no domains exist yet.
   */
  async getDomains(
    remoteCompanyId: string,
    apiKey: string,
  ): Promise<any[] | null> {
    const url = `${this.baseUrl}/domain-catalogue?companyId=${remoteCompanyId}&limit=200`;
    try {
      const res = await firstValueFrom(
        this.http.get(url, {
          headers: { 'x-api-key': apiKey },
          timeout: 10_000,
        }),
      );
      return (res.data?.data ?? res.data?.items ?? res.data ?? []) as any[];
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if (status === 401 || status === 403) {
        this.logger.error(
          `[getDomains] AUTH FAILED (HTTP ${status}) for remoteCompanyId=${remoteCompanyId} — token is invalid or missing`,
        );
        return null;
      }
      this.logger.warn(
        `[getDomains] Failed for remoteCompanyId=${remoteCompanyId}: ${err?.message}`,
      );
      return [];
    }
  }

  /**
   * Create a domain catalogue if it doesn't exist.
   * Returns the domain _id on success, null on failure.
   */
  async createDomain(
    remoteCompanyId: string,
    apiKey: string,
    domain: CatalogDomain,
  ): Promise<string | null> {
    const url = `${this.baseUrl}/domain-catalogue`;
    const body = {
      companyId: remoteCompanyId,
      domainKey: domain.domainKey,
      displayName: domain.displayName,
      domainCategory: domain.domainCategory,
      isActive: true,
      channelsToUse: [],
    };
    try {
      const res = await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'x-api-key': apiKey },
          timeout: 10_000,
        }),
      );
      return String(res.data?._id ?? res.data?.id ?? '');
    } catch (err: any) {
      this.logger.error(
        `[createDomain] Failed domainKey=${domain.domainKey} remoteCompanyId=${remoteCompanyId}: ${err?.message}`,
      );
      return null;
    }
  }

  /**
   * List events for a given domain catalogue ID.
   */
  async getEvents(domainCatalogueId: string, apiKey: string): Promise<any[]> {
    const url = `${this.baseUrl}/event-catalogue?domainCatalogueId=${domainCatalogueId}&limit=200`;
    try {
      const res = await firstValueFrom(
        this.http.get(url, {
          headers: { 'x-api-key': apiKey },
          timeout: 10_000,
        }),
      );
      return (res.data?.data ?? res.data?.items ?? res.data ?? []) as any[];
    } catch (err: any) {
      this.logger.warn(
        `[getEvents] Failed for domainCatalogueId=${domainCatalogueId}: ${err?.message}`,
      );
      return [];
    }
  }

  /**
   * Create an event catalogue entry.
   * scope = 'platform' for platform events, 'company' for business events
   * (Communications App uses 'company' internally for business events).
   */
  async createEvent(
    domainCatalogueId: string,
    apiKey: string,
    event: CatalogEvent,
    scope: 'platform' | 'business',
  ): Promise<void> {
    const url = `${this.baseUrl}/event-catalogue`;

    // Build channelContent in the format Communications App expects.
    const channelContent: Record<string, any> = {};
    if (event.channels.email) {
      channelContent['email'] = {
        enabled: event.channels.email.enabled,
        subject: event.channels.email.subject ?? '',
        content: event.channels.email.content ?? '',
        requiredVariables: event.channels.email.requiredVariables,
        optionalVariables: event.channels.email.optionalVariables,
      };
    }
    if (event.channels.sms) {
      channelContent['sms'] = {
        enabled: event.channels.sms.enabled,
        text: event.channels.sms.text ?? '',
        requiredVariables: event.channels.sms.requiredVariables,
        optionalVariables: event.channels.sms.optionalVariables,
      };
    }

    const body = {
      domainCatalogueId,
      eventKey: event.eventKey,
      displayName: event.displayName,
      app: 'business-app',
      description: event.description,
      eventType: event.eventType,
      channelContent,
      isActive: true,
      scope: scope === 'platform' ? 'platform' : 'company',
      senderScope: scope === 'platform' ? 'platform' : 'company',
    };

    try {
      await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'x-api-key': apiKey },
          timeout: 10_000,
        }),
      );
    } catch (err: any) {
      this.logger.error(
        `[createEvent] Failed eventKey=${event.eventKey} domainCatalogueId=${domainCatalogueId}: ${err?.message}`,
      );
      throw err;
    }
  }

  // ─── Document catalogue provisioning ─────────────────────────────────────

  async getDocumentDomains(
    remoteCompanyId: string,
    apiKey: string,
  ): Promise<any[] | null> {
    const url = `${this.baseUrl}/document-domain-catalogue?companyId=${remoteCompanyId}&limit=200`;
    try {
      const res = await firstValueFrom(
        this.http.get(url, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }),
      );
      return (res.data?.data ?? res.data?.items ?? res.data ?? []) as any[];
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if (status === 401 || status === 403) return null;
      this.logger.warn(
        `[getDocumentDomains] Failed remoteCompanyId=${remoteCompanyId}: ${err?.message}`,
      );
      return [];
    }
  }

  async createDocumentDomain(
    remoteCompanyId: string,
    apiKey: string,
    domain: DocumentDomainSeed,
  ): Promise<string | null> {
    const url = `${this.baseUrl}/document-domain-catalogue`;
    try {
      const res = await firstValueFrom(
        this.http.post(url, {
          companyId: remoteCompanyId,
          domainKey: domain.domainKey,
          displayName: domain.displayName,
          description: domain.description,
          domainCategory: domain.domainCategory,
          allowedFormats: domain.allowedFormats,
          isActive: true,
        }, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }),
      );
      return String(res.data?.id ?? res.data?._id ?? '');
    } catch (err: any) {
      this.logger.error(
        `[createDocumentDomain] Failed domainKey=${domain.domainKey}: ${err?.message}`,
      );
      return null;
    }
  }

  async updateDocumentDomainFormats(
    documentDomainId: string,
    apiKey: string,
    allowedFormats: string[],
  ): Promise<boolean> {
    const url = `${this.baseUrl}/document-domain-catalogue/${documentDomainId}`;
    try {
      await firstValueFrom(
        this.http.patch(url, { allowedFormats }, {
          headers: { 'x-api-key': apiKey }, timeout: 10_000,
        }),
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `[updateDocumentDomainFormats] Failed documentDomainId=${documentDomainId}: ${err?.message}`,
      );
      return false;
    }
  }

  async getDocuments(documentDomainId: string, apiKey: string): Promise<any[]> {
    const url = `${this.baseUrl}/document-catalogue/domain/${documentDomainId}?limit=200`;
    try {
      const res = await firstValueFrom(
        this.http.get(url, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }),
      );
      return (res.data?.data ?? res.data?.items ?? res.data ?? []) as any[];
    } catch (err: any) {
      this.logger.warn(
        `[getDocuments] Failed documentDomainId=${documentDomainId}: ${err?.message}`,
      );
      return [];
    }
  }

  async createDocument(
    documentDomainId: string,
    apiKey: string,
    document: DocumentSeed,
  ): Promise<string | null> {
    const url = `${this.baseUrl}/document-catalogue`;
    try {
      const res = await firstValueFrom(
        this.http.post(url, {
          documentDomainCatalogueId: documentDomainId,
          documentKey: document.documentKey,
          displayName: document.displayName,
          description: document.description,
          formatContracts: document.formatContracts,
          isActive: true,
        }, { headers: { 'x-api-key': apiKey }, timeout: 10_000 }),
      );
      return String(res.data?.id ?? res.data?._id ?? '');
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message;
      this.logger.error(
        `[createDocument] Failed documentKey=${document.documentKey}: ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      );
      return null;
    }
  }

  /** Generate a contract-driven document in memory. Nothing is persisted. */
  async generateDocument(params: {
    type: 'business';
    businessId: string;
    canonicalKey: string;
    filename: string;
    data: Record<string, unknown>;
  }): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const conn = await this.connections.getCommunicationConnectionForContext(
      params.type,
      params.businessId,
    );
    if (!conn?.communicationCompanyId) {
      throw new Error('Active verified Communications connection is required');
    }
    const url = `${this.baseUrl}/files/documents/generate`;
    const response = await firstValueFrom(
      this.http.post<ArrayBuffer>(url, {
        companyId: conn.communicationCompanyId,
        canonicalKey: params.canonicalKey,
        filename: params.filename,
        data: params.data,
      }, {
        headers: { 'x-api-key': this.adminApiKey },
        responseType: 'arraybuffer',
        timeout: 30_000,
      }),
    );
    const disposition = String(response.headers['content-disposition'] ?? '');
    const matchedFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    return {
      buffer: Buffer.from(response.data),
      contentType: String(response.headers['content-type'] ?? 'application/pdf'),
      filename: matchedFilename ?? `${params.filename}.pdf`,
    };
  }
}
