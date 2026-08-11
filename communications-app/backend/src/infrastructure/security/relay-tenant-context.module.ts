import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Company,
  CompanySchema,
} from '../../communication/company/company-info/schemas/company.schema';
import { RelayTenantContextService } from './services/relay-tenant-context.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
  ],
  providers: [RelayTenantContextService],
  exports: [RelayTenantContextService],
})
export class RelayTenantContextModule {}
