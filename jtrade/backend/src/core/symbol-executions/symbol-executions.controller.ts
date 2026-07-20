// FILE: src/modules/symbol-executions/symbol-executions.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Types } from 'mongoose';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { SymbolExecutionsService } from './symbol-executions.service';
import { CreateSymbolExecutionDto } from './dto/create-symbol-execution.dto';
import { UpdateSymbolExecutionDto } from './dto/update-symbol-execution.dto';
import { SymbolExecutionMapper } from './mappers/symbol-execution.mapper';
import { SymbolExecutionResponseDto } from './dto/symbol-execution-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('symbol-executions')
export class SymbolExecutionsController {
  constructor(private readonly service: SymbolExecutionsService) {}

  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @Get('by-account')
  async byAccount(
      @Query('accountRef') accountRef: string,
      @Query('symbol') symbol?: string,
      @Query('timeframe') timeframe?: string,
  ) {
    return this.service.getByAccountRef(accountRef, symbol, timeframe);
  }

  @Roles(UserRole.CLIENT)
  @Get()
  async listMine(@Req() req: Request): Promise<SymbolExecutionResponseDto[]> {
    const userId = this.getUserId(req);
    const docs = await this.service.listMine(userId);

    return SymbolExecutionMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.CLIENT)
  @Post()
  async createMine(
      @Req() req: Request,
      @Body() dto: CreateSymbolExecutionDto,
  ): Promise<SymbolExecutionResponseDto> {
    const userId = this.getUserId(req);
    const created = await this.service.createMine(userId, dto);

    return SymbolExecutionMapper.toResponse(created as any);
  }

  @Roles(UserRole.CLIENT)
  @Patch(':id')
  async updateMine(
      @Req() req: Request,
      @Param('id') id: string,
      @Body() dto: UpdateSymbolExecutionDto,
  ): Promise<SymbolExecutionResponseDto> {
    const userId = this.getUserId(req);
    const updated = await this.service.updateMine(userId, id, dto);

    return SymbolExecutionMapper.toResponse(updated as any);
  }

  @Roles(UserRole.CLIENT)
  @Delete(':id')
  async removeMine(@Req() req: Request, @Param('id') id: string) {
    const userId = this.getUserId(req);

    return this.service.removeMine(userId, id);
  }

  private getUserId(req: Request): Types.ObjectId {
    const raw = (req as any)?.user?.id ?? (req as any)?.user?.sub;

    if (!raw) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    if (!Types.ObjectId.isValid(String(raw))) {
      throw new BadRequestException('Invalid user id');
    }

    return new Types.ObjectId(String(raw));
  }
}