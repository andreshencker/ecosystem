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
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlatformResponseDto } from './dto/platform-response.dto';

@Controller('platforms')
export class PlatformsController {
  constructor(private readonly service: PlatformsService) {}

  /**
   * GET /platforms?supported=true|false
   * Por ahora protegido con JWT (puedes abrirlo si lo necesitas público).
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Query('supported') supported?: string,
  ): Promise<PlatformResponseDto[]> {
    const sup =
      typeof supported === 'string'
        ? supported.toLowerCase() === 'true'
        : undefined;

    return this.service.findAll({ supported: sup as any });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string): Promise<PlatformResponseDto> {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreatePlatformDto): Promise<PlatformResponseDto> {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformDto,
  ): Promise<PlatformResponseDto> {
    return this.service.update(id, dto);
  }

  /** DELETE /platforms/:id — solo ADMIN */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.service.remove(id);
  }
}
