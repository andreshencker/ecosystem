import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EcosystemTeamController } from './controllers/ecosystem-team.controller';
import { GrapiflyOrganizationService } from './services/grapifly-organization.service';
import { GrapiflyTeamService } from './services/grapifly-team.service';
import { EcosystemIdentityService } from './identity/ecosystem-identity.service';
import { EcosystemBootstrapService } from './identity/ecosystem-bootstrap.service';
import { CommunicationTokenValidatorService } from './communication-token/communication-token-validator.service';
import { CommunicationTokenValidatorController } from './communication-token/communication-token-validator.controller';
import { User, UserSchema } from './identity/schemas/ecosystem-user.schema';
import { Company, CompanySchema } from '../communication/company/company-info/schemas/company.schema';
import { CompanyProvisioningModule } from '../communication/company/provisioning/company-provisioning.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CompanyProvisioningModule,
  ],
  controllers: [EcosystemTeamController, CommunicationTokenValidatorController],
  providers: [
    EcosystemIdentityService,
    EcosystemBootstrapService,
    GrapiflyOrganizationService,
    GrapiflyTeamService,
    CommunicationTokenValidatorService,
  ],
  exports: [EcosystemIdentityService, GrapiflyOrganizationService, CommunicationTokenValidatorService],
})
export class EcosystemModule {}
