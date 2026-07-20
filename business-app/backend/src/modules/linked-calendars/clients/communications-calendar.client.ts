import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CommunicationConnectionService } from '../../../integrations/communications/connection/communication-connection.service';
import type { AvailableCalendarAccountResponseDto } from '../dto/available-calendar-account-response.dto';
import type { AvailableCalendarResponseDto } from '../dto/available-calendar-response.dto';

/** Shape returned by GET /calendar/connections (Communications App). */
interface CommCalendarConnection {
  id: string;
  companyChannelProviderId: string;
  tag: string;
  isActive: boolean;
  displayIdentifier?: string;
  companyChannelProvider?: {
    id: string;
    companyId: string;
    isActive: boolean;
    provider?: {
      id: string;
      providerKey: string;
      connectionType: string;
      displayName?: string;
    };
    channel?: {
      id: string;
      channelKey: string;
      displayName?: string;
    };
  };
}

/** Shape of each item in GET /calendar/connections/:credId/calendars (Communications App). */
interface CommCalendarInfo {
  id: string;
  name: string;
  description?: string;
  color?: string;
  timeZone?: string;
  isReadOnly: boolean;
  isPrimary: boolean;
}

/** Resolved connection context used within this client. */
interface CalendarCallContext {
  decryptedToken: string;
}

/**
 * CommunicationsCalendarClient
 *
 * Focused HTTP client for Business App → Communications App calendar API calls.
 *
 * Rules:
 * - Reuses existing CommunicationConnectionService for token resolution.
 * - Sends the integration token as x-api-key (Communications resolves companyId from it).
 * - Never logs the full token — only the first 12 characters for debugging.
 * - Never stores, returns, or passes through credentials.
 * - Contains only network I/O — no Mongoose writes, no Business logic.
 */
@Injectable()
export class CommunicationsCalendarClient {
  private readonly logger = new Logger(CommunicationsCalendarClient.name);

