import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { AuthContext } from '../../core/auth/types/auth-context';
import { GrapiflyOrganizationService } from './grapifly-organization.service';

type AuthRequest = Request & { user: AuthContext };

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class GrapiflyOrganizationController {
  constructor(private readonly grapiflyOrganization: GrapiflyOrganizationService) {}

  @Get()
  async listOrganizations(@Req() req: AuthRequest) {
    const organizations = await this.grapiflyOrganization.listOrganizations(req.user.grapiflyUserId);
    return { organizations, total: organizations.length };
  }
}

@Controller('app-switcher')
@UseGuards(JwtAuthGuard)
export class AppSwitcherController {
  constructor(private readonly grapiflyOrganization: GrapiflyOrganizationService) {}

  @Get()
  async listEnabledApps(@Req() req: AuthRequest) {
    const applications = await this.grapiflyOrganization.listEnabledApps(req.user.organizationId, req.user.grapiflyUserId);
    return { applications, total: applications.length };
  }
}
