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

import { ProjectCodePlatformsService } from './project-code-platforms.service';
import { CreateProjectCodePlatformDto } from './dto/create-project-code-platform.dto';
import { UpdateProjectCodePlatformDto } from './dto/update-project-code-platform.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('project-code-platforms')
export class ProjectCodePlatformsController {
  constructor(private readonly service: ProjectCodePlatformsService) {}

  // =====================================================
  // PROVIDER
  // =====================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post('my')
  @HttpCode(201)
  async createMyProjectPlatform(
    @Req() req: Request,
    @Body() dto: CreateProjectCodePlatformDto,
  ) {
    const userId = (req as any).user.sub;
    return this.service.createMyProjectPlatform(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my')
  @HttpCode(200)
  async findMyProjectPlatforms(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.service.findMyProjectPlatforms(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my/:id')
  @HttpCode(200)
  async findMyProjectPlatformById(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = (req as any).user.sub;
    return this.service.findMyProjectPlatformById(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Patch('my/:id')
  @HttpCode(200)
  async updateMyProjectPlatform(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProjectCodePlatformDto,
  ) {
    const userId = (req as any).user.sub;
    return this.service.updateMyProjectPlatform(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Delete('my/:id')
  @HttpCode(200)
  async removeMyProjectPlatform(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.service.removeMyProjectPlatform(userId, id);
  }

  // =====================================================
  // CLIENT
  // =====================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Get('available')
  @HttpCode(200)
  async findAvailableForClient() {
    return this.service.findAvailableForClient();
  }

  // =====================================================
  // ADMIN
  // =====================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @HttpCode(200)
  async findAll(
    @Query('active') active?: string,
    @Query('codeProjectId') codeProjectId?: string,
    @Query('platformId') platformId?: string,
  ) {
    const activeBool =
      active === undefined ? undefined : active === 'true' || active === '1';

    return this.service.findAll({
      active: activeBool,
      codeProjectId,
      platformId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(200)
  async deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