  constructor(
    private readonly connections: CommunicationConnectionService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>('COMMUNICATION_API_URL') ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  // ─── Token resolution ─────────────────────────────────────────────────────

  /**
   * Resolves the Business's Communications integration token.
   * Throws ServiceUnavailableException when no active connection exists so the
   * caller can return a clear 503 rather than a generic 500.
   */
  async resolveConnection(businessId: string): Promise<CalendarCallContext> {
    const conn = await this.connections.getCommunicationConnectionForContext(
      'business',
      businessId,
    );
    if (!conn) {
      throw new ServiceUnavailableException(
        'Communications integration is not configured for this Business. ' +
        'Go to Settings → Communications to connect your integration token.',
      );
    }
    return { decryptedToken: conn.decryptedToken };
  }

  // ─── API calls ────────────────────────────────────────────────────────────

  /**
   * List active calendar accounts (connections) from Communications App.
   * Filters to the "calendar" channel only; skips email/sms/storage credentials.
   */
  async listCalendarAccounts(businessId: string): Promise<AvailableCalendarAccountResponseDto[]> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections`;

    this.logger.log(
      `[listCalendarAccounts] businessId=${businessId} token=${ctx.decryptedToken.slice(0, 12)}...`,
    );

    try {
      const res = await firstValueFrom(
        this.http.get<{ data: CommCalendarConnection[]; total: number }>(url, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 10_000,
        }),
      );

      const connections: CommCalendarConnection[] = res.data?.data ?? [];

      return connections
        .filter((c) => c.isActive)
        .map((c): AvailableCalendarAccountResponseDto => {
          const ccp    = c.companyChannelProvider;
          const prov   = ccp?.provider;
          const chan    = ccp?.channel;

          return {
            connectionId:        c.id,
            providerKey:         prov?.providerKey         ?? 'unknown',
            providerDisplayName: prov?.displayName         ?? chan?.displayName ?? prov?.providerKey ?? 'Calendar',
            accountIdentifier:   c.displayIdentifier       ?? c.id,
            isActive:            c.isActive,
          };
        });
    } catch (err: any) {
      this.logger.error(
        `[listCalendarAccounts] Failed for businessId=${businessId}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not retrieve calendar accounts from Communications: ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * List calendars for a specific connection from Communications App.
   * Returns raw calendar metadata — no isLinked flag (that is added by the service).
   */
  async listCalendars(
    businessId: string,
    connectionId: string,
  ): Promise<Array<Pick<AvailableCalendarResponseDto, 'externalCalendarId' | 'calendarName' | 'calendarDescription' | 'timezone' | 'accessRole' | 'isPrimary'>>> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars`;

    this.logger.log(
      `[listCalendars] businessId=${businessId} connectionId=${connectionId} token=${ctx.decryptedToken.slice(0, 12)}...`,
    );

    try {
      const res = await firstValueFrom(
        this.http.get<{ data: CommCalendarInfo[] }>(url, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 10_000,
        }),
      );

      const calendars: CommCalendarInfo[] = res.data?.data ?? [];

      return calendars.map((cal) => ({
        externalCalendarId:  cal.id,
        calendarName:        cal.name,
        calendarDescription: cal.description ?? null,
        timezone:            cal.timeZone    ?? null,
        accessRole:          cal.isReadOnly  ? 'read-only' : 'read-write',
        isPrimary:           cal.isPrimary   ?? false,
      }));
    } catch (err: any) {
      this.logger.error(
        `[listCalendars] Failed connectionId=${connectionId} businessId=${businessId}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not retrieve calendars from Communications: ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetch the account metadata for a single connectionId.
   * Used during link validation to get the authoritative account info.
   */
  async getCalendarAccount(
    businessId: string,
    connectionId: string,
  ): Promise<AvailableCalendarAccountResponseDto | null> {
    const accounts = await this.listCalendarAccounts(businessId);
    return accounts.find((a) => a.connectionId === connectionId) ?? null;
  }

  /**
   * Create a new calendar in the provider via Communications App.
   * Returns the minimal metadata needed to immediately link it.
   */
  async createCalendar(
    businessId: string,
    connectionId: string,
    body: { name: string; description?: string },
  ): Promise<{
    externalCalendarId: string;
    calendarName:       string;
    calendarDescription: string | null;
    timezone:            string | null;
    accessRole:          string;
    isPrimary:           boolean;
  }> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars`;

    this.logger.log(
      `[createCalendar] businessId=${businessId} connectionId=${connectionId} name="${body.name}"`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<{ data?: CommCalendarInfo; id?: string; name?: string }>(url, body, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 15_000,
        }),
      );

      // Communications may return { data: CalendarInfo } or the object directly
      const raw: CommCalendarInfo = (res.data as any)?.data ?? res.data as any;

      return {
        externalCalendarId:  raw.id,
        calendarName:        raw.name,
        calendarDescription: raw.description ?? null,
        timezone:            raw.timeZone    ?? null,
        accessRole:          raw.isReadOnly  ? 'read-only' : 'read-write',
        isPrimary:           raw.isPrimary   ?? false,
      };
    } catch (err: any) {
      this.logger.error(
        `[createCalendar] Failed connectionId=${connectionId} businessId=${businessId}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not create calendar in provider: ${err?.response?.data?.message ?? err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Subscribe a provider account to an external iCal/ICS URL via Communications App.
   * The provider creates a local subscription calendar from the URL.
   *
   * Provider support varies: iCloud and Google Calendar support this; CalDAV servers
   * may not. If unsupported, Communications returns a 422 which maps to a
   * BadRequestException upstream.
   */
  async subscribeToUrl(
    businessId: string,
    connectionId: string,
    body: { url: string; name?: string; description?: string },
  ): Promise<{
    externalCalendarId:  string;
    calendarName:        string;
    calendarDescription: string | null;
    timezone:            string | null;
    accessRole:          string;
    isPrimary:           boolean;
  }> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/subscribe`;

    this.logger.log(
      `[subscribeToUrl] businessId=${businessId} connectionId=${connectionId} url="${body.url.slice(0, 60)}..."`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<{ data?: CommCalendarInfo }>(url, body, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 20_000,
        }),
      );

      const raw: CommCalendarInfo = (res.data as any)?.data ?? res.data as any;

      return {
        externalCalendarId:  raw.id,
        calendarName:        raw.name,
        calendarDescription: raw.description ?? null,
        timezone:            raw.timeZone    ?? null,
        accessRole:          raw.isReadOnly  ? 'read-only' : 'read-write',
        isPrimary:           raw.isPrimary   ?? false,
      };
    } catch (err: any) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message ?? err?.message ?? 'Unknown error';

      this.logger.error(
        `[subscribeToUrl] Failed connectionId=${connectionId} HTTP=${status}: ${message}`,
      );

      if (status === 422) {
        // Provider confirmed it cannot perform this operation (capability limitation).
        // Callers detect 422 specifically to trigger the assisted-setup flow.
        throw new UnprocessableEntityException(message);
      }

      if (status === 400) {
        // Actual bad request (e.g. missing URL field) — propagate as 400.
        throw new BadRequestException(message);
      }

      throw new ServiceUnavailableException(
        `Could not subscribe to calendar URL: ${message}`,
      );
    }
  }

  /**
   * Fetch events for a specific calendar from Communications App.
   * Used by the sync engine to import calendar events into Shifts.
   *
   * @param businessId   Local Business App company ID.
   * @param connectionId Provider credential ID (connectionId on LinkedCalendar).
   * @param calendarId   External calendar ID (externalCalendarId on LinkedCalendar) — URL-encoded.
   * @param params       Optional date-range filter.
   */
  async listCalendarEvents(
    businessId: string,
    connectionId: string,
    calendarId: string,
    params?: { from?: string; to?: string; limit?: number },
  ): Promise<CommCalendarEventInfo[]> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events`;

    this.logger.log(
      `[listCalendarEvents] businessId=${businessId} connectionId=${connectionId} ` +
      `calendarId=${calendarId.slice(0, 40)} from=${params?.from ?? 'default'} to=${params?.to ?? 'default'}`,
    );

    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { items: CommCalendarEventInfo[] }; items?: CommCalendarEventInfo[] }>(
          url,
          {
            headers: { 'x-api-key': ctx.decryptedToken },
            params: {
              ...(params?.from  ? { from:  params.from  } : {}),
              ...(params?.to    ? { to:    params.to    } : {}),
              ...(params?.limit ? { limit: params.limit } : {}),
            },
            timeout: 30_000, // events can be numerous — generous timeout
          },
        ),
      );

