import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../../core/users/schemas/user.schema';

import { BinanceAccountsPlatformClient } from './binance-accounts.platform-client';
import type { HttpResult } from '../../orchestrator-http.client';

@Controller('binance/binance-accounts')
export class BinanceAccountsController {
  constructor(private readonly client: BinanceAccountsPlatformClient) {}

  @Roles(UserRole.CLIENT)
  @Get()
  async listAll(@Req() req: Request, @Query('platformId') platformId?: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.listAll({ platformId }, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.CLIENT)
  @Post()
  async create(@Req() req: Request, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.create(dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.CLIENT)
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getById(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.CLIENT)
  @Patch(':id/default')
  async setDefault(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.setDefault(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.CLIENT)
  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.update(id, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.CLIENT)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.remove(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;

    // Si 3003 devolvió error, lo convertimos a HttpException para que:
    // - HttpExceptionFilter lo convierta en {status:'error', ...}
    // - ResponseInterceptor NO lo envuelva como success
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }
}
