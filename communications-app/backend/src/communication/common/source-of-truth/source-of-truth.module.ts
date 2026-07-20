// src/common/source-of-truth/source-of-truth.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SourceOfTruthService } from './source-of-truth.service';
import {
  CompanyTheme,
  CompanyThemeSchema,
} from '../../company/company-theme/schemas/company-theme.schema';

import { LayoutTemplatesModule } from '../../notifications/template/layout-templates/layout-templates.module';
import { EventCatalogueModule } from '../../notifications/events/event-catalogue/event-catalog.module';

@Module({
  imports: [
    LayoutTemplatesModule,
    EventCatalogueModule,
    MongooseModule.forFeature([
      { name: CompanyTheme.name, schema: CompanyThemeSchema },
    ]),
  ],
  providers: [SourceOfTruthService],
  exports: [SourceOfTruthService],
})
export class SourceOfTruthModule {}
