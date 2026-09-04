import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EcosystemAppGuard } from './ecosystem-app.guard';
import { DirectoryService } from './directory.service';
import type {
  ResolveOrganizationsDto,
  ResolveUsersDto,
} from './dto/resolve.dto';

const CONTRACT_VERSION = 3;

/**
 * Ecosystem Internal API — the Directory.
 * docs/architecture/ecosystem-internal-api.md
 *
 * Auth: x-ecosystem-app + x-ecosystem-secret (see EcosystemAppGuard).
 * Permission-free: returns display data only, no actor scoping.
 */
@Controller('internal/directory')
@UseGuards(EcosystemAppGuard)
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Post('organizations/resolve')
  async resolveOrganizations(@Body() body: ResolveOrganizationsDto) {
    return {
      contractVersion: CONTRACT_VERSION,
      data: {
        organizations: await this.directory.resolveOrganizations(body?.organizationIds),
      },
    };
  }

  @Post('users/resolve')
  async resolveUsers(@Body() body: ResolveUsersDto) {
    return {
      contractVersion: CONTRACT_VERSION,
      data: {
        users: await this.directory.resolveUsers(body?.grapiflyUserIds),
      },
    };
  }
}
