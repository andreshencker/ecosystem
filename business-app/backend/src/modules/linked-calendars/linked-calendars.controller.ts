import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { LinkedCalendarsService } from './linked-calendars.service';
import { LinkCalendarsDto } from './dto/link-calendars.dto';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { SubscribeByUrlDto } from './dto/subscribe-by-url.dto';
import { SubscribeFromCatalogueDto } from './dto/subscribe-from-catalogue.dto';
import { SetupCalendarDto } from './dto/setup-calendar.dto';
import { DiscoverHolidaysDto } from './dto/discover-holidays.dto';
import { LinkHolidayCalendarDto } from './dto/link-holiday-calendar.dto';
import { UpdateLinkedCalendarDto } from './dto/update-linked-calendar.dto';
import { LinkedCalendarQueryDto } from './dto/linked-calendar-query.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { CALENDAR_FLOWS } from './schemas/linked-calendar.schema';
import type { CalendarFlow } from './schemas/linked-calendar.schema';

@ApiTags('Linked Calendars')
@ApiBearerAuth()
@Controller('linked-calendars')
export class LinkedCalendarsController {
  constructor(private readonly service: LinkedCalendarsService) {}

  private resolveContext(ctx: AuthContext) {
    if (!ctx.companyId) {
      throw new ForbiddenException('No business assigned to this account');
    }
    return {
      companyId: ctx.companyId,
      actor: {
        userId: ctx.userId ?? '',
        email: ctx.email ?? '',
        firstName: (ctx as any).firstName ?? '',
        companyId: ctx.companyId,
      },
    };
  }

  // ─── Available accounts ───────────────────────────────────────────────────

  @Get('accounts')
  @HttpCode(200)
  @ApiOperation({ summary: 'List available calendar accounts from Relay' })
  async listAccounts(@CurrentUser() ctx: AuthContext) {
    const { companyId } = this.resolveContext(ctx);
    const accounts = await this.service.listAvailableAccounts(companyId);
    return { data: accounts };
  }

  // ─── Available calendars ──────────────────────────────────────────────────

  @Get('accounts/:connectionId/calendars')
  @HttpCode(200)
  @ApiOperation({
    summary: 'List calendars for an account with linked status overlay',
  })
  async listAccountCalendars(
    @CurrentUser() ctx: AuthContext,
    @Param('connectionId') connectionId: string,
  ) {
    const { companyId } = this.resolveContext(ctx);
    const calendars = await this.service.listAvailableCalendars(
      companyId,
      connectionId,
    );
    return { data: calendars };
  }

  // ─── Flow-filtered safe options ───────────────────────────────────────────

  @Get('options')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Return active calendars for a given flow (safe — no credentials)',
  })
  @ApiQuery({ name: 'flow', enum: CALENDAR_FLOWS, required: true })
  async getOptions(
    @CurrentUser() ctx: AuthContext,
    @Query('flow') flow: CalendarFlow,
  ) {
    const { companyId } = this.resolveContext(ctx);
    if (!flow || !(CALENDAR_FLOWS as string[]).includes(flow)) {
      throw new BadRequestException(
        `flow is required and must be one of: ${CALENDAR_FLOWS.join(', ')}`,
      );
    }
    const items = await this.service.getOptions(companyId, flow);
    return { data: items };
  }

  // ─── Linked calendars CRUD ────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'List linked calendars for the authenticated Business',
  })
  async findAll(
    @CurrentUser() ctx: AuthContext,
    @Query() query: LinkedCalendarQueryDto,
  ) {
    const { companyId } = this.resolveContext(ctx);
    const items = await this.service.findAll(companyId, query);
    return { data: items, total: items.length };
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a linked calendar by ID' })
  async findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId } = this.resolveContext(ctx);
    const item = await this.service.findById(id, companyId);
    if (!item) throw new NotFoundException('Linked calendar not found');
    return item;
  }

  @Post('link')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Link one or more existing provider calendars to this Business',
  })
  async linkCalendars(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: LinkCalendarsDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    const items = await this.service.linkCalendars(companyId, dto, actor);
    return { data: items };
  }

  @Post('create')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new calendar in the provider and immediately link it',
  })
  async createCalendar(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateCalendarDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    const item = await this.service.createAndLinkCalendar(
      companyId,
      dto,
      actor,
    );
    return item;
  }

  @Post('subscribe-url')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Subscribe provider account to an external iCal URL and link it',
  })
  async subscribeByUrl(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: SubscribeByUrlDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    const item = await this.service.subscribeByUrl(companyId, dto, actor);
    return item;
  }

  @Post('subscribe-catalogue')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Subscribe to a Business App catalogue calendar and link it',
  })
  async subscribeFromCatalogue(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: SubscribeFromCatalogueDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    const item = await this.service.subscribeFromCatalogue(
      companyId,
      dto,
      actor,
    );
    return item;
  }

  @Get('catalogue')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Return safe public calendar catalogue entries for a country',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'ISO 2-letter country code (e.g. AU)',
  })
  async getCatalogue(
    @CurrentUser() ctx: AuthContext,
    @Query('country') country: string = 'AU',
  ) {
    this.resolveContext(ctx);
    const entries = this.service.getCatalogueForCountry(country.toUpperCase());
    return { data: entries };
  }

  // ─── One-click setup ──────────────────────────────────────────────────────

  @Post('setup/payment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'One-click: create a payment calendar and link it. Idempotent.',
  })
  async setupPaymentCalendar(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: SetupCalendarDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.setupPaymentCalendar(companyId, dto, actor);
  }

  @Post('setup/australian-holidays')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'One-click: subscribe to Australian public holidays and link it. Idempotent.',
  })
  async setupAustralianHolidays(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: SetupCalendarDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.setupAustralianHolidays(companyId, dto, actor);
  }

  @Post('setup/australian-holidays/discover')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Discover unlinked Australian holiday calendars from provider after manual setup.',
  })
  async discoverAustralianHolidays(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: DiscoverHolidaysDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.discoverAustralianHolidays(companyId, dto, actor);
  }

  @Post('setup/australian-holidays/link-selected')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Link a selected provider calendar as the Australian holiday calendar.',
  })
  async linkHolidayCalendar(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: LinkHolidayCalendarDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.linkProviderCalendarAsHoliday(companyId, dto, actor);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update status of a linked calendar (active | paused)',
  })
  async updateStatus(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateLinkedCalendarDto,
  ) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.updateStatus(id, companyId, dto, actor);
  }

  @Patch(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a paused linked calendar' })
  async activate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.activate(id, companyId, actor);
  }

  @Patch(':id/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pause an active linked calendar' })
  async pause(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.pause(id, companyId, actor);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unlink a calendar from this Business (local only)',
  })
  async unlink(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { companyId, actor } = this.resolveContext(ctx);
    return this.service.unlink(id, companyId, actor);
  }
}
