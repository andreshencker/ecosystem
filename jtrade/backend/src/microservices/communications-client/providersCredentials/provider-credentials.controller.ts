// src/controllers/communications/provider-credentials/provider-credentials.controller.ts
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

import {
  ProviderCredentialsCommunicationsClient,
  type ProviderCredentialChannel,
} from './provider-credentials.client';

import type { HttpResult } from '../communications-http.client';

@Controller('communications/provider-credentials')
export class ProviderCredentialsController {
  constructor(
    private readonly client: ProviderCredentialsCommunicationsClient,
  ) {}

  /**
   * OPTIONS para selects
   * GET /communications/provider-credentials/options?companyId=...&active=true
   */
  @Roles(UserRole.ADMIN)
  @Get('options')
  async options(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('channel') channel?: ProviderCredentialChannel,
    @Query('active') active?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.options(
      {
        companyId: String(companyId ?? ''),
        channel,
        active: this.toBool(active),
      },
      authHeader,
    );

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
  @Get()
  async list(
    @Req() req: Request,
    @Query('companyChannelProviderId') companyChannelProviderId: string,
    @Query('active') active?: string,
    @Query('populate') populate?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.list(
      {
        companyChannelProviderId,
        active: this.toBool(active),
        populate: this.toBool(populate),
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get('debug/decrypted')
  async debugDecrypted(
    @Req() req: Request,
    @Query('companyChannelProviderId') companyChannelProviderId: string,
    @Query('tag') tag: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.debugDecrypted(
      { companyChannelProviderId, tag },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  /**
   * IMPORTANTE: este debe ir después de options y debug/decrypted
   */
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
      { populate: this.toBool(populate) ?? false },
      authHeader,
    );

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
