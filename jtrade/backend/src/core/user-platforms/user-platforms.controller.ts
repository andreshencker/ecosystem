import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Types } from 'mongoose';

import { UserPlatformsService } from './user-platforms.service';

import { CreateUserPlatformDto } from './dto/create-user-platform.dto';
import { UpdateUserPlatformDto } from './dto/update-user-platform.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { UserPlatformResponseDto } from './dto/user-platform-response.dto';
import { UserPlatformMapper } from './mappers/user-platform.mapper';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminCreateUserPlatformDto } from './dto/admin-create-user-platform.dto';
import { AdminUpdateUserPlatformDto } from './dto/admin-update-user-platform.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-platforms')
export class UserPlatformsController {
  constructor(private readonly service: UserPlatformsService) {}

  // ==========================
  // CLIENT / ME
  // ==========================
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Get()
  async listMine(@Req() req: Request): Promise<UserPlatformResponseDto[]> {
    const userId = this.getUserId(req);
    const docs = await this.service.listMine(userId);
    return UserPlatformMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateUserPlatformDto,
  ): Promise<UserPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.createMine(
      userId,
      dto.platformId,
      dto.isDefault,
    );
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Get(':id')
  async getById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.getMineById(userId, id);
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Patch(':id/default')
  async setDefault(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.setDefaultMine(userId, id);
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Patch(':id/status')
  async changeStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ): Promise<UserPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.changeStatusMine(userId, id, dto.status);
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserPlatformDto,
  ): Promise<UserPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.updateMine(userId, id, dto);
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    const userId = this.getUserId(req);
    return this.service.removeMine(userId, id);
  }

  // ==========================
  // ADMIN (GLOBAL)
  // ==========================
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  async listAll(
    @Query('userId') userId?: string,
    @Query('platformId') platformId?: string,
    @Query('isActive') isActive?: string,
    @Query('role') role?: 'admin' | 'client' | 'investor',
  ): Promise<UserPlatformResponseDto[]> {
    const docs = await this.service.listAll({
      userId,
      platformId,
      isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
      role,
    });
    return UserPlatformMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin')
  async adminCreate(
    @Body() dto: AdminCreateUserPlatformDto,
  ): Promise<UserPlatformResponseDto> {
    const doc = await this.service.adminCreate(dto);
    return UserPlatformMapper.toResponse(doc as any);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  async adminUpdate(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserPlatformDto,
  ): Promise<UserPlatformResponseDto> {
    const doc = await this.service.adminUpdate(id, dto as any);
    return UserPlatformMapper.toResponse(doc as any);
  }

  private getUserId(req: Request): Types.ObjectId {
    const raw = (req as any)?.user?.sub;
    if (!raw) throw new Error('Missing authenticated user');
    if (!Types.ObjectId.isValid(String(raw)))
      throw new Error('Invalid user id');
    return new Types.ObjectId(String(raw));
  }
}
