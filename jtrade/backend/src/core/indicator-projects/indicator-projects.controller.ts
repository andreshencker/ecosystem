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
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { IndicatorProjectsService } from './indicator-projects.service';
import { CreateIndicatorProjectDto } from './dto/create-indicator-project.dto';
import { UpdateIndicatorProjectDto } from './dto/update-indicator-project.dto';
import { IndicatorProjectMapper } from './mappers/indicator-project.mapper';
import { IndicatorProjectResponseDto } from './dto/indicator-project-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('indicator-projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IndicatorProjectsController {
  constructor(private readonly service: IndicatorProjectsService) {}

  @Roles(UserRole.PROVIDER)
  @Post('my')
  @HttpCode(201)
  async createMine(
    @Req() req: Request,
    @Body() dto: CreateIndicatorProjectDto,
  ): Promise<IndicatorProjectResponseDto> {
    const userId = (req as any).user.sub;
    const created = await this.service.createMine(userId, dto);

    return IndicatorProjectMapper.toResponse(created);
  }

  @Roles(UserRole.CLIENT)
  @Get('available')
  @HttpCode(200)
  async listAvailableForClient(
    @Req() req: Request,
    @Query('userProjectPlatformId') userProjectPlatformId?: string,
  ): Promise<IndicatorProjectResponseDto[]> {
    const userId = (req as any).user.sub;

    const docs = await this.service.listAvailableForClient(
      userId,
      userProjectPlatformId,
    );

    return IndicatorProjectMapper.toResponseList(docs);
  }

  @Roles(UserRole.PROVIDER)
  @Get('my')
  @HttpCode(200)
  async listMine(@Req() req: Request): Promise<IndicatorProjectResponseDto[]> {
    const userId = (req as any).user.sub;
    const docs = await this.service.listMine(userId);

    return IndicatorProjectMapper.toResponseList(docs);
  }

  @Roles(UserRole.PROVIDER)
  @Get('my/:id')
  @HttpCode(200)
  async findMineById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<IndicatorProjectResponseDto> {
    const userId = (req as any).user.sub;
    const doc = await this.service.findMineById(userId, id);

    return IndicatorProjectMapper.toResponse(doc);
  }

  @Roles(UserRole.PROVIDER)
  @Patch('my/:id')
  @HttpCode(200)
  async updateMine(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateIndicatorProjectDto,
  ): Promise<IndicatorProjectResponseDto> {
    const userId = (req as any).user.sub;
    const updated = await this.service.updateMine(userId, id, dto);

    return IndicatorProjectMapper.toResponse(updated);
  }

  @Roles(UserRole.PROVIDER)
  @Delete('my/:id')
  @HttpCode(200)
  async removeMine(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    const userId = (req as any).user.sub;

    return this.service.removeMine(userId, id);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @HttpCode(200)
  async findAll(
    @Query('companyProviderId') companyProviderId?: string,
    @Query('projectCodePlatformId') projectCodePlatformId?: string,
    @Query('indicatorId') indicatorId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<IndicatorProjectResponseDto[]> {
    const parsedIsActive =
      isActive === undefined
        ? undefined
        : isActive === 'true' || isActive === '1';

    const docs = await this.service.findAll({
      companyProviderId,
      projectCodePlatformId,
      indicatorId,
      isActive: parsedIsActive,
    });

    return IndicatorProjectMapper.toResponseList(docs);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string): Promise<IndicatorProjectResponseDto> {
    const doc = await this.service.findOne(id);

    return IndicatorProjectMapper.toResponse(doc);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(200)
  async deactivate(@Param('id') id: string): Promise<{ deactivated: boolean }> {
    return this.service.deactivate(id);
  }
}
