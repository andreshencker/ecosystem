import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import { Company, CompanyDocument } from './schemas/company.schema';
import {
  CompanyTheme,
  CompanyThemeDocument,
} from '../company-theme/schemas/company-theme.schema';
import {
  LayoutTemplate,
  LayoutTemplateDocument,
} from '../../notifications/template/layout-templates/schemas/layout-template.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../channels/provider-credentials/schemas/provider-credentials.schema';
import {
  DomainCatalogue,
  DomainCatalogueDocument,
} from '../../notifications/events/domain-catalogue/schemas/domain-catalogue.schema';
import {
  EventCatalogue,
  EventCatalogueDocument,
} from '../../notifications/events/event-catalogue/schemas/event-catalogue.schema';
import {
  NotificationExecutionLog,
  NotificationExecutionLogDocument,
} from '../../notifications/execution-log/schemas/execution-log.schema';
import {
  CompanySmtp,
  CompanySmtpDocument,
} from '../../../ecosystem/organization-portal/schemas/company-smtp.schema';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CascadeDeleteSummary {
  company_themes: number;
  layout_templates: number;
  company_channel_providers: number;
  provider_credentials: number;
  domain_catalogues: number;
  event_catalogue: number;
  notification_execution_logs: number;
  company_smtp: number;
  invitations: number;
  users: number;
  refresh_tokens: number;
}

export interface DeleteCompanyResult {
  deleted: boolean;
  dryRun: boolean;
  companyKey: string;
  summary: CascadeDeleteSummary;
  totalDocuments: number;
}

// ─── Internal type ────────────────────────────────────────────────────────────

