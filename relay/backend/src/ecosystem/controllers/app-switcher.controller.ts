import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { GrapiflyOrganizationService } from '../services/grapifly-organization.service';

/** Powers Relay's "switch apps" (Google-waffle-style) menu — ecosystem apps enabled for the active organization. */
@ApiTags('App Switcher')
@ApiBearerAuth()
@Controller('app-switcher')
export class AppSwitcherController {
  constructor(private readonly grapiflyOrganization: GrapiflyOrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'List ecosystem apps enabled for the active Grapifly organization' })
  async listEnabledApps(@CurrentUser() ctx: AuthContext) {
    const applications = await this.grapiflyOrganization.listEnabledApps(ctx);
    return { applications, total: applications.length };
  }
}
