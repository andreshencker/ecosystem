import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Company,
  CompanyDocument,
} from '../../communication/company/company-info/schemas/company.schema';
import {
  CompanyChannelProvider,
  CompanyChannelProviderDocument,
} from '../../communication/channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsDocument,
} from '../../communication/channels/provider-credentials/schemas/provider-credentials.schema';

export interface ProviderResourcesOrganizationMigrationReport {
  organizationsScanned: number;
  providerConfigurationsMigrated: number;
  credentialsMigrated: number;
  unlinkedProviderConfigurations: number;
  unlinkedCredentials: number;
}

/** Backfills Grapifly organization IDs without reading encrypted payloads. */
@Injectable()
export class ProviderResourcesOrganizationMigration implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    ProviderResourcesOrganizationMigration.name,
  );

  constructor(
    @InjectModel(Company.name)
    private readonly companies: Model<CompanyDocument>,
    @InjectModel(CompanyChannelProvider.name)
    private readonly providerConfigurations: Model<CompanyChannelProviderDocument>,
    @InjectModel(ProviderCredentials.name)
    private readonly credentials: Model<ProviderCredentialsDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const report = await this.run();
      this.logger.log(
        `Provider resources organization migration complete: ${JSON.stringify(report)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Provider resources organization migration failed: ${error?.message ?? error}`,
      );
    }
  }

  async run(): Promise<ProviderResourcesOrganizationMigrationReport> {
    const organizations = await this.companies
      .find({ grapiflyOrganizationId: { $type: 'string', $ne: '' } })
      .select({ _id: 1, grapiflyOrganizationId: 1 })
      .lean()
      .exec();

    let providerConfigurationsMigrated = 0;
    let credentialsMigrated = 0;

    for (const organization of organizations) {
      const providerResult = await this.providerConfigurations.updateMany(
        {
          companyId: organization._id,
          ...this.withoutCanonicalOrganization(),
        },
        {
          $set: {
            grapiflyOrganizationId: organization.grapiflyOrganizationId,
          },
        },
      );
      providerConfigurationsMigrated += providerResult.modifiedCount;

      const providerIds = await this.providerConfigurations
        .find({ companyId: organization._id })
        .select({ _id: 1 })
        .lean();

      if (providerIds.length > 0) {
        const credentialResult = await this.credentials.updateMany(
          {
            companyChannelProviderId: {
              $in: providerIds.map((provider) => provider._id),
            },
            ...this.withoutCanonicalOrganization(),
          },
          {
            $set: {
              grapiflyOrganizationId: organization.grapiflyOrganizationId,
            },
          },
        );
        credentialsMigrated += credentialResult.modifiedCount;
      }
    }

    const [unlinkedProviderConfigurations, unlinkedCredentials] =
      await Promise.all([
        this.providerConfigurations.countDocuments(
          this.withoutCanonicalOrganization(),
        ),
        this.credentials.countDocuments(this.withoutCanonicalOrganization()),
      ]);

    return {
      organizationsScanned: organizations.length,
      providerConfigurationsMigrated,
      credentialsMigrated,
      unlinkedProviderConfigurations,
      unlinkedCredentials,
    };
  }

  private withoutCanonicalOrganization(): Record<string, unknown> {
    return {
      $or: [
        { grapiflyOrganizationId: null },
        { grapiflyOrganizationId: { $exists: false } },
      ],
    };
  }
}
