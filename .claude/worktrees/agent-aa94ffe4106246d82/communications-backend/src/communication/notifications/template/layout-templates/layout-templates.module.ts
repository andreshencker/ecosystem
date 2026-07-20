import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  LayoutTemplate,
  LayoutTemplateSchema,
} from './schemas/layout-template.schema';
import { LayoutTemplatesService } from './layout-templates.service';
import { LayoutTemplatesController } from './layout-templates.controller';

// ✅ para populate/lookup
import {
  CompanyTheme,
  CompanyThemeSchema,
} from '../../../company/company-theme/schemas/company-theme.schema';
import {
  Company,
  CompanySchema,
} from '../../../company/company-info/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LayoutTemplate.name, schema: LayoutTemplateSchema },
      { name: CompanyTheme.name, schema: CompanyThemeSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [LayoutTemplatesController],
  providers: [LayoutTemplatesService],
  exports: [LayoutTemplatesService],
})
export class LayoutTemplatesModule {}
