import { Controller, Get, Param } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

/**
 * Public brand + capability data only — never includes service secrets or
 * per-user access grants. `allowedFlows` is catalogue-level ("does this app
 * support a provider flow at all"), not a grant — it lets any app's
 * frontend decide generically whether to offer client/provider signup.
 */
@Controller('catalog/apps')
export class ApplicationsPublicController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get(':appKey/public-config')
  getPublicConfig(@Param('appKey') appKey: string) {
    return this.applications.getPublicConfig(appKey);
  }
}
