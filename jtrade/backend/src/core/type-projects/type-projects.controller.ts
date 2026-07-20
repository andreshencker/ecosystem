import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { TypeProjectsService } from './type-projects.service';
import { CreateTypeProjectDto } from './dto/create-type-project.dto';
import { UpdateTypeProjectDto } from './dto/update-type-project.dto';
import { TypeProjectResponseDto } from './dto/type-project-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('type-projects')
export class TypeProjectsController {
  constructor(private readonly typeProjectsService: TypeProjectsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateTypeProjectDto,
  ): Promise<TypeProjectResponseDto> {
    return this.typeProjectsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<TypeProjectResponseDto[]> {
    return this.typeProjectsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async findActive(): Promise<TypeProjectResponseDto[]> {
    return this.typeProjectsService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('seed')
  async seedDefaults(): Promise<{ seeded: boolean; count: number }> {
    return this.typeProjectsService.seedDefaults();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TypeProjectResponseDto> {
    return this.typeProjectsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTypeProjectDto,
  ): Promise<TypeProjectResponseDto> {
    return this.typeProjectsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deactivate(@Param('id') id: string): Promise<{ deactivated: boolean }> {
    return this.typeProjectsService.deactivate(id);
  }
}
