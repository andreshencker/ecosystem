import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  CompanyIntegration,
  CompanyIntegrationSchema,
} from './schemas/company-integration.schema';
import { Company, CompanySchema } from '../company-info/schemas/company.schema';
import { User, UserSchema } from '../../../ecosystem/identity/schemas/ecosystem-user.schema';
import { CompanyIntegrationsController } from './company-integrations.controller';
import { CompanyIntegrationsService } from './company-integrations.service';
import { NotificationModule } from '../../notifications/notification.module';
import { RelayTenantContextModule } from '../../../infrastructure/security/relay-tenant-context.module';

@Module({
  imports: [
    ConfigModule,
    RelayTenantContextModule,
    MongooseModule.forFeature([
      { name: CompanyIntegration.name, schema: CompanyIntegrationSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationModule,
  ],
  controllers: [CompanyIntegrationsController],
  providers: [CompanyIntegrationsService],
  exports: [CompanyIntegrationsService],
})
export class CompanyIntegrationsModule {}
