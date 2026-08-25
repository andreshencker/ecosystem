import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RelayEventsService } from './relay-events.service';
import { CreateRelayEventDto } from './dto/create-relay-event.dto';
import { UpdateRelayEventDto } from './dto/update-relay-event.dto';
import { RelayEventListQueryDto } from './dto/relay-event-list-query.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

@ApiTags('Settings — Relay Events')
@ApiBearerAuth()
@Controller('settings/relay-events')
export class RelayEventsController {
  constructor(private readonly events: RelayEventsService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  private resolveBusinessId(ctx: AuthContext): string {
    if (!ctx.companyId)
      throw new ForbiddenException('No business assigned to this account');
    return ctx.companyId;
  }

  // ─── Static routes (must come before /:id) ────────────────────────────────

  @Post('bulk')
  @HttpCode(201)
  @ApiOperation({ summary: 'Bulk import Relay Events into a purpose' })
  async bulkImport(
    @CurrentUser() ctx: AuthContext,
    @Body() body: { domainCatalogueId: string; items: Record<string, any>[] },
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.bulkImport(
      businessId,
      body.domainCatalogueId,
      body.items ?? [],
    );
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List Relay Events for a given Relay Purpose' })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query() query: RelayEventListQueryDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.list(businessId, query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new Relay Event' })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateRelayEventDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.create(businessId, dto);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a Relay Event by ID' })
  async findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.findOne(businessId, id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a Relay Event' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateRelayEventDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.update(businessId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a Relay Event' })
  async remove(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.remove(businessId, id);
  }
}
