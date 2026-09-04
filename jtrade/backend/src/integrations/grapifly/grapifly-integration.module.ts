import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GrapiflyAppConfigController } from './grapifly-app-config.controller';
import { GrapiflyAppConfigService } from './grapifly-app-config.service';
import { GrapiflyOrganizationController, AppSwitcherController } from './grapifly-organization.controller';
import { GrapiflyOrganizationService } from './grapifly-organization.service';
import { GrapiflyTeamController } from './grapifly-team.controller';
import { GrapiflyTeamService } from './grapifly-team.service';
import { GrapiflyDirectoryService } from './grapifly-directory.service';

@Module({
  imports: [HttpModule],
  controllers: [GrapiflyAppConfigController, GrapiflyOrganizationController, AppSwitcherController, GrapiflyTeamController],
  providers: [GrapiflyAppConfigService, GrapiflyOrganizationService, GrapiflyTeamService, GrapiflyDirectoryService],
  exports: [HttpModule, GrapiflyAppConfigService, GrapiflyOrganizationService, GrapiflyDirectoryService],
})
export class GrapiflyIntegrationModule {}
