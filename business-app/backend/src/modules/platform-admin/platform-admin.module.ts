import { Module } from '@nestjs/common';
import { PlatformAdminCustomersController } from './platform-admin-customers.controller';
import { PlatformAdminContractsController } from './platform-admin-contracts.controller';
import { BusinessIntelligenceModule } from '../../integrations/business-intelligence/business-intelligence.module';

@Module({
  imports: [BusinessIntelligenceModule],
  controllers: [PlatformAdminCustomersController, PlatformAdminContractsController],
})
export class PlatformAdminModule {}
