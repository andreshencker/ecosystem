// src/channels/provider-credentials/provider-credentials.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ProviderCredentialsService } from './provider-credentials.service';
import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto';

type CredentialChannel = 'email' | 'sms';

@Controller('provider-credentials')
export class ProviderCredentialsController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: ProviderCredentialsService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateProviderCredentialsDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  /**
   * OPTIONS para selects
   * GET /provider-credentials/options?companyId=...&active=true
   * GET /provider-credentials/options?companyId=...&channel=email&active=true
   */
  @Get('options')
  @HttpCode(200)
  async options(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('channel') channel?: CredentialChannel,
    @Query('active') active?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.options({
      companyId,
      channel: this.normalizeChannel(channel),
      active: this.toBool(active),
    });
  }

  /**
   * LIST por CompanyChannelProvider
   * GET /provider-credentials?companyChannelProviderId=...&active=true&populate=true
   */
  @Get()
  @HttpCode(200)
  async list(
    @Headers('x-api-key') apiKey: string,
    @Query('companyChannelProviderId') companyChannelProviderId: string,
    @Query('active') active?: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.findAll({
      companyChannelProviderId,
      active: this.toBool(active),
      populate: this.toBool(populate),
    });
  }

  /**
   * DEBUG debe ir ANTES de @Get(':id')
   */
  @Get('debug/decrypted')
  @HttpCode(200)
  async decrypted(
    @Headers('x-api-key') apiKey: string,
    @Query('companyChannelProviderId') companyChannelProviderId: string,
    @Query('tag') tag: string,
  ) {
    this.assertApiKey(apiKey);

    const allow = this.config.get<string>('ALLOW_DEBUG_DECRYPTED') === 'true';

    if (!allow) {
      throw new UnauthorizedException('Debug endpoint disabled');
    }

    return this.service.getDecrypted({ companyChannelProviderId, tag });
  }

  /**
   * GET by id
   * IMPORTANTE: debe ir después de options y debug/decrypted
   */
  @Get(':id')
  @HttpCode(200)
  async getById(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.getById(id, this.toBool(populate) ?? false);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateProviderCredentialsDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');

    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
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
