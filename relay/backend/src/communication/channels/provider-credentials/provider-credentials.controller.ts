import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../infrastructure/security/services/relay-tenant-context.service';

import { ProviderCredentialsService } from './provider-credentials.service';
import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto';

type CredentialChannel = 'email' | 'sms';

@ApiTags('Provider Credentials')
@Controller('provider-credentials')
export class ProviderCredentialsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: ProviderCredentialsService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateProviderCredentialsDto,
  ) {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.credentials.manage',
    );
    if (companyId) {
      await this.service.assertCompanyChannelProviderBelongsToCompany(
        dto.companyChannelProviderId,
        companyId,
      );
    }
    return this.service.create(dto);
  }

  // GET /provider-credentials/options?companyId=...&channel=email&active=true
  @Get('options')
  @HttpCode(200)
  async options(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('channel') channel?: CredentialChannel,
    @Query('active') active?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );

    return this.service.options({
      companyId,
      channel: this.normalizeChannel(channel),
      active: this.toBool(active),
    });
  }

  // GET /provider-credentials/configured-channels
  // Distinct channelKeys with at least one active credential — drives which
  // navbar tabs (Calendar, Payments, Accounting, Notifications, …) are shown.
  @Get('configured-channels')
  @HttpCode(200)
  @ApiOperation({
    summary: 'List channels with at least one active credential',
  })
  async configuredChannels(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    return this.service.getConfiguredChannels(companyId);
  }

  // GET /provider-credentials?companyChannelProviderId=...  (single-CCP list)
  // GET /provider-credentials?companyId=...               (company-wide list, always populated)
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List provider credentials' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description:
      'Return all credentials for a company (alternative to companyChannelProviderId)',
  })
  @ApiQuery({ name: 'companyChannelProviderId', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'populate', required: false, type: Boolean })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records (1–200, default 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Records to skip (default 0)',
  })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyChannelProviderId') companyChannelProviderId?: string,
    @Query('companyId') companyId?: string,
    @Query('active') active?: string,
    @Query('populate') populate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const sessionCompanyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      'relay.use',
    );
    if (sessionCompanyId) companyId = sessionCompanyId;
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );

    // Company-wide query — returns all credentials with populated provider/channel
    if (companyId && !companyChannelProviderId) {
      return this.service.findAllByCompany({
        companyId,
        active: this.toBool(active),
        limit: parsedLimit,
        offset: parsedOffset,
      });
    }

    if (!companyChannelProviderId) {
      throw new HttpException(
        'companyChannelProviderId or companyId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (sessionCompanyId) {
      await this.service.assertCompanyChannelProviderBelongsToCompany(
        companyChannelProviderId,
        sessionCompanyId,
      );
    }

    return this.service.findAll({
      companyChannelProviderId,
      active: this.toBool(active),
      populate: this.toBool(populate),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  // GET /provider-credentials/:id — must remain after static routes above
  @Get(':id')
  @HttpCode(200)
  async getById(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populate') populate?: string,
  ) {
    await this.assertCredentialAccess(ctx, apiKey, id, 'relay.use');
    return this.service.getById(id, this.toBool(populate) ?? false);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateProviderCredentialsDto,
  ) {
    await this.assertCredentialAccess(
      ctx,
      apiKey,
      id,
      'relay.credentials.manage',
    );
    return this.service.update(id, dto);
  }

  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Test stored credentials by decrypting and verifying connectivity',
  })
  async test(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    await this.assertCredentialAccess(
      ctx,
      apiKey,
      id,
      'relay.credentials.manage',
    );
    return this.service.testById(id);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
  ) {
    await this.assertCredentialAccess(
      ctx,
      apiKey,
      id,
      'relay.credentials.manage',
    );
    return this.service.remove(id);
  }

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');

    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private async resolveCompanyId(
    ctx: AuthContext,
    apiKey: string,
    requestedCompanyId: string,
    permission: string,
  ): Promise<string> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return requestedCompanyId;
  }

  private async resolveOptionalCompanyId(
    ctx: AuthContext,
    apiKey: string,
    permission: string,
  ): Promise<string | undefined> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return undefined;
  }

  private async assertCredentialAccess(
    ctx: AuthContext,
    apiKey: string,
    credentialId: string,
    permission: string,
  ): Promise<void> {
    const companyId = await this.resolveOptionalCompanyId(
      ctx,
      apiKey,
      permission,
    );
    if (companyId) {
      await this.service.assertCredentialBelongsToCompany(
        credentialId,
        companyId,
      );
    }
  }

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;

    const s = v.toLowerCase().trim();

    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;

    return undefined;
  }

  private normalizeChannel(v?: string): CredentialChannel | undefined {
    if (!v) return undefined;

    const s = String(v).toLowerCase().trim();

    if (s === 'email' || s === 'sms') {
      return s;
    }

    throw new UnauthorizedException('Invalid channel');
  }
}
