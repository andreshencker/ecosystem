import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';

import { TypeProductsService } from './type-products.service';
import { CreateTypeProductDto } from './dto/create-type-product.dto';
import { UpdateTypeProductDto } from './dto/update-type-product.dto';
import { ReorderTypeProductsDto } from './dto/reorder-type-products.dto';
import { TypeProductResponseDto } from './dto/type-product-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole, type AuthContext } from '../auth/types/auth-context';

type AuthRequest = Request & { user: AuthContext };
const iconUpload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

@Controller('type-products')
export class TypeProductsController {
  constructor(private readonly typeProductsService: TypeProductsService) {}

  // ── ADMIN ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateTypeProductDto): Promise<TypeProductResponseDto> {
    return this.typeProductsService.create(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Patch('reorder')
  reorder(@Req() req: AuthRequest, @Body() dto: ReorderTypeProductsDto): Promise<TypeProductResponseDto[]> {
    return this.typeProductsService.reorder(dto.orderedIds, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTypeProductDto,
  ): Promise<TypeProductResponseDto> {
    return this.typeProductsService.update(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post(':id/icon')
  @UseInterceptors(iconUpload)
  setIcon(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TypeProductResponseDto> {
    return this.typeProductsService.setIcon(id, file, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.typeProductsService.remove(id);
  }

  // ── ANY AUTHENTICATED USER (providers select from these) ──────────────────

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<TypeProductResponseDto[]> {
    return this.typeProductsService.findAll();
  }

  /** The list a provider chooses from before starting Product Onboarding. */
  @UseGuards(JwtAuthGuard)
  @Get('active')
  findActive(): Promise<TypeProductResponseDto[]> {
    return this.typeProductsService.findActive();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<TypeProductResponseDto> {
    return this.typeProductsService.findOne(id);
  }
}
