// src/controllers/communications/company-channel-providers/company-channel-providers.controller.ts
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

import { CompanyChannelProvidersCommunicationsClient } from './company-channel-providers.client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/company-channel-providers')
export class CompanyChannelProvidersController {
  constructor(
    private readonly client: CompanyChannelProvidersCommunicationsClient,
  ) {}

  // ==========================
  @Roles(UserRole.ADMIN)
  @Get()
  async list(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('channelId') channelId?: string,
    @Query('active') active?: string,
    @Query('isDefault') isDefault?: string,
    @Query('populate') populate?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.list(
      {
        companyId,
        channelId,
        active: this.toBool(active),
        isDefault: this.toBool(isDefault),
        populate: this.toBool(populate),
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ==========================
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getById(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('populate') populate?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.getById(
      id,
      { populate: this.toBool(populate) },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ==========================
  // LIST

  // ==========================
  @Roles(UserRole.ADMIN)
  @Get('default/by-channel')
  async getDefaultByChannel(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('channelId') channelId: string,
    @Query('populate') populate?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.getDefaultByChannel(
      {
        companyId,
        channelId,
        populate: this.toBool(populate),
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ==========================
  // GET BY ID

  // ==========================
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Req() req: Request, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.create(dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ==========================
  // GET DEFAULT BY CHANNEL

  // ==========================
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.update(id, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ==========================
  // CREATE

  // ==========================
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.remove(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ==========================
  // UPDATE

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }

  // ==========================
  // DELETE

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;
    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1';
  }
}
