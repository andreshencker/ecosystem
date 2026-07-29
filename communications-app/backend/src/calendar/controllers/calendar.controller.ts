// src/calendar/controllers/calendar.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { CalendarService } from '../services/calendar.service';
import { ConnectCalendarDto } from '../dto/connect-calendar.dto';
import {
  CreateCalendarResourceDto,
  UpdateCalendarResourceDto,
  SubscribeCalendarDto,
  CreateEventDto,
  UpdateEventDto,
  ListEventsQueryDto,
} from '../dto/calendar-operation.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  private resolveCompanyId(ctx: AuthContext | undefined): string {
    if (!ctx?.companyId) throw new UnauthorizedException('No company context');
    return ctx.companyId;
  }

  // ─── Connection management ────────────────────────────────────────────────

  @Post('connect')
  @HttpCode(201)
  @ApiOperation({ summary: 'Connect a calendar provider' })
  async connect(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ConnectCalendarDto,
  ): Promise<any> {
    return this.service.connect(this.resolveCompanyId(ctx), dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List calendar connections for this company' })
  async listConnections(@CurrentUser() ctx: AuthContext): Promise<any> {
    return this.service.listConnections(this.resolveCompanyId(ctx));
  }

  @Delete('connections/:credId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disconnect a calendar provider' })
  async disconnect(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
  ): Promise<any> {
    return this.service.disconnect(this.resolveCompanyId(ctx), credId);
  }

  @Post('connections/:credId/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test a calendar connection' })
  async testConnection(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
  ): Promise<any> {
    return this.service.testConnection(this.resolveCompanyId(ctx), credId);
  }

  // ─── Calendar management ──────────────────────────────────────────────────

  @Get('connections/:credId/calendars')
  @ApiOperation({ summary: 'List calendars' })
  async listCalendars(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
  ): Promise<any> {
    return {
      data: await this.service.listCalendars(
        this.resolveCompanyId(ctx),
        credId,
      ),
    };
  }

  @Post('connections/:credId/calendars')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a calendar' })
  async createCalendar(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Body() dto: CreateCalendarResourceDto,
  ): Promise<any> {
    return this.service.createCalendar(this.resolveCompanyId(ctx), credId, dto);
  }

  @Post('connections/:credId/calendars/subscribe')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Subscribe provider account to an external iCal URL',
  })
  async subscribeCalendar(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Body() dto: SubscribeCalendarDto,
  ): Promise<any> {
    return this.service.subscribeCalendar(
      this.resolveCompanyId(ctx),
      credId,
      dto,
    );
  }

  @Get('connections/:credId/calendars/:calId')
  @ApiOperation({ summary: 'Get a calendar' })
  async getCalendar(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
  ): Promise<any> {
    return this.service.getCalendar(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
    );
  }

  @Patch('connections/:credId/calendars/:calId')
  @ApiOperation({ summary: 'Update a calendar' })
  async updateCalendar(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Body() dto: UpdateCalendarResourceDto,
  ): Promise<any> {
    return this.service.updateCalendar(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      dto,
    );
  }

  @Delete('connections/:credId/calendars/:calId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a calendar' })
  async deleteCalendar(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
  ): Promise<any> {
    return this.service.deleteCalendar(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
    );
  }

  // ─── Event management ─────────────────────────────────────────────────────

  @Get('connections/:credId/calendars/:calId/events')
  @ApiOperation({ summary: 'List events' })
  async listEvents(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Query() query: ListEventsQueryDto,
  ): Promise<any> {
    return this.service.listEvents(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      query,
    );
  }

  @Post('connections/:credId/calendars/:calId/events')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an event' })
  async createEvent(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Body() dto: CreateEventDto,
  ): Promise<any> {
    return this.service.createEvent(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      dto,
    );
  }

  @Get('connections/:credId/calendars/:calId/events/:evId')
  @ApiOperation({ summary: 'Get an event' })
  async getEvent(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Param('evId') evId: string,
  ): Promise<any> {
    return this.service.getEvent(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      decodeURIComponent(evId),
    );
  }

  @Patch('connections/:credId/calendars/:calId/events/:evId')
  @ApiOperation({ summary: 'Update an event' })
  async updateEvent(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Param('evId') evId: string,
    @Body() dto: UpdateEventDto,
  ): Promise<any> {
    return this.service.updateEvent(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      decodeURIComponent(evId),
      dto,
    );
  }

  @Delete('connections/:credId/calendars/:calId/events/:evId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an event' })
  async deleteEvent(
    @CurrentUser() ctx: AuthContext,
    @Param('credId') credId: string,
    @Param('calId') calId: string,
    @Param('evId') evId: string,
  ): Promise<any> {
    return this.service.deleteEvent(
      this.resolveCompanyId(ctx),
      credId,
      decodeURIComponent(calId),
      decodeURIComponent(evId),
    );
  }
}
