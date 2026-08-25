import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CompanyPortalController } from './company-portal.controller';
import { CompanyPortalService } from './company-portal.service';
import { CompanySmtp, CompanySmtpSchema } from './schemas/company-smtp.schema';
import {
  Company,
  CompanySchema,
} from '../../communication/company/company-info/schemas/company.schema';
import { SecurityModule } from '../../communication/common/security/security.module';
import { RolesGuard } from '../../infrastructure/security/guards/roles.guard';
import { RelayTenantContextModule } from '../../infrastructure/security/relay-tenant-context.module';
import { EcosystemModule } from '../ecosystem.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: CompanySmtp.name, schema: CompanySmtpSchema },
    ]),
    SecurityModule,
    RelayTenantContextModule,
    EcosystemModule,
  ],
  controllers: [CompanyPortalController],
  providers: [CompanyPortalService, RolesGuard],
  exports: [CompanyPortalService],
})
export class CompanyPortalModule {}