interface DependencyIds {
  themeIds: Types.ObjectId[];
  ccpIds: Types.ObjectId[];
  domainIds: Types.ObjectId[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CompanyDeletionService {
  private readonly logger = new Logger(CompanyDeletionService.name);

  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,

    @InjectModel(CompanyTheme.name)
    private readonly themeModel: Model<CompanyThemeDocument>,

    @InjectModel(LayoutTemplate.name)
    private readonly layoutModel: Model<LayoutTemplateDocument>,

    @InjectModel(CompanyChannelProvider.name)
    private readonly ccpModel: Model<CompanyChannelProviderDocument>,

    @InjectModel(ProviderCredentials.name)
    private readonly credentialsModel: Model<ProviderCredentialsDocument>,

    @InjectModel(DomainCatalogue.name)
    private readonly domainModel: Model<DomainCatalogueDocument>,

    @InjectModel(EventCatalogue.name)
    private readonly eventModel: Model<EventCatalogueDocument>,

    @InjectModel(NotificationExecutionLog.name)
    private readonly logModel: Model<NotificationExecutionLogDocument>,

    @InjectModel(CompanySmtp.name)
    private readonly smtpModel: Model<CompanySmtpDocument>,

  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async deleteCompany(
    companyKey: string,
    options: { dryRun?: boolean } = {},
  ): Promise<DeleteCompanyResult> {
    const company = await this.validateCompany(companyKey);
    const companyId = (company as any)._id as Types.ObjectId;
    const companyIdStr = companyId.toString();

    // Collect intermediate IDs before any write — reads are always outside
    // the write transaction so we do not hold read locks unnecessarily.
    const deps = await this.collectDependencies(companyId, companyIdStr);

    if (options.dryRun) {
      return this.buildDryRunResult(companyKey, companyId, companyIdStr, deps);
    }

    const summary = await this.executeDelete(
      companyId,
      companyIdStr,
      companyKey,
      deps,
    );

    // Fire-and-forget: external storage cleanup (logos, avatars, bucket assets).
    this.deleteMedia(companyIdStr).catch((err) =>
      this.logger.warn(
        `deleteMedia hook failed for "${companyKey}": ${err?.message}`,
      ),
    );

    const totalDocuments = this.sumSummary(summary);
    this.logger.log(
      `Company "${companyKey}" deleted. Total documents removed: ${totalDocuments}.`,
    );

    return {
      deleted: true,
      dryRun: false,
      companyKey,
      summary,
      totalDocuments,
    };
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  private async validateCompany(companyKey: string) {
    const company = await this.companyModel.findOne({ companyKey }).lean();

    if (!company) {
      throw new NotFoundException(`Company "${companyKey}" not found.`);
    }
    if ((company as any).isPlatformCompany) {
      throw new ForbiddenException('The modules company cannot be deleted.');
    }

    return company;
  }

  // ─── Dependency collection ───────────────────────────────────────────────────

  private async collectDependencies(
    companyId: Types.ObjectId,
    companyIdStr: string,
  ): Promise<DependencyIds> {
    const [themeIds, ccpIds, domainIds] = await Promise.all([
      this.themeModel.find({ companyId }).distinct('_id'),
      this.ccpModel.find({ companyId }).distinct('_id'),
      this.domainModel.find({ companyId }).distinct('_id'),
    ]);

    return {
      themeIds: themeIds,
      ccpIds: ccpIds,
      domainIds: domainIds,
    };
  }

  // ─── Dry-run path ────────────────────────────────────────────────────────────

  private async buildDryRunResult(
    companyKey: string,
    companyId: Types.ObjectId,
    companyIdStr: string,
    deps: DependencyIds,
  ): Promise<DeleteCompanyResult> {
    this.logger.log(
      `[DRY RUN] Calculating cascade counts for company "${companyKey}"…`,
    );

    const summary = await this.dryRunCounts(companyId, companyIdStr, deps);
    const totalDocuments = this.sumSummary(summary);

    this.logger.log(
      `[DRY RUN] Would delete ${totalDocuments} documents across 12 collections.`,
    );

    return {
      deleted: false,
      dryRun: true,
      companyKey,
      summary,
      totalDocuments,
    };
  }

  private async dryRunCounts(
    companyId: Types.ObjectId,
    companyIdStr: string,
    { themeIds, ccpIds, domainIds }: DependencyIds,
  ): Promise<CascadeDeleteSummary> {
    const [
      company_themes,
      company_channel_providers,
      domain_catalogues,
      notification_execution_logs,
      company_smtp,
    ] = await Promise.all([
      this.themeModel.countDocuments({ companyId }),
      this.ccpModel.countDocuments({ companyId }),
      this.domainModel.countDocuments({ companyId }),
      this.logModel.countDocuments({ companyId }),
      this.smtpModel.countDocuments({ companyId: companyIdStr }),
    ]);

    const [
      layout_templates,
      provider_credentials,
      event_catalogue,
    ] = await Promise.all([
      themeIds.length
        ? this.layoutModel.countDocuments({ companyThemeId: { $in: themeIds } })
        : 0,
      ccpIds.length
        ? this.credentialsModel.countDocuments({
            companyChannelProviderId: { $in: ccpIds },
          })
        : 0,
      domainIds.length
        ? this.eventModel.countDocuments({
            domainCatalogueId: { $in: domainIds },
          })
        : 0,
    ]);

    return {
      company_themes,
      layout_templates,
      company_channel_providers,
      provider_credentials,
      domain_catalogues,
      event_catalogue,
      notification_execution_logs,
      company_smtp,
      invitations: 0,
      users: 0,
      refresh_tokens: 0,
    };
  }

  // ─── Transactional delete path ───────────────────────────────────────────────

  private async executeDelete(
    companyId: Types.ObjectId,
    companyIdStr: string,
    companyKey: string,
    deps: DependencyIds,
  ): Promise<CascadeDeleteSummary> {
    const { themeIds, ccpIds, domainIds } = deps;

    const summary: CascadeDeleteSummary = {
      company_themes: 0,
      layout_templates: 0,
      company_channel_providers: 0,
      provider_credentials: 0,
      domain_catalogues: 0,
      event_catalogue: 0,
      notification_execution_logs: 0,
      company_smtp: 0,
      invitations: 0,
      users: 0,
      refresh_tokens: 0,
    };

    this.logger.log(`Starting cascade delete for company "${companyKey}"…`);

    const session = await this.companyModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        // ── Phase 2: Second-level children (depend on intermediate IDs) ──────
        summary.layout_templates = await this.deleteLayouts(themeIds, session);
        summary.provider_credentials = await this.deleteCredentials(
          ccpIds,
          session,
        );
        summary.event_catalogue = await this.deleteEvents(domainIds, session);

        // ── Phase 3: Direct children (companyId: ObjectId) ───────────────────
        summary.notification_execution_logs = await this.deleteLogs(
          companyId,
          session,
        );
        summary.company_themes = await this.deleteThemes(companyId, session);
        summary.company_channel_providers = await this.deleteCCPs(
          companyId,
          session,
        );
        summary.domain_catalogues = await this.deleteDomains(
          companyId,
          session,
        );

        // ── Phase 4: Direct children (companyId: string) ─────────────────────
        summary.company_smtp = await this.deleteSmtp(companyIdStr, session);

        // ── Phase 5: Company document ─────────────────────────────────────────
        await this.deleteCompanyDocument(companyKey, session);
      });
    } catch (err: any) {
      this.logger.error(
        `Cascade delete transaction failed for company "${companyKey}": ${err?.message}`,
      );
      throw err;
    } finally {
      await session.endSession();
    }

    return summary;
  }

