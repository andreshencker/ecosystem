import {
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

import { ShiftsService } from './shifts.service';
import { ShiftSyncService } from './sync/services/shift-sync.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignContractDto } from './dto/assign-contract.dto';
import { BulkAssignContractDto } from './dto/bulk-assign-contract.dto';
import { toShiftResponse } from './dto/shift-response.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly shifts: ShiftsService,
    private readonly syncService: ShiftSyncService,
  ) {}

  private resolveContext(ctx: AuthContext) {
    if (!ctx.companyId)
      throw new ForbiddenException('No business assigned to this account');
    return {
      businessId: ctx.companyId,
      actor: {
        userId:    (ctx as any).userId ?? (ctx as any).sub ?? '',
        email:     ctx.email ?? '',
        firstName: (ctx as any).firstName ?? '',
        companyId: ctx.companyId,
      },
    };
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger calendar sync for all active linked calendars' })
  async triggerSync(@CurrentUser() ctx: AuthContext) {
    const { businessId, actor } = this.resolveContext(ctx);
    return this.syncService.syncBusiness(businessId, actor);
  }

  @Post('sync/:linkedCalendarId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger calendar sync for a single linked calendar' })
  async triggerSyncSingle(
    @CurrentUser() ctx: AuthContext,
    @Param('linkedCalendarId') linkedCalendarId: string,
  ) {
    const { businessId, actor } = this.resolveContext(ctx);
    return this.syncService.syncSingleCalendar(businessId, linkedCalendarId, actor);
  }

  @Get('sync/history')
  @HttpCode(200)
  @ApiOperation({ summary: 'List sync history entries for the authenticated business' })
  @ApiQuery({ name: 'page',             required: false, type: Number })
  @ApiQuery({ name: 'limit',            required: false, type: Number })
  @ApiQuery({ name: 'linkedCalendarId', required: false })
  async getSyncHistory(
    @CurrentUser() ctx: AuthContext,
    @Query('page')             page?:             string,
    @Query('limit')            limit?:            string,
    @Query('linkedCalendarId') linkedCalendarId?: string,
  ) {
    const { businessId } = this.resolveContext(ctx);
    return this.syncService.getSyncHistory(businessId, {
      page:  Math.max(1, Number(page  ?? 1)),
      limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
      linkedCalendarId,
    });
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List shifts for the authenticated business' })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  @ApiQuery({ name: 'contractId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status',     required: false })
  @ApiQuery({ name: 'date',       required: false })
  @ApiQuery({ name: 'dateFrom',   required: false })
  @ApiQuery({ name: 'dateTo',     required: false })
  @ApiQuery({ name: 'search',     required: false })
  @ApiQuery({ name: 'source',           required: false, description: 'calendar | manual' })
  @ApiQuery({ name: 'linkedCalendarId', required: false })
  async findAll(
    @CurrentUser() ctx: AuthContext,
    @Query('page')             page?:             string,
    @Query('limit')            limit?:            string,
    @Query('contractId')       contractId?:       string,
    @Query('customerId')       customerId?:       string,
    @Query('status')           status?:           string,
    @Query('date')             date?:             string,
    @Query('dateFrom')         dateFrom?:         string,
    @Query('dateTo')           dateTo?:           string,
    @Query('search')           search?:           string,
    @Query('source')           source?:           string,
    @Query('linkedCalendarId') linkedCalendarId?: string,
  ) {
    const { businessId } = this.resolveContext(ctx);
    const result = await this.shifts.findAll(businessId, {
      page:  Math.max(1, Number(page  ?? 1)),
      limit: Math.min(100, Math.max(1, Number(limit ?? 20))),
      contractId,
      customerId,
      status,
      date,
      dateFrom,
      dateTo,
      search,
      source,
      linkedCalendarId,
    });
    return { ...result, items: result.items.map(toShiftResponse) };
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a shift by ID' })
  async findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId } = this.resolveContext(ctx);
    const doc = await this.shifts.findById(id, businessId);
    if (!doc) throw new NotFoundException('Shift not found');
    return toShiftResponse(doc);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new shift (status=draft)' })
  async create(@CurrentUser() ctx: AuthContext, @Body() dto: CreateShiftDto) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.shifts.create(businessId, dto, actor);
    return toShiftResponse(doc);
  }

  @Patch('contracts/bulk')
  @HttpCode(200)
  @ApiOperation({ summary: 'Bulk assign Contracts to multiple Shifts in one atomic operation' })
  async bulkAssignContracts(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: BulkAssignContractDto,
  ) {
    const { businessId, actor } = this.resolveContext(ctx);
    return this.shifts.bulkAssignContracts(businessId, dto.assignments, actor);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a shift' })
  async update(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.shifts.update(id, businessId, dto, actor);
    return toShiftResponse(doc);
  }

  @Patch(':id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a shift (draft → confirmed)' })
  async confirm(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.shifts.confirm(id, businessId, actor);
    return toShiftResponse(doc);
  }

  @Patch(':id/assign-contract')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assign (or reassign) a Contract to a Shift' })
  async assignContract(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Body() dto: AssignContractDto,
  ) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.shifts.assignContract(id, businessId, dto.contractId, actor);
    return toShiftResponse(doc);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a shift' })
  async cancel(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    const doc = await this.shifts.cancel(id, businessId, actor);
    return toShiftResponse(doc);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a draft shift permanently' })
  async remove(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    const { businessId, actor } = this.resolveContext(ctx);
    await this.shifts.remove(id, businessId, actor);
    return { deleted: true };
  }
}
