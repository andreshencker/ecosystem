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

import { CommunicationEventsService } from './communication-events.service';
import { CreateCommunicationEventDto } from './dto/create-communication-event.dto';
import { UpdateCommunicationEventDto } from './dto/update-communication-event.dto';
import { CommunicationEventListQueryDto } from './dto/communication-event-list-query.dto';
import { CurrentUser } from '../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../infrastructure/security/types/auth-context.types';

@ApiTags('Settings — Communication Events')
@ApiBearerAuth()
@Controller('settings/communication-events')
export class CommunicationEventsController {
  constructor(private readonly events: CommunicationEventsService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  private resolveBusinessId(ctx: AuthContext): string {
    if (!ctx.companyId)
      throw new ForbiddenException('No business assigned to this account');
    return ctx.companyId;
  }

  // ─── Static routes (must come before /:id) ────────────────────────────────

  @Post('bulk')
  @HttpCode(201)
  @ApiOperation({ summary: 'Bulk import Communication Events into a purpose' })
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
  @ApiOperation({ summary: 'List Communication Events for a given Communication Purpose' })
  async list(
    @CurrentUser() ctx: AuthContext,
    @Query() query: CommunicationEventListQueryDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.list(businessId, query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new Communication Event' })
  async create(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateCommunicationEventDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.create(businessId, dto);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a Communication Event by ID' })
  async findOne(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.findOne(businessId, id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a Communication Event' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateCommunicationEventDto,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.update(businessId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a Communication Event' })
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    return this.events.remove(businessId, id);
  }
}
