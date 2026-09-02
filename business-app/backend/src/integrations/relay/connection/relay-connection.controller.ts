import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RelayConnectionService } from './relay-connection.service';
import { RelayCatalogProvisioningService } from '../provisioning/relay-catalog-provisioning.service';
import {
  SaveConnectionDto,
  TestConnectionDto,
  ToggleConnectionDto,
} from './dto/relay-connection.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

// Kept as the historical value 'communications' — this is the persisted
// IntegrationConnection.provider field value in MongoDB (unique per
// businessId+provider). Changing it would orphan every business's existing
// connection document since lookups are keyed on this exact string. The
// route path below must stay in sync with it, since the frontend's generic
// useIntegration(provider) hook derives the URL directly from this same string.
const PROVIDER = 'communications';

@ApiTags('Settings — Relay')
@ApiBearerAuth()
@Controller('settings/communications')
export class RelayConnectionController {
  constructor(
    private readonly service: RelayConnectionService,
    private readonly provisioning: RelayCatalogProvisioningService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get the Relay connection for the authenticated business',
  })
  async get(@CurrentUser() ctx: AuthContext) {
    const result = await this.service.get(this.uid(ctx), PROVIDER);
    if (!result) throw new NotFoundException('No Relay connection configured.');
    return result;
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Save or replace the Relay integration token',
  })
  async save(@CurrentUser() ctx: AuthContext, @Body() dto: SaveConnectionDto) {
    const userId = this.uid(ctx);
    const result = await this.service.save(
      userId,
      PROVIDER,
      dto.token,
      dto.isActive,
    );
    if (result.isActive && result.remoteCompanyId) {
      const businessId = await this.service.resolveBusinessIdForUser(userId);
      await this.provisioning.provisionBusinessResources(businessId);
    }
    return result;
  }

  @Post('test')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Test a token. If token provided: test without saving. Otherwise: test stored token.',
  })
  async test(@CurrentUser() ctx: AuthContext, @Body() dto: TestConnectionDto) {
    return this.service.test(this.uid(ctx), PROVIDER, dto.token);
  }

  @Patch()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Toggle active/inactive without changing the token',
  })
  async toggle(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ToggleConnectionDto,
  ) {
    return this.service.toggle(this.uid(ctx), PROVIDER, dto.isActive);
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete the Relay connection permanently' })
  async remove(@CurrentUser() ctx: AuthContext) {
    return this.service.delete(this.uid(ctx), PROVIDER);
  }

  // JWT only carries sub+type — businessId resolved from DB in the service.
  private uid(ctx: AuthContext | undefined): string {
    if (!ctx?.userId) throw new ForbiddenException('Authentication required.');
    return ctx.userId;
  }
}
