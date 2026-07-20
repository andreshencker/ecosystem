import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CommunicationsClientService } from '../client/communications-client.service';
import { CommunicationConnectionService } from '../connection/communication-connection.service';
import { COMMUNICATION_CATALOG } from '../catalog/communication-catalog';
import { assertCatalogValid } from '../catalog/communication-catalog.validator';
import type {
  CatalogDomain,
  CatalogEvent,
} from '../catalog/communication-catalog.types';

/**
 * CommunicationCatalogProvisioningService
 *
 * Responsible for pushing the COMMUNICATION_CATALOG to Communications App.
 * All operations are idempotent: check before create, skip if already exists.
 *
 * PLATFORM provisioning: uses COMMUNICATION_API_KEY, runs at Business App startup.
 * BUSINESS provisioning: uses each Business's integration token, runs at token-save time.
 */
@Injectable()
export class CommunicationCatalogProvisioningService {
  private readonly logger = new Logger(
    CommunicationCatalogProvisioningService.name,
  );

  constructor(
    private readonly commClient: CommunicationsClientService,
    private readonly connectionService: CommunicationConnectionService,
    private readonly config: ConfigService,
  ) {}

  private get adminApiKey(): string {
    return this.config.get<string>('COMMUNICATION_API_KEY') ?? '';
  }

  // ─── Platform provisioning ────────────────────────────────────────────────

  /**
   * Provision all platform domains and events in the COMMUNICATION_CATALOG.
   * Called at Business App startup via onApplicationBootstrap.
   * Idempotent — safe to run on every restart.
   */
  async provisionPlatformCatalog(): Promise<void> {
    this.logger.log('[provisionPlatformCatalog] Starting...');

    try {
      assertCatalogValid(COMMUNICATION_CATALOG);
    } catch (err: any) {
      this.logger.error(
        `[provisionPlatformCatalog] Catalog invalid: ${err.message}`,
      );
      return;
    }

    const apiKey = this.adminApiKey;
    if (!apiKey) {
      this.logger.error(
        '[provisionPlatformCatalog] SKIPPED — COMMUNICATION_API_KEY env var is not set. ' +
          'Set it to the admin API key of Communications App.',
      );
      return;
    }

    const conn =
      await this.connectionService.getCommunicationConnectionForContext(
        'platform',
      );
    if (!conn) {
      this.logger.warn(
        '[provisionPlatformCatalog] Platform company has no active CommunicationConnection — ' +
          'platform event catalog provisioning skipped. ' +
          'Configure the integration token in Settings → Communications to enable notifications.',
      );
      return;
    }

    const remoteCompanyId = conn.communicationCompanyId;

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const domain of COMMUNICATION_CATALOG.platform) {
      const result = await this.provisionDomain(
        remoteCompanyId,
        apiKey,
        domain,
        'platform',
      );
      if (result.authFailed) {
        this.logger.error(
          '[provisionPlatformCatalog] SKIPPED — cannot provision Communications catalog because authentication failed. ' +
            'The platform integration token is invalid or missing. Fix the token in Settings → Integrations → Communications.',
        );
        return;
      }
      created += result.created;
      skipped += result.skipped;
      errors += result.errors;
    }

