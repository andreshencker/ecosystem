// src/controllers/communications/channels/channels-catalogue.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import { ChannelsCatalogueCommunicationsClient } from './channels-catalogue.client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/channels')
export class ChannelsCatalogueController {
  constructor(private readonly client: ChannelsCatalogueCommunicationsClient) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async list(@Req() req: Request, @Query('active') active?: string) {
    const authHeader = req.headers.authorization;

    const activeBool =
      active === undefined ? undefined : active === 'true' || active === '1';

    const res = await this.client.list(
      typeof activeBool === 'boolean' ? { active: activeBool } : undefined,
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get('by-key')
  async getByKey(@Req() req: Request, @Query('channelKey') channelKey: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getByKey(channelKey, authHeader);
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
  @Put()
  async update(
    @Req() req: Request,
    @Query('channelKey') channelKey: string,
    @Body() dto: any,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.updateByKey(channelKey, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Delete()
  async remove(@Req() req: Request, @Query('channelKey') channelKey: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.removeByKey(channelKey, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }
}
