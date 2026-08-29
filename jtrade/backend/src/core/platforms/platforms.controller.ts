import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole } from '../auth/types/auth-context';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@Controller('platforms')
export class PlatformsController {
  constructor(private readonly service: PlatformsService) {}

  @Get()
  async list(@Query('active') active?: string) {
    const parsed = typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.findAll({ active: parsed });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post()
  async create(@Body() dto: CreatePlatformDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadLogo(id, file);
  }
}
