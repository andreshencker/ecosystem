// src/company-theme/company-theme.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

import { CompanyThemeService } from './company-theme.service';
import { CreateCompanyThemeDto } from './dto/create-company-theme.dto';
import { UpdateCompanyThemeDto } from './dto/update-company-theme.dto';

@ApiTags('Company Theme')
@Controller('company-themes')
export class CompanyThemeController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: CompanyThemeService,
  ) {}

  @Get()
  @HttpCode(200)
  async list(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId?: string,
    @Query('active') active?: string,
  ) {
    this.assertApiKey(apiKey);
    const activeBool = active === undefined ? undefined : active === 'true';
    return this.service.findAll({ companyId, active: activeBool });
  }

  @Get(':id')
  @HttpCode(200)
  async getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(200)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateCompanyThemeDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Put(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyThemeDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.updateById(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.removeById(id);
  }

  private assertApiKey(apiKey: string) {
    const expectedKey = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