  // ─── Per-collection delete helpers ──────────────────────────────────────────

  private async deleteLayouts(
    themeIds: Types.ObjectId[],
    session: ClientSession,
  ): Promise<number> {
    if (!themeIds.length) return 0;
    this.logger.log('Deleting layout templates…');
    const { deletedCount = 0 } = await this.layoutModel.deleteMany(
      { companyThemeId: { $in: themeIds } },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} layout templates.`);
    return deletedCount;
  }

  private async deleteCredentials(
    ccpIds: Types.ObjectId[],
    session: ClientSession,
  ): Promise<number> {
    if (!ccpIds.length) return 0;
    this.logger.log('Deleting provider credentials…');
    const { deletedCount = 0 } = await this.credentialsModel.deleteMany(
      { companyChannelProviderId: { $in: ccpIds } },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} provider credentials.`);
    return deletedCount;
  }

  private async deleteEvents(
    domainIds: Types.ObjectId[],
    session: ClientSession,
  ): Promise<number> {
    if (!domainIds.length) return 0;
    this.logger.log('Deleting event catalogue entries…');
    const { deletedCount = 0 } = await this.eventModel.deleteMany(
      { domainCatalogueId: { $in: domainIds } },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} event catalogue entries.`);
    return deletedCount;
  }

  private async deleteLogs(
    companyId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    this.logger.log('Deleting notification execution logs…');
    const { deletedCount = 0 } = await this.logModel.deleteMany(
      { companyId },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} notification execution logs.`);
    return deletedCount;
  }

  private async deleteThemes(
    companyId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    this.logger.log('Deleting company themes…');
    const { deletedCount = 0 } = await this.themeModel.deleteMany(
      { companyId },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} company themes.`);
    return deletedCount;
  }

  private async deleteCCPs(
    companyId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    this.logger.log('Deleting company channel providers…');
    const { deletedCount = 0 } = await this.ccpModel.deleteMany(
      { companyId },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} company channel providers.`);
    return deletedCount;
  }

  private async deleteDomains(
    companyId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    this.logger.log('Deleting domain catalogues…');
    const { deletedCount = 0 } = await this.domainModel.deleteMany(
      { companyId },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} domain catalogues.`);
    return deletedCount;
  }

  private async deleteSmtp(
    companyIdStr: string,
    session: ClientSession,
  ): Promise<number> {
    this.logger.log('Deleting SMTP configuration…');
    const { deletedCount = 0 } = await this.smtpModel.deleteOne(
      { companyId: companyIdStr },
      { session },
    );
    this.logger.log(`Deleted ${deletedCount} SMTP configuration.`);
    return deletedCount;
  }

  private async deleteCompanyDocument(
    companyKey: string,
    session: ClientSession,
  ): Promise<void> {
    this.logger.log(`Deleting company "${companyKey}"…`);
    await this.companyModel.findOneAndDelete({ companyKey }, { session });
    this.logger.log('Done.');
  }

  // ─── Media hook (extension point) ───────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteMedia(_companyId: string): Promise<void> {
    // TODO: clean up logos, avatars, images, documents from S3 / GCS bucket.
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  private sumSummary(s: CascadeDeleteSummary): number {
    return Object.values(s).reduce((acc, n) => acc + n, 0);
  }
}
