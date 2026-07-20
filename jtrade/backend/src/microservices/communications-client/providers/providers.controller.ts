// src/controllers/communications/providers/providers.controller.ts
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

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import { ProvidersCommunicationsClient } from './providers.client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/providers')
export class ProvidersController {
  constructor(private readonly client: ProvidersCommunicationsClient) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async list(
    @Req() req: Request,
    @Query('active') active?: string,
    @Query('channelId') channelId?: string,
    @Query('populate') populate?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.list(
      {
        active: this.toBool(active),
        channelId,
        populate: this.toBool(populate),
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
  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.update(id, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.remove(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;
    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1';
  }
}
