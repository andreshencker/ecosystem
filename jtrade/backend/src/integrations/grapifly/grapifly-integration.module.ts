import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GrapiflyAppConfigController } from './grapifly-app-config.controller';
import { GrapiflyAppConfigService } from './grapifly-app-config.service';
import { GrapiflyOrganizationController, AppSwitcherController } from './grapifly-organization.controller';
import { GrapiflyOrganizationService } from './grapifly-organization.service';

@Module({
  imports: [HttpModule],
  controllers: [GrapiflyAppConfigController, GrapiflyOrganizationController, AppSwitcherController],
  providers: [GrapiflyAppConfigService, GrapiflyOrganizationService],
  exports: [HttpModule, GrapiflyAppConfigService, GrapiflyOrganizationService],
})
export class GrapiflyIntegrationModule {}
