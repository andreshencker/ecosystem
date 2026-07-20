// src/controllers/communications/company-themes.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import { CompanyThemesCommunicationsClient } from './company-themes-client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/company-themes')
export class CompanyThemesController {
  constructor(private readonly client: CompanyThemesCommunicationsClient) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async list(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('active') active?: string,
  ) {
    const authHeader = req.headers.authorization;

    const activeBool =
      active === undefined ? undefined : active === 'true' || active === '1';

    const res = await this.client.list(
      {
        companyId: companyId?.trim() || undefined,
        active: activeBool,
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getById(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Req() req: Request, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.create(dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.updateById(id, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.removeById(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }
}
