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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

import { UserProjectPlatformsService } from './user-project-platforms.service';
import { CreateUserProjectPlatformDto } from './dto/create-user-project-platform.dto';
import { UpdateUserProjectPlatformDto } from './dto/update-user-project-platform.dto';
import { UserProjectPlatformResponseDto } from './dto/user-project-platform-response.dto';
import { UserProjectPlatformMapper } from './mappers/user-project-platform.mapper';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-project-platforms')
export class UserProjectPlatformsController {
  constructor(private readonly service: UserProjectPlatformsService) {}

  @Roles(UserRole.CLIENT)
  @Get('my')
  async listMine(
    @Req() req: Request,
  ): Promise<UserProjectPlatformResponseDto[]> {
    const userId = this.getUserId(req);
    const docs = await this.service.listMine(userId);

    return UserProjectPlatformMapper.toResponseList(docs);
  }

  @Roles(UserRole.CLIENT)
  @Post('my')
  async createMine(
    @Req() req: Request,
    @Body() dto: CreateUserProjectPlatformDto,
  ): Promise<UserProjectPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.createMine(userId, dto);

    return UserProjectPlatformMapper.toResponse(doc);
  }

  @Roles(UserRole.CLIENT)
  @Get('my/:id')
  async findMineById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<UserProjectPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.findMineById(userId, id);

    return UserProjectPlatformMapper.toResponse(doc);
  }

  @Roles(UserRole.CLIENT)
  @Patch('my/:id')
  async updateMine(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserProjectPlatformDto,
  ): Promise<UserProjectPlatformResponseDto> {
    const userId = this.getUserId(req);
    const doc = await this.service.updateMine(userId, id, dto);

    return UserProjectPlatformMapper.toResponse(doc);
  }

  @Roles(UserRole.CLIENT)
  @Patch('my/:id/downloaded')
  async markDownloaded(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ updated: boolean }> {
    const userId = this.getUserId(req);

    return this.service.markDownloaded(userId, id);
  }

  @Roles(UserRole.CLIENT)
  @Delete('my/:id')
  async removeMine(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean }> {
    const userId = this.getUserId(req);

    return this.service.removeMine(userId, id);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async listAll(
    @Query('userId') userId?: string,
    @Query('projectCodePlatformId') projectCodePlatformId?: string,
    @Query('isActive') isActive?: string,
  ): Promise<UserProjectPlatformResponseDto[]> {
    const docs = await this.service.listAll({
      userId,
      projectCodePlatformId,
      isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
    });

    return UserProjectPlatformMapper.toResponseList(docs);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async adminUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateUserProjectPlatformDto,
  ): Promise<UserProjectPlatformResponseDto> {
    const doc = await this.service.adminUpdate(id, dto);

    return UserProjectPlatformMapper.toResponse(doc);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async adminRemove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.service.adminRemove(id);
  }

  private getUserId(req: Request): string {
    const userId = (req as any)?.user?.sub ?? (req as any)?.user?.id;

    if (!userId) {
      throw new Error('Missing authenticated user');
    }

    return String(userId);
  }
}
