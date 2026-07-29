// src/notifications/events/event-catalogue/event-catalogue.controller.ts
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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { parsePagination } from '../../../common/pagination/pagination.util';

import { EventCatalogueService } from './event-catalogue.service';
import { CreateEventCatalogueDto } from './dto/create-event-catalogue.dto';
import { UpdateEventCatalogueDto } from './dto/update-event-catalogue.dto';
import { BulkCreateEventCatalogueDto } from './dto/bulk-create-event-catalogue.dto';

@ApiTags('Event Catalogue')
@Controller('event-catalogue')
export class EventCatalogueController {
  constructor(
    private readonly config: ConfigService,
    private readonly service: EventCatalogueService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: CreateEventCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.create(dto);
  }

  @Post('bulk')
  @HttpCode(201)
  async bulk(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: BulkCreateEventCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.bulkUpsert(dto);
  }

  @Get('runtime/:companyId/:eventKey')
  @HttpCode(200)
  async runtime(
    @Headers('x-api-key') apiKey: string,
    @Param('companyId') companyId: string,
    @Param('eventKey') eventKey: string,
    @Query('populateChannelsRuntime') populateChannelsRuntime?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.findByCompanyAndEventKey({
      companyId,
      eventKey,
      populateChannelsRuntime: this.toBool(populateChannelsRuntime) ?? true,
    });
  }

  // GET /event-catalogue/by-company-event?companyId=...&eventKey=...&populateDomainCatalogue=true
  @Get('by-company-event')
  @HttpCode(200)
  async getByCompanyAndEventKey(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('eventKey') eventKey: string,
    @Query('populateDomainCatalogue') populateDomainCatalogue?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.findByCompanyAndEventKey({
      companyId,
      eventKey,
      populateChannelsRuntime: this.toBool(populateDomainCatalogue) ?? true,
    });
  }

  // GET /event-catalogue?domainCatalogueId=...&active=true&populateDomainCatalogue=true
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List event catalogue entries' })
  @ApiQuery({ name: 'domainCatalogueId', required: true, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'populateDomainCatalogue', required: false, type: Boolean })
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
    @Headers('x-api-key') apiKey: string,
    @Query('domainCatalogueId') domainCatalogueId: string,
    @Query('active') active?: string,
    @Query('populateDomainCatalogue') populateDomainCatalogue?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertApiKey(apiKey);
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      limit,
      offset,
    );
    return this.service.findAll({
      domainCatalogueId,
      active: this.toBool(active),
      populateDomainCatalogue: this.toBool(populateDomainCatalogue) ?? true,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  // ✅ EASY: Buscar por companyId + eventKey (para preview/runtime)

  // GET /event-catalogue/:id?populateDomainCatalogue=true
  @Get(':id')
  @HttpCode(200)
  async getById(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Query('populateDomainCatalogue') populateDomainCatalogue?: string,
  ) {
    this.assertApiKey(apiKey);
    return this.service.getById({
      id,
      populateDomainCatalogue: this.toBool(populateDomainCatalogue) ?? true,
    });
  }

  // ✅ LIST

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Headers('x-api-key') apiKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventCatalogueDto,
  ) {
    this.assertApiKey(apiKey);
    return this.service.update(id, dto);
  }

  // ✅ GET BY ID (dejar SIEMPRE al final de los GET)

  @Delete(':id')
  @HttpCode(200)
  async remove(@Headers('x-api-key') apiKey: string, @Param('id') id: string) {
    this.assertApiKey(apiKey);
    return this.service.remove(id);
  }

  private assertApiKey(apiKey?: string) {
    const expected = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private toBool(v?: string) {
    if (v === undefined) return undefined;
    return v === 'true' || v === '1';
  }
}
