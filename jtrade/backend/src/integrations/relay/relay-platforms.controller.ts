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
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { ApplicationRole } from '../../core/auth/types/auth-context';
import { RelayPlatformsService } from './relay-platforms.service';
import type {
  CreateRelayPlatformInput,
  UpdateRelayPlatformInput,
} from './contracts/relay-platform.contract';

@Controller('platforms')
export class RelayPlatformsController {
  constructor(private readonly service: RelayPlatformsService) {}

  @Get()
  async list(@Query('active') active?: string) {
    const parsed = typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.service.list(parsed);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateRelayPlatformInput) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRelayPlatformInput) {
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
    const url = await this.service.uploadLogo(file);
    return this.service.update(id, { logoUrl: url });
  }
}
