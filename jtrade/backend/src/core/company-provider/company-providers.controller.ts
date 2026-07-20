import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { CompanyProvidersService } from './company-providers.service';

import { CreateCompanyProviderDto } from './dto/create-company-provider.dto';

import { UpdateCompanyProviderDto } from './dto/update-company-provider.dto';

import { CompanyProviderResponseDto } from './dto/company-provider-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../users/schemas/user.schema';

@Controller('company-providers')
export class CompanyProvidersController {
  constructor(
    private readonly companyProvidersService: CompanyProvidersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Post('me')
  async createMyCompany(
    @Req() req: Request,
    @Body() dto: CreateCompanyProviderDto,
  ): Promise<CompanyProviderResponseDto> {
    const userId = (req as any).user.sub;

    return this.companyProvidersService.createMyCompany(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('me')
  async findMyCompany(
    @Req() req: Request,
  ): Promise<CompanyProviderResponseDto | null> {
    const userId = (req as any).user.sub;

    return this.companyProvidersService.findMyCompany(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Patch('me')
  async updateMyCompany(
    @Req() req: Request,
    @Body() dto: UpdateCompanyProviderDto,
  ): Promise<CompanyProviderResponseDto> {
    const userId = (req as any).user.sub;

    return this.companyProvidersService.updateMyCompany(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(): Promise<CompanyProviderResponseDto[]> {
    return this.companyProvidersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CompanyProviderResponseDto> {
    return this.companyProvidersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deactivate(@Param('id') id: string): Promise<{ deactivated: boolean }> {
    return this.companyProvidersService.deactivate(id);
  }
}
