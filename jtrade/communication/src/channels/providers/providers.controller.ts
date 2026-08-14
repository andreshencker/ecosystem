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

import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: ProvidersService,
  ) {}

  @Get()
  @HttpCode(200)
  list(
    @Headers('x-api-key') apiKey: string,
    @Query('active') active?: string,
    @Query('channelId') channelId?: string,
    @Query('populate') populate?: string,
  ) {
    this.assertApiKey(apiKey);

    const activeBool =
      typeof active === 'string'
        ? active === 'true' || active === '1'
        : undefined;

    const populateBool =
      typeof populate === 'string'
        ? populate === 'true' || populate === '1'
        : true;

    return this.service.findAll({
      active: activeBool,
      channelId,
      populate: populateBool,
    });
  }

  @Get(':id')
  @HttpCode(200)
  getById(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.findById(id, true);
  }

  @Post()
  @HttpCode(201)
  create(@Headers('x-api-key') apiKey: string, @Body() dto: CreateProviderDto) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
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
}
