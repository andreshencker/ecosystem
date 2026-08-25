import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface SendEventInput {
  organizationId: string;
  organizationName: string;
  event: string;
  email: string;
  payload?: Record<string, unknown>;
}

/**
 * Grapifly's outbound leg of the internal-communication mechanism — the
 * counterpart to Relay's GlobalAuthGuard x-grapifly-service-secret branch.
 * Every call carries the specific organizationId the action belongs to
 * (never an implicit "active" default), so Relay can never resolve the
 * wrong company.
 *
 * Fire-and-forget by contract: callers must not await a business outcome
 * from this — a missing event in Relay's catalogue (404) or Relay being
 * unreachable must never break the caller's flow (invitation, etc.).
 */
@Injectable()
export class RelayNotificationService {
  private readonly logger = new Logger(RelayNotificationService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async sendEvent(input: SendEventInput): Promise<void> {
    const baseUrl = this.config.get<string>('RELAY_API_URL') ?? 'http://localhost:3001';
    const serviceSecret =
      this.config.get<string>('RELAY_SERVICE_SECRET') ??
      this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');

    if (!serviceSecret) {
      this.logger.warn(
        `[sendEvent] No RELAY_SERVICE_SECRET configured — skipping event="${input.event}" ` +
          `organizationId=${input.organizationId}`,
      );
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(
          `${baseUrl.replace(/\/$/, '')}/notifications/event`,
          {
            // companyId is required by Relay's DTO validation but never trusted —
            // GlobalAuthGuard always overrides it with the org resolved from the
            // service secret + x-grapifly-organization-id header.
            companyId: input.organizationId,
            event: input.event,
            email: input.email,
            variables: input.payload ?? {},
          },
          {
            // Fire-and-forget — this never blocks a caller's response (see
            // OrganizationsService.invite(), which does not await sendEvent()).
            // A generous timeout only affects how long this background call
            // waits before giving up; real SMTP sends routinely take several
            // seconds, so a tight timeout would misreport a successful send
            // as a delivery failure.
            timeout: 15000,
            headers: {
              'x-grapifly-service-secret': serviceSecret,
              'x-grapifly-organization-id': input.organizationId,
              'x-grapifly-organization-name': input.organizationName,
            },
          },
        ),
      );
      this.logger.log(
        `[sendEvent] delivered event="${input.event}" organizationId=${input.organizationId}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[sendEvent] event="${input.event}" organizationId=${input.organizationId} ` +
          `could not be delivered — ${error?.response?.status ?? error?.message ?? 'unknown error'}`,
      );
    }
  }
}
