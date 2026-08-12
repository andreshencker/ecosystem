import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CompanyTheme,
  CompanyThemeSchema,
} from './schemas/company-theme.schema';
import { CompanyThemeService } from './company-theme.service';
import { CompanyThemeController } from './company-theme.controller';
import { RelayTenantContextModule } from '../../../infrastructure/security/relay-tenant-context.module';
import { Company, CompanySchema } from '../company-info/schemas/company.schema';
import { CompanyThemeOrganizationMigration } from './company-theme-organization.migration';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CompanyTheme.name, schema: CompanyThemeSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    RelayTenantContextModule,
  ],
  controllers: [CompanyThemeController],
  providers: [CompanyThemeService, CompanyThemeOrganizationMigration],
  exports: [CompanyThemeService],
})
export class CompanyThemeModule {}
