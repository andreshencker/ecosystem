// src/channels/channels-catalogue/channels-catalogue.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../common/pagination/pagination.util';

import { ChannelsCatalogService } from './channels-catalog.service';
import { CreateChannelDto } from './dto/create-channel-catalog.dto';
import { UpdateChannelDto } from './dto/update-channel-catalog.dto';

@ApiTags('Channels Catalog')
@Controller('channels')
export class ChannelsCatalogController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: ChannelsCatalogService,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List channels (catalog)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
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
  list(
    @Headers('x-api-key') apiKey: string,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
    const activeBool =
      active === undefined ? undefined : active === 'true' || active === '1';
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      ...(typeof activeBool === 'boolean' ? { active: activeBool } : {}),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get('by-key')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get channel by channelKey' })
  getByKey(
    @Headers('x-api-key') apiKey: string,
    @Query('channelKey') channelKey: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.findByKey(channelKey);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create channel (catalog)' })
  @ApiBody({ type: CreateChannelDto })
  create(@Headers('x-api-key') apiKey: string, @Body() dto: CreateChannelDto) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: 'Update channel by channelKey' })
  @ApiBody({ type: UpdateChannelDto })
  update(
    @Headers('x-api-key') apiKey: string,
    @Query('channelKey') channelKey: string,
    @Body() dto: UpdateChannelDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.updateByKey(channelKey, dto);
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete channel by channelKey' })
  remove(
    @Headers('x-api-key') apiKey: string,
    @Query('channelKey') channelKey: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.removeByKey(channelKey);
  }

  private assertApiKey(apiKey: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