      // Communications returns either { data: { items: [] } } or { items: [] }
      const raw = res.data;
      const items: CommCalendarEventInfo[] =
        (raw as any)?.data?.items ??
        (raw as any)?.items        ??
        [];

      this.logger.log(
        `[listCalendarEvents] received ${items.length} events for calendarId=${calendarId.slice(0, 40)}`,
      );

      return items;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(
        `[listCalendarEvents] Failed connectionId=${connectionId} calendarId=${calendarId.slice(0, 40)} ` +
        `HTTP=${status ?? 'none'}: ${err?.message}`,
      );
      // Re-throw as ServiceUnavailableException so the sync engine can record the failure.
      throw new ServiceUnavailableException(
        `Could not retrieve events from Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new event in an external calendar through Communications App.
   * Returns the created event's identity (id = occurrenceId, uid = series UID).
   */
  async createCalendarEvent(
    businessId: string,
    connectionId: string,
    calendarId: string,
    event: CommCreateEventPayload,
  ): Promise<CommCalendarEventInfo> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events`;

    this.logger.log(
      `[createCalendarEvent] businessId=${businessId} connectionId=${connectionId} ` +
      `calendarId=${calendarId.slice(0, 40)} title="${event.title}"`,
    );

    try {
      const res = await firstValueFrom(
        this.http.post<{ data?: CommCalendarEventInfo } | CommCalendarEventInfo>(url, event, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 15_000,
        }),
      );
      const raw = (res.data as any)?.data ?? res.data;
      return raw as CommCalendarEventInfo;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(
        `[createCalendarEvent] Failed connectionId=${connectionId} HTTP=${status ?? 'none'}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not create calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing event in an external calendar through Communications App.
   * Uses the externalOccurrenceId / externalEventId as the provider event identifier.
   */
  async updateCalendarEvent(
    businessId: string,
    connectionId: string,
    calendarId: string,
    eventId: string,
    event: CommUpdateEventPayload,
  ): Promise<CommCalendarEventInfo> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

    this.logger.log(
      `[updateCalendarEvent] businessId=${businessId} connectionId=${connectionId} eventId=${eventId.slice(0, 40)}`,
    );

    try {
      const res = await firstValueFrom(
        this.http.patch<{ data?: CommCalendarEventInfo } | CommCalendarEventInfo>(url, event, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 15_000,
        }),
      );
      const raw = (res.data as any)?.data ?? res.data;
      return raw as CommCalendarEventInfo;
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(
        `[updateCalendarEvent] Failed connectionId=${connectionId} eventId=${eventId.slice(0, 40)} HTTP=${status ?? 'none'}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not update calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete an event from an external calendar through Communications App.
   * Provider 404 is treated as idempotent success — event was already removed.
   * Returns true on success or 404, throws on other errors.
   */
  async deleteCalendarEvent(
    businessId: string,
    connectionId: string,
    calendarId: string,
    eventId: string,
  ): Promise<boolean> {
    const ctx = await this.resolveConnection(businessId);
    const url  = `${this.baseUrl}/calendar/connections/${encodeURIComponent(connectionId)}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

    this.logger.log(
      `[deleteCalendarEvent] businessId=${businessId} connectionId=${connectionId} eventId=${eventId.slice(0, 40)}`,
    );

    try {
      await firstValueFrom(
        this.http.delete(url, {
          headers: { 'x-api-key': ctx.decryptedToken },
          timeout: 15_000,
        }),
      );
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        // Event already gone from provider — idempotent success
        this.logger.log(`[deleteCalendarEvent] eventId=${eventId.slice(0, 40)} already absent in provider (404) — treating as success`);
        return true;
      }
      this.logger.error(
        `[deleteCalendarEvent] Failed connectionId=${connectionId} eventId=${eventId.slice(0, 40)} HTTP=${status ?? 'none'}: ${err?.message}`,
      );
      throw new ServiceUnavailableException(
        `Could not delete calendar event via Communications (HTTP ${status ?? 'err'}): ${err?.message ?? 'Unknown error'}`,
      );
    }
  }
}

// ─── Payload types for event mutation ────────────────────────────────────────

export interface CommCreateEventPayload {
  title: string;
  startAt: string;   // ISO 8601
  endAt: string;     // ISO 8601
  description?: string;
  location?: string;
  allDay?: boolean;
  timeZone?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

export interface CommUpdateEventPayload {
  title?: string;
  startAt?: string;
  endAt?: string;
  description?: string;
  location?: string;
  allDay?: boolean;
  timeZone?: string;
}

/** Normalized calendar event as returned by Communications. */
export interface CommCalendarEventInfo {
  id:             string;    // occurrenceId (uid_startISO for recurring)
  calendarId:     string;
  title:          string;
  description?:   string;
  location?:      string;
  startAt:        string;   // ISO 8601
  endAt:          string;   // ISO 8601
  allDay:         boolean;
  timeZone?:      string;
  status?:        'confirmed' | 'tentative' | 'cancelled';
  attendees?:     Array<{ email: string; name?: string }>;
  organizerEmail?: string;
  uid?:           string;   // original iCal UID (shared by recurring occurrences)
  raw?:           Record<string, any>;
}
