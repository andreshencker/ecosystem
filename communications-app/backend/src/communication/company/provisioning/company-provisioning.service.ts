import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CompanyThemeService } from '../company-theme/company-theme.service';
import { LayoutTemplatesService } from '../../notifications/template/layout-templates/layout-templates.service';
import { DomainCatalogueService } from '../../notifications/events/domain-catalogue/domain-catalogue.service';
import { EventCatalogueService } from '../../notifications/events/event-catalogue/event-catalogue.service';

import {
  Company,
  CompanyDocument,
} from '../company-info/schemas/company.schema';
import {
  DomainCatalogue,
  DomainCatalogueDocument,
} from '../../notifications/events/domain-catalogue/schemas/domain-catalogue.schema';
import {
  EventCatalogue,
  EventCatalogueDocument,
} from '../../notifications/events/event-catalogue/schemas/event-catalogue.schema';

import { ProvisioningReportDto } from './dto/provisioning-report.dto';
import { DEFAULT_THEME } from './constants/default-theme.constant';
import {
  DEFAULT_EMAIL_LAYOUT_HTML,
  DEFAULT_EMAIL_LAYOUT_KEY,
  DEFAULT_EMAIL_LAYOUT_NAME,
  DEFAULT_EMAIL_LAYOUT_OPTIONAL_VARIABLES,
  DEFAULT_EMAIL_LAYOUT_REQUIRED_VARIABLES,
} from './constants/default-email-layout.constant';
import {
  DEFAULT_PDF_LAYOUT_HTML,
  DEFAULT_PDF_LAYOUT_KEY,
  DEFAULT_PDF_LAYOUT_NAME,
  DEFAULT_PDF_LAYOUT_OPTIONAL_VARIABLES,
  DEFAULT_PDF_LAYOUT_REQUIRED_VARIABLES,
} from './constants/default-pdf-layout.constant';
import { DEFAULT_PLATFORM_EVENTS } from './constants/default-events.constant';
import { DEFAULT_NOTIFICATIONS_EVENTS } from './constants/default-notifications-events.constant';

export interface ProvisionCompanyOptions {
  /**
   * Pass `true` when provisioning the Platform Company (isPlatformCompany: true).
   * The modules company receives the full catalogue: theme + layouts + security
   * domain + all default modules events.
   *
   * Tenant companies (default: false) receive only the branding assets:
   * theme + email layout + pdf layout.  No domains, no events.
   */
  isPlatformCompany?: boolean;
}

@Injectable()
export class CompanyProvisioningService {
  private readonly logger = new Logger(CompanyProvisioningService.name);

