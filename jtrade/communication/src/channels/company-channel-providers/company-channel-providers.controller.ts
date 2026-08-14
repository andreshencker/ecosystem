// src/company-channel-providers/company-channel-providers.controller.ts
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

import { CompanyChannelProvidersService } from './company-channel-providers.service';
import { CreateCompanyChannelProviderDto } from './dto/create-company-channel-provider.dto';
import { UpdateCompanyChannelProviderDto } from './dto/update-company-channel-provider.dto';

@Controller('company-channel-providers')
export class CompanyChannelProvidersController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: CompanyChannelProvidersService,
  ) {}

  @Get()
  @HttpCode(200)
  list(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('channelId') channelId?: string,
    @Query('active') active?: string,
    @Query('isDefault') isDefault?: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.findAll({
      companyId,
      channelId,
      active: this.toBool(active),
      isDefault: this.toBool(isDefault),
      populate: this.toBool(populate) ?? true,
    });
  }

  @Get('default/by-channel')
  @HttpCode(200)
  getDefaultByChannel(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('channelId') channelId: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);

    return this.service.findDefaultByChannel({
      companyId,
      channelId,
      populate: this.toBool(populate) ?? true,
    });
  }

  @Get(':id')
  @HttpCode(200)
  getById(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.findById(id, this.toBool(populate) ?? true);
  }

  @Post()
  @HttpCode(201)
  create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyChannelProviderDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyChannelProviderDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
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
    return s === 'true' || s === '1';
  }
}
