import { Controller, Get } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from './application-assignments.service';
import { EcosystemAuth, type EcosystemAuthContext } from '../directory/ecosystem-auth.decorator';

@Controller('internal/apps/:appKey/config')
export class AppCatalogueController {
  constructor(
    private readonly assignments: ApplicationAssignmentsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Get()
  async getConfig(@EcosystemAuth() auth: EcosystemAuthContext) {
    await this.assignments.assertAppClient(auth.appKey, auth.secret);
    return this.applications.getPublicConfig(auth.appKey!);
  }
}
