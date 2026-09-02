import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Company,
  CompanyDocument,
} from '../company-info/schemas/company.schema';
import {
  CompanyTheme,
  CompanyThemeDocument,
} from './schemas/company-theme.schema';

export interface CompanyThemeOrganizationMigrationReport {
  organizationsScanned: number;
  themesMigrated: number;
  legacyThemesWithoutOrganization: number;
}

/**
 * Compatibility migration for the first Relay resource moved to Grapifly IDs.
 * It is intentionally idempotent and never deletes legacy data.
 */
@Injectable()
export class CompanyThemeOrganizationMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger(CompanyThemeOrganizationMigration.name);

  constructor(
    @InjectModel(Company.name)
    private readonly companies: Model<CompanyDocument>,
    @InjectModel(CompanyTheme.name)
    private readonly themes: Model<CompanyThemeDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const report = await this.run();
      this.logger.log(
        `CompanyTheme organization migration complete: ${JSON.stringify(report)}`,
      );
    } catch (error: any) {
      // A migration diagnostic must not make Relay unavailable. Existing reads
      // remain compatible through companyId until the issue is corrected.
      this.logger.error(
        `CompanyTheme organization migration failed: ${error?.message ?? error}`,
      );
    }
  }

  async run(): Promise<CompanyThemeOrganizationMigrationReport> {
    const organizations = await this.companies
      .find({
        grapiflyOrganizationId: { $type: 'string', $ne: '' },
      })
      .select({ _id: 1, grapiflyOrganizationId: 1 })
      .lean()
      .exec();

    let themesMigrated = 0;
    for (const organization of organizations) {
      const result = await this.themes.updateMany(
        {
          companyId: organization._id,
          $or: [
            { grapiflyOrganizationId: null },
            { grapiflyOrganizationId: { $exists: false } },
          ],
        },
        {
          $set: {
            grapiflyOrganizationId: organization.grapiflyOrganizationId,
          },
        },
      );
      themesMigrated += result.modifiedCount;
    }

    const legacyThemesWithoutOrganization = await this.themes.countDocuments({
      $or: [
        { grapiflyOrganizationId: null },
        { grapiflyOrganizationId: { $exists: false } },
      ],
    });

    return {
      organizationsScanned: organizations.length,
      themesMigrated,
      legacyThemesWithoutOrganization,
    };
  }
}
