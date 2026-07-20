import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Types } from 'mongoose';

import { AdminIndicatorsService } from './admin-indicators.service';
import { CreateAdminIndicatorDto } from './dto/create-admin-indicator.dto';
import { UpdateAdminIndicatorDto } from './dto/update-admin-indicator.dto';
import { AdminIndicatorMapper } from './mappers/admin-indicator.mapper';
import { AdminIndicatorResponseDto } from './dto/admin-indicator-response.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('admin-indicators')
export class AdminIndicatorsController {
  constructor(private readonly service: AdminIndicatorsService) {}

  @Roles(UserRole.PROVIDER)
  @Get()
  async listMine(@Req() req: Request): Promise<AdminIndicatorResponseDto[]> {
    const providerUserId = this.getUserId(req);
    const docs = await this.service.listMine(providerUserId);
    return AdminIndicatorMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.PROVIDER)
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateAdminIndicatorDto,
  ): Promise<AdminIndicatorResponseDto> {
    const providerUserId = this.getUserId(req);
    const created = await this.service.createMine(providerUserId, dto);
    return AdminIndicatorMapper.toResponse(created as any);
  }

  @Roles(UserRole.PROVIDER)
  @Get(':id')
  async getById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<AdminIndicatorResponseDto> {
    const providerUserId = this.getUserId(req);
    const doc = await this.service.getMineById(providerUserId, id);
    return AdminIndicatorMapper.toResponse(doc as any);
  }

  @Roles(UserRole.PROVIDER)
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateAdminIndicatorDto,
  ): Promise<AdminIndicatorResponseDto> {
    const providerUserId = this.getUserId(req);
    const updated = await this.service.updateMine(providerUserId, id, dto);
    return AdminIndicatorMapper.toResponse(updated as any);
  }

  @Roles(UserRole.PROVIDER)
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    const providerUserId = this.getUserId(req);
    return this.service.removeMine(providerUserId, id);
  }

  @Roles(UserRole.PROVIDER)
  @Get(':id/webhook')
  async getWebhookKey(@Req() req: Request, @Param('id') id: string) {
    const providerUserId = this.getUserId(req);
    return this.service.getWebhookKeyMine(providerUserId, id);
  }

  @Roles(UserRole.PROVIDER)
  @Post(':id/webhook/reveal')
  async revealWebhook(@Req() req: Request, @Param('id') id: string) {
    const providerUserId = this.getUserId(req);
    return this.service.revealWebhookSecretMine(providerUserId, id);
  }

  @Roles(UserRole.PROVIDER)
  @Post(':id/webhook/rotate')
  async rotateWebhook(@Req() req: Request, @Param('id') id: string) {
    const providerUserId = this.getUserId(req);
    return this.service.rotateWebhookSecretMine(providerUserId, id);
  }

  private getUserId(req: Request): Types.ObjectId {
    const raw = (req as any)?.user?.sub;

    if (!raw) {
      throw new Error('Missing authenticated user');
    }

    if (!Types.ObjectId.isValid(String(raw))) {
      throw new Error('Invalid user id');
    }

    return new Types.ObjectId(String(raw));
  }
}
