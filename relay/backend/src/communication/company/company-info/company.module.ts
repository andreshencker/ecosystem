import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Company, CompanySchema } from './schemas/company.schema';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyDeletionService } from './company-deletion.service';

import {
  CompanyTheme,
  CompanyThemeSchema,
} from '../company-theme/schemas/company-theme.schema';

import {
  CompanyChannelProvider,
  CompanyChannelProviderSchema,
} from '../../channels/company-channel-providers/schemas/company-channel-provider.schema';
import {
  ProviderCredentials,
  ProviderCredentialsSchema,
} from '../../channels/provider-credentials/schemas/provider-credentials.schema';

import {
  LayoutTemplate,
  LayoutTemplateSchema,
} from '../../notifications/template/layout-templates/schemas/layout-template.schema';
import {
  DomainCatalogue,
  DomainCatalogueSchema,
} from '../../notifications/events/domain-catalogue/schemas/domain-catalogue.schema';
import {
  EventCatalogue,
  EventCatalogueSchema,
} from '../../notifications/events/event-catalogue/schemas/event-catalogue.schema';
import {
  NotificationExecutionLog,
  NotificationExecutionLogSchema,
} from '../../notifications/execution-log/schemas/execution-log.schema';

import {
  CompanySmtp,
  CompanySmtpSchema,
} from '../../../ecosystem/organization-portal/schemas/company-smtp.schema';

import { MediaModule } from '../../../files/media/media.module';
import { EcosystemModule } from '../../../ecosystem/ecosystem.module';
import { CompanyProvisioningModule } from '../provisioning/company-provisioning.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Core
      { name: Company.name, schema: CompanySchema },
      // Company sub-resources
      { name: CompanyTheme.name, schema: CompanyThemeSchema },
      // Channel resources
      {
        name: CompanyChannelProvider.name,
        schema: CompanyChannelProviderSchema,
      },
      { name: ProviderCredentials.name, schema: ProviderCredentialsSchema },
      // Notification resources
      { name: LayoutTemplate.name, schema: LayoutTemplateSchema },
      { name: DomainCatalogue.name, schema: DomainCatalogueSchema },
      { name: EventCatalogue.name, schema: EventCatalogueSchema },
      {
        name: NotificationExecutionLog.name,
        schema: NotificationExecutionLogSchema,
      },
      // Platform resources
      { name: CompanySmtp.name, schema: CompanySmtpSchema },
    ]),
    MediaModule,
    EcosystemModule,
    CompanyProvisioningModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyDeletionService],
})
export class CompanyModule {}
