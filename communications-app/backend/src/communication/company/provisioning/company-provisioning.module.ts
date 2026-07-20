import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CompanyProvisioningService } from './company-provisioning.service';
import { CompanyThemeModule } from '../company-theme/company-theme.module';
import { LayoutTemplatesModule } from '../../notifications/template/layout-templates/layout-templates.module';
import { DomainCatalogueModule } from '../../notifications/events/domain-catalogue/domain-catalogue.module';
import { EventCatalogueModule } from '../../notifications/events/event-catalogue/event-catalog.module';

import { Company, CompanySchema }
  from '../company-info/schemas/company.schema';
import { DomainCatalogue, DomainCatalogueSchema }
  from '../../notifications/events/domain-catalogue/schemas/domain-catalogue.schema';
import { EventCatalogue, EventCatalogueSchema }
  from '../../notifications/events/event-catalogue/schemas/event-catalogue.schema';

@Module({
  imports: [
    // Direct model access needed for bulk cleanup operations in CompanyProvisioningService.
    MongooseModule.forFeature([
      { name: Company.name,          schema: CompanySchema          },
      { name: DomainCatalogue.name,  schema: DomainCatalogueSchema  },
      { name: EventCatalogue.name,   schema: EventCatalogueSchema   },
    ]),
    CompanyThemeModule,
    LayoutTemplatesModule,
    DomainCatalogueModule,
    EventCatalogueModule,
  ],
  providers: [CompanyProvisioningService],
  exports: [CompanyProvisioningService],
})
export class CompanyProvisioningModule {}
