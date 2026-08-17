// src/communication/channels/oauth-applications/oauth-applications.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import {
  OAuthApplication,
  OAuthApplicationSchema,
} from './schemas/oauth-application.schema';
import {
  Company,
  CompanySchema,
} from '../../company/company-info/schemas/company.schema';
import { CryptoService } from '../../common/security/crypto.service';
import { RelayTenantContextModule } from '../../../infrastructure/security/relay-tenant-context.module';

import { OAuthApplicationsController } from './oauth-applications.controller';
import { OAuthApplicationsService } from './oauth-applications.service';

@Module({
  imports: [
    ConfigModule,
    RelayTenantContextModule,
    MongooseModule.forFeature([
      { name: OAuthApplication.name, schema: OAuthApplicationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [OAuthApplicationsController],
  providers: [OAuthApplicationsService, CryptoService],
  exports: [OAuthApplicationsService],
})
export class OAuthApplicationsModule {}