    this.logger.log(
      `[provisionPlatformCatalog] Done — created=${created} skipped=${skipped} errors=${errors}`,
    );
  }

  // ─── Business provisioning ────────────────────────────────────────────────

  /**
   * Provision all business domains and events for a specific Business.
   * Called when a Business saves its integration token.
   * Idempotent — safe to call multiple times.
   */
  async provisionBusinessCatalog(businessId: string): Promise<void> {
    if (COMMUNICATION_CATALOG.business.length === 0) {
      this.logger.log(
        `[provisionBusinessCatalog] No business domains defined yet — nothing to provision for businessId=${businessId}`,
      );
      return;
    }

    const apiKey = this.adminApiKey;
    if (!apiKey) {
      this.logger.error(
        `[provisionBusinessCatalog] SKIPPED businessId=${businessId} — COMMUNICATION_API_KEY env var is not set.`,
      );
      return;
    }

    const conn =
      await this.connectionService.getCommunicationConnectionForContext(
        'business',
        businessId,
      );
    if (!conn) {
      this.logger.warn(
        `[provisionBusinessCatalog] No active CommunicationConnection for businessId=${businessId} — skipping.`,
      );
      return;
    }

    try {
      assertCatalogValid(COMMUNICATION_CATALOG);
    } catch (err: any) {
      this.logger.error(
        `[provisionBusinessCatalog] Catalog invalid: ${err.message}`,
      );
      return;
    }

    const remoteCompanyId = conn.communicationCompanyId;

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const domain of COMMUNICATION_CATALOG.business) {
      const result = await this.provisionDomain(
        remoteCompanyId,
        apiKey,
        domain,
        'business',
      );
      if (result.authFailed) {
        this.logger.error(
          `[provisionBusinessCatalog] SKIPPED businessId=${businessId} — cannot provision Communications catalog because authentication failed. ` +
            'The business integration token is invalid or expired.',
        );
        return;
      }
      created += result.created;
      skipped += result.skipped;
      errors += result.errors;
    }

    this.logger.log(
      `[provisionBusinessCatalog] Done businessId=${businessId} — created=${created} skipped=${skipped} errors=${errors}`,
    );
  }

  /**
   * Sync catalog for a single Business that already has an active connection.
   * Creates only missing domains/events. Never overwrites existing ones.
   */
  async syncBusinessCatalog(businessId: string): Promise<void> {
    return this.provisionBusinessCatalog(businessId);
  }

  /**
   * Sync catalog for all Businesses that have an active CommunicationConnection.
   * Used when a new event is added to COMMUNICATION_CATALOG.business.
   */
  async syncAllBusinessesWithActiveConnection(): Promise<void> {
    this.logger.log('[syncAllBusinessesWithActiveConnection] Starting...');

    const connections =
      await this.connectionService.findAllActiveBusinessConnections();
    this.logger.log(
      `[syncAllBusinessesWithActiveConnection] Found ${connections.length} active connections`,
    );

    let succeeded = 0;
    let failed = 0;

    for (const conn of connections) {
      try {
        await this.provisionBusinessCatalog(conn.businessId);
        succeeded++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[syncAllBusinessesWithActiveConnection] Failed for businessId=${conn.businessId}: ${msg}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `[syncAllBusinessesWithActiveConnection] Done — succeeded=${succeeded} failed=${failed}`,
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async provisionDomain(
    remoteCompanyId: string,
    apiKey: string,
    domain: CatalogDomain,
    scope: 'platform' | 'business',
  ): Promise<{ created: number; skipped: number; errors: number; authFailed?: boolean }> {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    // Check if domain already exists.
    // null means the API returned 401/403 — abort immediately, do not attempt any writes.
    const existingDomains = await this.commClient.getDomains(
      remoteCompanyId,
      apiKey,
    );
    if (existingDomains === null) {
      return { created: 0, skipped: 0, errors: 0, authFailed: true };
    }
    const existingDomain = existingDomains.find(
      (d: Record<string, unknown>) => d['domainKey'] === domain.domainKey,
    );

    let domainId: string;

    if (existingDomain) {
      domainId = String(existingDomain['_id'] ?? existingDomain['id'] ?? '');
      this.logger.log(
        `[provisionDomain] SKIP domain="${domain.domainKey}" already exists id=${domainId}`,
      );
      skipped++;
    } else {
      this.logger.log(`[provisionDomain] CREATE domain="${domain.domainKey}"`);
      const newId = await this.commClient.createDomain(
        remoteCompanyId,
        apiKey,
        domain,
      );
      if (!newId) {
        this.logger.error(
          `[provisionDomain] FAILED to create domain="${domain.domainKey}"`,
        );
        errors++;
        return { created, skipped, errors };
      }
      domainId = newId;
      created++;
      this.logger.log(
        `[provisionDomain] CREATED domain="${domain.domainKey}" id=${domainId}`,
      );
    }

    // Provision events under this domain.
    const existingEvents = await this.commClient.getEvents(domainId, apiKey);
    const existingKeys = new Set(
      existingEvents.map((e: Record<string, unknown>) => e['eventKey']),
    );

    for (const event of domain.events) {
      if (existingKeys.has(event.eventKey)) {
        this.logger.log(
          `[provisionDomain] SKIP event="${domain.domainKey}.${event.eventKey}" already exists`,
        );
        skipped++;
        continue;
      }

      this.logger.log(
        `[provisionDomain] CREATE event="${domain.domainKey}.${event.eventKey}"`,
      );
      try {
        await this.commClient.createEvent(domainId, apiKey, event, scope);
        created++;
        this.logger.log(
          `[provisionDomain] CREATED event="${domain.domainKey}.${event.eventKey}"`,
        );
      } catch {
        this.logger.error(
          `[provisionDomain] FAILED event="${domain.domainKey}.${event.eventKey}"`,
        );
        errors++;
      }
    }

    return { created, skipped, errors };
  }
}
