import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAssignmentsService } from './application-assignments.service';

@Controller('internal/apps/:appKey/config')
export class AppCatalogueController {
  constructor(
    private readonly assignments: ApplicationAssignmentsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Get()
  async getConfig(
    @Param('appKey') appKey: string,
    @Headers('x-grapifly-sso-secret') secret: string | undefined,
  ) {
    await this.assignments.assertAppClient(appKey, secret);
    return this.applications.getPublicConfig(appKey);
  }
}
