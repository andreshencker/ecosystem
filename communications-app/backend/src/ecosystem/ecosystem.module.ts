import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { EcosystemTeamController } from './controllers/ecosystem-team.controller';
import { GrapiflyOrganizationService } from './services/grapifly-organization.service';
import { GrapiflyTeamService } from './services/grapifly-team.service';

@Module({
  imports: [HttpModule, UsersModule],
  controllers: [EcosystemTeamController],
  providers: [GrapiflyOrganizationService, GrapiflyTeamService],
  exports: [GrapiflyOrganizationService],
})
export class EcosystemModule {}
