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

import { TypeProductsService } from './type-products.service';
import { CreateTypeProductDto } from './dto/create-type-product.dto';
import { UpdateTypeProductDto } from './dto/update-type-product.dto';
import { TypeProductResponseDto } from './dto/type-product-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApplicationRole } from '../auth/types/auth-context';

@Controller('type-products')
export class TypeProductsController {
  constructor(private readonly typeProductsService: TypeProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateTypeProductDto,
  ): Promise<TypeProductResponseDto> {
    return this.typeProductsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<TypeProductResponseDto[]> {
    return this.typeProductsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async findActive(): Promise<TypeProductResponseDto[]> {
    return this.typeProductsService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Post('seed')
  async seedDefaults(): Promise<{ seeded: boolean; count: number }> {
    return this.typeProductsService.seedDefaults();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TypeProductResponseDto> {
    return this.typeProductsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTypeProductDto,
  ): Promise<TypeProductResponseDto> {
    return this.typeProductsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ApplicationRole.ADMIN)
  @Delete(':id')
  async deactivate(@Param('id') id: string): Promise<{ deactivated: boolean }> {
    return this.typeProductsService.deactivate(id);
  }
}
