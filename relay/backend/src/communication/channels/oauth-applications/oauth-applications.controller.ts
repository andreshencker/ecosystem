// src/communication/channels/oauth-applications/oauth-applications.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../../infrastructure/security/services/relay-tenant-context.service';

import { OAuthApplicationsService } from './oauth-applications.service';
import { CreateOAuthApplicationDto } from './dto/create-oauth-application.dto';
import { OAuthApplicationResponseDto } from './dto/oauth-application-response.dto';

@ApiTags('OAuth Applications')
@Controller('oauth-applications')
export class OAuthApplicationsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: OAuthApplicationsService,
    private readonly tenantContext: RelayTenantContextService,
  ) {}

  // POST /oauth-applications
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Register a reusable OAuth app (clientId/clientSecret)',
    description:
      'Creates a company-owned OAuth application registration that can be ' +
      'linked from multiple channel credentials (e.g. Email + Identity), ' +
      'avoiding re-entering the same Client Secret for each channel.',
  })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateOAuthApplicationDto,
  ): Promise<OAuthApplicationResponseDto> {
    const companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      undefined,
      'relay.credentials.manage',
    );
    return this.service.create(companyId, dto);
  }

  // GET /oauth-applications?providerFamily=google
  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'List OAuth applications for the current company',
    description:
      'Returns safe metadata only (masked clientId, never clientSecret). ' +
      'Used to populate the "Reuse existing credential" picker.',
  })
  @ApiQuery({ name: 'providerFamily', required: false, type: String })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') queryCompanyId: string,
    @Query('providerFamily') providerFamily?: string,
  ): Promise<OAuthApplicationResponseDto[]> {
    const companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      queryCompanyId,
      'relay.use',
    );
    return this.service.findAllForCompany({ companyId, providerFamily });
  }

  // GET /oauth-applications/platform/:providerFamily/credentials
  @Get('platform/:providerFamily/credentials')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Platform OAuth app credentials (Grapifly service-to-service only)',
    description:
      "Returns the decrypted clientId/clientSecret of the platform company's " +
      'OAuth application for a provider family (e.g. "google"). Lets Grapifly ' +
      'source its Google login credentials from Relay instead of its own env. ' +
      'Only callable with a valid x-grapifly-service-secret.',
  })
  async platformCredentials(
    @CurrentUser() ctx: AuthContext,
    @Param('providerFamily') providerFamily: string,
  ): Promise<{ clientId: string; clientSecret: string }> {
    if (ctx.actorType !== 'apikey' || ctx.keyId !== 'grapifly-service') {
      throw new ForbiddenException('grapifly service credentials required');
    }
    const creds = await this.service.readPlatformDecrypted(providerFamily);
    if (!creds) {
      throw new NotFoundException(
        `No platform OAuth application registered for "${providerFamily}"`,
      );
    }
    return creds;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveCompanyId(
    ctx: AuthContext,
    apiKey: string,
    requestedCompanyId: string | undefined,
    permission: string,
  ): Promise<string> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    if (!requestedCompanyId) {
      throw new UnauthorizedException(
        'companyId is required for api-key callers',
      );
    }
    return requestedCompanyId;
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