  constructor(
    private readonly themeService: CompanyThemeService,
    private readonly layoutService: LayoutTemplatesService,
    private readonly domainService: DomainCatalogueService,
    private readonly eventService: EventCatalogueService,

    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,

    @InjectModel(DomainCatalogue.name)
    private readonly domainModel: Model<DomainCatalogueDocument>,

    @InjectModel(EventCatalogue.name)
    private readonly eventModel: Model<EventCatalogueDocument>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  async provisionCompany(
    companyId: string,
    options: ProvisionCompanyOptions = {},
  ): Promise<ProvisioningReportDto> {
    const isPlatform = options.isPlatformCompany === true;

    const report: ProvisioningReportDto = {
      companyId,
      companyType: isPlatform ? 'platform' : 'tenant',
      created: {
        theme: false,
        emailLayout: false,
        pdfLayout: false,
        securityDomain: false,
        events: [],
      },
      skipped: {
        theme: false,
        emailLayout: false,
        pdfLayout: false,
        securityDomain: false,
        events: [],
      },
      errors: [],
    };

    // ── Step 1: Default Theme (all companies) ──────────────────────────────────
    const themeId = await this.ensureDefaultTheme(companyId, report);
    if (!themeId) {
      this.logger.error(
        `[provision:${companyId}] Cannot continue without theme`,
      );
      return report;
    }

    // ── Steps 2 & 3: Layout Templates (all companies) ─────────────────────────
    await this.ensureEmailLayout(themeId, report);
    await this.ensurePdfLayout(themeId, report);

    if (!isPlatform) {
      // Tenant companies receive only branding assets. Stop here.
      this.logger.log(
        `[provision:tenant:${companyId}] done — theme + layouts provisioned. No domains or events for tenants.`,
      );
      return report;
    }

    // ── Step 4: Security Domain (modules company only) ────────────────────────
    const domainId = await this.ensureSecurityDomain(companyId, report);
    if (!domainId) {
      this.logger.error(
        `[provision:platform:${companyId}] Cannot continue without security domain`,
      );
      return report;
    }

    // ── Step 5: Default Platform Events (modules company only) ───────────────
    await this.ensureDefaultEvents(domainId, report);

    // ── Step 6: Notifications Domain + its events (modules company only) ────
    const notificationsDomainId = await this.ensureNotificationsDomain(
      companyId,
      report,
    );
    if (notificationsDomainId) {
      await this.ensureNotificationsEvents(notificationsDomainId, report);
    }

    this.logger.log(
      `[provision:platform:${companyId}] done — created=${JSON.stringify(report.created)} skipped=${JSON.stringify(report.skipped)} errors=${report.errors.length}`,
    );

    return report;
  }

  /**
   * One-time migration / idempotent cleanup:
   * Deletes ALL domain_catalogue and event_catalogue records that belong to
   * tenant companies (i.e. any company that is NOT the modules company).
   *
   * Safe to run multiple times. Returns counts of deleted documents.
   *
   * Called automatically on application bootstrap (Phase 4) so that historical
   * tenant catalogue data created before the provisioning architecture refactor
   * is removed on the next restart.
   */
  async cleanupTenantCatalogues(): Promise<{
    deletedDomains: number;
    deletedEvents: number;
  }> {
    const platform = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean();

    if (!platform) {
      this.logger.warn(
        '[cleanup] Platform company not found — skipping tenant catalogue cleanup.',
      );
      return { deletedDomains: 0, deletedEvents: 0 };
    }

    const platformId = (platform as any)._id as Types.ObjectId;

    // Find tenant domain IDs — skip domains marked isSystem:true (explicitly provisioned).
    const tenantDomainIds = await this.domainModel
      .find({ companyId: { $ne: platformId }, isSystem: { $ne: true } })
      .distinct('_id');

    if (tenantDomainIds.length === 0) {
      this.logger.log(
        '[cleanup] No tenant domains found — catalogue already clean.',
      );
      return { deletedDomains: 0, deletedEvents: 0 };
    }

    this.logger.log(
      `[cleanup] Found ${tenantDomainIds.length} tenant domain(s) to remove. Deleting linked events first…`,
    );

    // Delete events belonging to those domains before removing the domains.
    const { deletedCount: deletedEvents = 0 } =
      await this.eventModel.deleteMany({
        domainCatalogueId: { $in: tenantDomainIds },
      });

    const { deletedCount: deletedDomains = 0 } =
      await this.domainModel.deleteMany({
        companyId: { $ne: platformId },
        isSystem: { $ne: true },
      });

    this.logger.log(
      `[cleanup] Done — removed ${deletedEvents} event(s) and ${deletedDomains} domain(s) from tenant companies.`,
    );

    return { deletedDomains, deletedEvents };
  }

  /**
   * Provisions the security domain and company-scoped security events for a
   * tenant company.  Idempotent — safe to run on every restart.
   *
   * Creates only the events whose eventKey starts with 'company_' (i.e. those
   * designed to be triggered in the context of a tenant).  Platform-only events
   * (platform_admin_invitation, platform_forgot_password, platform_password_changed)
   * are intentionally excluded.
   *
   * The security domain is created with isSystem:true so that cleanupTenantCatalogues()
   * never removes it.
   */
  async provisionTenantSecurityEvents(
    companyId: string,
  ): Promise<ProvisioningReportDto> {
    const report: ProvisioningReportDto = {
      companyId,
      companyType: 'tenant',
      created: {
        theme: false,
        emailLayout: false,
        pdfLayout: false,
        securityDomain: false,
        events: [],
      },
      skipped: {
        theme: false,
        emailLayout: false,
        pdfLayout: false,
        securityDomain: false,
        events: [],
      },
      errors: [],
    };

    const domainId = await this.ensureTenantSecurityDomain(companyId, report);
    if (!domainId) {
      this.logger.error(
        `[provisionTenant:${companyId}] Cannot continue without security domain`,
      );
      return report;
    }

    const tenantEvents = DEFAULT_PLATFORM_EVENTS.filter((e) =>
      e.eventKey.startsWith('company_'),
    );
    for (const eventDef of tenantEvents) {
      await this.ensureTenantSecurityEvent(domainId, eventDef, report);
    }

    this.logger.log(
      `[provisionTenant:${companyId}] done — created=${JSON.stringify(report.created.events)} skipped=${JSON.stringify(report.skipped.events)} errors=${report.errors.length}`,
    );

    return report;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async ensureDefaultTheme(
    companyId: string,
    report: ProvisioningReportDto,
  ): Promise<string | null> {
    try {
      const existing = await this.themeService.getDefaultByCompanyId(companyId);
      if (existing) {
        report.skipped.theme = true;
        return existing.id;
      }

      const created = await this.themeService.create(companyId, DEFAULT_THEME);
      report.created.theme = true;
      return created.id;
    } catch (err: any) {
      if (this.isDuplicateKey(err)) {
        report.skipped.theme = true;
        const existing = await this.themeService
          .getDefaultByCompanyId(companyId)
          .catch(() => null);
        return existing?.id ?? null;
      }
      report.errors.push({
        asset: 'theme',
        message: err?.message ?? String(err),
      });
      return null;
    }
  }

  private async ensureEmailLayout(
    themeId: string,
    report: ProvisioningReportDto,
  ): Promise<void> {
    try {
      await this.layoutService.getByKey({
        companyThemeId: themeId,
        templateType: 'email',
        key: DEFAULT_EMAIL_LAYOUT_KEY,
      });
      report.skipped.emailLayout = true;
    } catch (err: any) {
      if (this.isNotFound(err)) {
        try {
          await this.layoutService.create({
            companyThemeId: themeId,
            templateType: 'email',
            key: DEFAULT_EMAIL_LAYOUT_KEY,
            name: DEFAULT_EMAIL_LAYOUT_NAME,
            html: DEFAULT_EMAIL_LAYOUT_HTML,
            css: '',
            requiredVariables: DEFAULT_EMAIL_LAYOUT_REQUIRED_VARIABLES,
            optionalVariables: DEFAULT_EMAIL_LAYOUT_OPTIONAL_VARIABLES,
            isDefault: true,
            isActive: true,
          });
          report.created.emailLayout = true;
        } catch (createErr: any) {
          if (this.isDuplicateKey(createErr)) {
            report.skipped.emailLayout = true;
          } else {
            report.errors.push({
              asset: 'emailLayout',
              message: createErr?.message ?? String(createErr),
            });
          }
        }
      } else {
        report.errors.push({
          asset: 'emailLayout',
          message: err?.message ?? String(err),
        });
      }
    }
  }

  private async ensurePdfLayout(
    themeId: string,
    report: ProvisioningReportDto,
  ): Promise<void> {
    try {
      await this.layoutService.getByKey({
        companyThemeId: themeId,
        templateType: 'pdf',
        key: DEFAULT_PDF_LAYOUT_KEY,
      });
      report.skipped.pdfLayout = true;
    } catch (err: any) {
      if (this.isNotFound(err)) {
        try {
          await this.layoutService.create({
            companyThemeId: themeId,
            templateType: 'pdf',
            key: DEFAULT_PDF_LAYOUT_KEY,
            name: DEFAULT_PDF_LAYOUT_NAME,
            html: DEFAULT_PDF_LAYOUT_HTML,
            css: '',
            requiredVariables: DEFAULT_PDF_LAYOUT_REQUIRED_VARIABLES,
            optionalVariables: DEFAULT_PDF_LAYOUT_OPTIONAL_VARIABLES,
            isDefault: true,
            isActive: true,
          });
          report.created.pdfLayout = true;
        } catch (createErr: any) {
          if (this.isDuplicateKey(createErr)) {
            report.skipped.pdfLayout = true;
          } else {
            report.errors.push({
              asset: 'pdfLayout',
              message: createErr?.message ?? String(createErr),
            });
          }
        }
      } else {
        report.errors.push({
          asset: 'pdfLayout',
          message: err?.message ?? String(err),
        });
      }
    }
  }

  private async ensureSecurityDomain(
    companyId: string,
    report: ProvisioningReportDto,
  ): Promise<string | null> {
    try {
      const existing = await this.domainService.getByCompanyAndDomainKey({
        companyId,
        domainKey: 'security',
      });
      report.skipped.securityDomain = true;
      return existing.id;
    } catch (notFoundErr: any) {
      if (!this.isNotFound(notFoundErr)) {
        report.errors.push({
          asset: 'securityDomain',
          message: notFoundErr?.message ?? String(notFoundErr),
        });
        return null;
      }

      try {
        const created = await this.domainService.create({
          companyId,
          domainKey: 'security',
          displayName: 'Security',
          domainCategory: 'system_notifications',
          isActive: true,
          channelsToUse: [],
        });
        report.created.securityDomain = true;
        return created.id;
      } catch (createErr: any) {
        if (this.isDuplicateKey(createErr)) {
          report.skipped.securityDomain = true;
          const existing = await this.domainService
            .getByCompanyAndDomainKey({ companyId, domainKey: 'security' })
            .catch(() => null);
          return existing?.id ?? null;
        }
        report.errors.push({
          asset: 'securityDomain',
          message: createErr?.message ?? String(createErr),
        });
        return null;
      }
    }
  }

  private async ensureDefaultEvents(
    domainId: string,
    report: ProvisioningReportDto,
  ): Promise<void> {
    for (const eventDef of DEFAULT_PLATFORM_EVENTS) {
      await this.ensureSingleEvent(domainId, eventDef, report);
    }
  }

  private async ensureSingleEvent(
    domainId: string,
    eventDef: (typeof DEFAULT_PLATFORM_EVENTS)[number],
    report: ProvisioningReportDto,
  ): Promise<void> {
    try {
      const existing = await this.eventService.findByDomainAndEventKeyOrNull(
        domainId,
        eventDef.eventKey,
      );
      if (existing) {
        report.skipped.events.push(eventDef.eventKey);
        return;
      }

      await this.eventService.create({
        domainCatalogueId: domainId,
        eventKey: eventDef.eventKey,
        displayName: eventDef.displayName,
        description: eventDef.description,
        eventType: eventDef.eventType,
        channelContent: eventDef.channelContent,
        isActive: true,
        scope: eventDef.scope,
        senderScope: eventDef.senderScope,
      } as any);
      report.created.events.push(eventDef.eventKey);
    } catch (err: any) {
      if (this.isDuplicateKey(err)) {
        report.skipped.events.push(eventDef.eventKey);
      } else {
        report.errors.push({
          asset: `event:${eventDef.eventKey}`,
          message: err?.message ?? String(err),
        });
      }
    }
  }

  /**
   * Ensures the 'notifications' domain exists for the modules company.
   * If it was created manually it is reused as-is; if missing it is created.
   * domainCategory matches the manually-created domain: 'system'.
   */
  private async ensureNotificationsDomain(
    companyId: string,
    report: ProvisioningReportDto,
  ): Promise<string | null> {
    try {
      const existing = await this.domainService.getByCompanyAndDomainKey({
        companyId,
        domainKey: 'notifications',
      });
      return existing.id;
    } catch (notFoundErr: any) {
      if (!this.isNotFound(notFoundErr)) {
        report.errors.push({
          asset: 'notificationsDomain',
          message: notFoundErr?.message ?? String(notFoundErr),
        });
        return null;
      }
      try {
        const created = await this.domainService.create({
          companyId,
          domainKey: 'notifications',
          displayName: 'System Notifications',
          domainCategory: 'system',
          isActive: true,
          channelsToUse: [],
        });
        this.logger.log(
          `[provision:platform:${companyId}] created notifications domain (${created.id})`,
        );
        return created.id;
      } catch (createErr: any) {
        if (this.isDuplicateKey(createErr)) {
          const existing = await this.domainService
            .getByCompanyAndDomainKey({ companyId, domainKey: 'notifications' })
            .catch(() => null);
          return existing?.id ?? null;
        }
        report.errors.push({
          asset: 'notificationsDomain',
          message: createErr?.message ?? String(createErr),
        });
        return null;
      }
    }
  }

  /** Ensures every DEFAULT_NOTIFICATIONS_EVENTS entry exists in the notifications domain. */
  private async ensureNotificationsEvents(
    domainId: string,
    report: ProvisioningReportDto,
  ): Promise<void> {
    for (const eventDef of DEFAULT_NOTIFICATIONS_EVENTS) {
      await this.ensureSingleEvent(domainId, eventDef as any, report);
    }
  }

  /**
   * Gets or creates the 'security' domain for a tenant company.
   * Sets isSystem:true so cleanupTenantCatalogues() never removes it.
   */
  private async ensureTenantSecurityDomain(
    companyId: string,
    report: ProvisioningReportDto,
  ): Promise<string | null> {
    try {
      const existing = await this.domainService.getByCompanyAndDomainKey({
        companyId,
        domainKey: 'security',
      });
      if (!(existing as any).isSystem) {
        await this.domainModel.findByIdAndUpdate(
          (existing as any)._id ?? (existing as any).id,
          { $set: { isSystem: true } },
        );
      }
      report.skipped.securityDomain = true;
      return existing.id;
    } catch (notFoundErr: any) {
      if (!this.isNotFound(notFoundErr)) {
        report.errors.push({
          asset: 'securityDomain',
          message: notFoundErr?.message ?? String(notFoundErr),
        });
        return null;
      }
      try {
        const created = await this.domainService.create({
          companyId,
          domainKey: 'security',
          displayName: 'Security',
          domainCategory: 'system_notifications',
          isActive: true,
          channelsToUse: [],
        });
        // Mark as system so cleanup never deletes it
        await this.domainModel.findByIdAndUpdate(
          (created as any)._id ?? (created as any).id,
          { $set: { isSystem: true } },
        );
        report.created.securityDomain = true;
        return created.id;
      } catch (createErr: any) {
        if (this.isDuplicateKey(createErr)) {
          report.skipped.securityDomain = true;
          const existing = await this.domainService
            .getByCompanyAndDomainKey({ companyId, domainKey: 'security' })
            .catch(() => null);
          return existing?.id ?? null;
        }
        report.errors.push({
          asset: 'securityDomain',
          message: createErr?.message ?? String(createErr),
        });
        return null;
      }
    }
  }

  /**
   * Creates a single security event for a tenant company, forcing scope and
   * senderScope to 'company' regardless of the source event definition.
   */
  private async ensureTenantSecurityEvent(
    domainId: string,
    eventDef: (typeof DEFAULT_PLATFORM_EVENTS)[number],
    report: ProvisioningReportDto,
  ): Promise<void> {
    try {
      const existing = await this.eventService.findByDomainAndEventKeyOrNull(
        domainId,
        eventDef.eventKey,
      );
      if (existing) {
        report.skipped.events.push(eventDef.eventKey);
        return;
      }
      await this.eventService.create({
        domainCatalogueId: domainId,
        eventKey: eventDef.eventKey,
        displayName: eventDef.displayName,
        description: eventDef.description,
        eventType: eventDef.eventType,
        channelContent: eventDef.channelContent,
        isActive: true,
        scope: 'company',
        senderScope: 'company',
      } as any);
      report.created.events.push(eventDef.eventKey);
    } catch (err: any) {
      if (this.isDuplicateKey(err)) {
        report.skipped.events.push(eventDef.eventKey);
      } else {
        report.errors.push({
          asset: `event:${eventDef.eventKey}`,
          message: err?.message ?? String(err),
        });
      }
    }
  }

  private isNotFound(err: any): boolean {
    return (
      err instanceof HttpException && err.getStatus() === HttpStatus.NOT_FOUND
    );
  }

  private isDuplicateKey(err: any): boolean {
    if (err?.code === 11000) return true;
    const msg = String(err?.message ?? '');
    return (
      msg.includes('already exists') ||
      msg.includes('Duplicate') ||
      msg.includes('duplicate key')
    );
  }
}
