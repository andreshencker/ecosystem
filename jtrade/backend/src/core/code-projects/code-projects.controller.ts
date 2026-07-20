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

import { CodeProjectsService } from './code-projects.service';
import { CreateCodeProjectDto } from './dto/create-code-project.dto';
import { UpdateCodeProjectDto } from './dto/update-code-project.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('code-projects')
export class CodeProjectsController {
  constructor(private readonly service: CodeProjectsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post('my')
  @HttpCode(201)
  async createMyProject(
    @Req() req: Request,
    @Body() dto: CreateCodeProjectDto,
  ) {
    const userId = (req as any).user.sub;
    return this.service.createMyProject(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my')
  @HttpCode(200)
  async findMyProjects(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.service.findMyProjects(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('my/:id')
  @HttpCode(200)
  async findMyProjectById(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.service.findMyProjectById(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Patch('my/:id')
  @HttpCode(200)
  async updateMyProject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCodeProjectDto,
  ) {
    const userId = (req as any).user.sub;
    return this.service.updateMyProject(userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Delete('my/:id')
  @HttpCode(200)
  async removeMyProject(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.sub;
    return this.service.removeMyProject(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @HttpCode(200)
  async findAll(
    @Query('active') active?: string,
    @Query('companyProviderId') companyProviderId?: string,
    @Query('typeProjectId') typeProjectId?: string,
  ) {
    const activeBool =
      active === undefined ? undefined : active === 'true' || active === '1';

    return this.service.findAll({
      active: activeBool,
      companyProviderId,
      typeProjectId,
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
