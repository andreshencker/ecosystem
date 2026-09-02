// src/modules/alerts/alerts.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { AlertMapper } from './mappers/alert.mapper';
import { AlertResponseDto } from './dto/alert-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  // ==========================
  // LIST (docs individuales)
  // GET /alerts
  // ==========================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get()
  async list(@Query() query: QueryAlertsDto): Promise<AlertResponseDto[]> {
    const docs = await this.service.list(query);
    return AlertMapper.toResponseList(docs);
  }

  // ==========================
  // LIST GROUPS (1 fila por groupId)
  // GET /alerts/groups
  // ==========================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get('groups')
  async listGroups(@Query() query: QueryAlertsDto) {
    // OJO: esto devuelve un shape agrupado (no AlertResponseDto)
    return this.service.listGroups(query);
  }

  // ==========================
  // GET ONE (doc individual)
  // GET /alerts/:id
  // ==========================
  @Roles(UserRole.PROVIDER, UserRole.CLIENT)
  @Get(':id')
  async getById(@Param('id') id: string): Promise<AlertResponseDto> {
    const doc = await this.service.getById(id);
    return AlertMapper.toResponse(doc);
  }

  // ==========================
  // CREATE (crea BUY + SELL)
  // POST /alerts
  // ==========================
  @Roles(UserRole.PROVIDER)
  @Post()
  async create(@Body() dto: CreateAlertDto): Promise<AlertResponseDto[]> {
    const created = await this.service.create(dto);
    return AlertMapper.toResponseList(created);
  }

  // ==========================
  // UPDATE (actualiza grupo)
  // PATCH /alerts/:id
  // ==========================
  @Roles(UserRole.PROVIDER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<AlertResponseDto[]> {
    const updated = await this.service.update(id, dto);
    return AlertMapper.toResponseList(updated);
  }

  // ==========================
  // DELETE (elimina grupo)
  // DELETE /alerts/:id
  // ==========================
  @Roles(UserRole.PROVIDER)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
