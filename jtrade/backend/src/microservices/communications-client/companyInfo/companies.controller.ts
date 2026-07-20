// src/controllers/communications/companies.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import { CompaniesCommunicationsClient } from './companies-client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/companies')
export class CompaniesController {
  constructor(private readonly client: CompaniesCommunicationsClient) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async list(@Req() req: Request, @Query('active') active?: string) {
    const authHeader = req.headers.authorization;
    const parsed =
      active === undefined ? undefined : active === 'true' || active === '1';

    const res = await this.client.list(
      typeof parsed === 'boolean' ? { active: parsed } : undefined,
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get('by-key/:companyKey')
  async getByKey(@Req() req: Request, @Param('companyKey') companyKey: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getByKey(companyKey, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get(':companyId')
  async getById(@Req() req: Request, @Param('companyId') companyId: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getById(companyId, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':companyKey')
  async updateByKey(
    @Req() req: Request,
    @Param('companyKey') companyKey: string,
    @Body() dto: any,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.updateByKey(companyKey, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':companyKey')
  async removeByKey(
    @Req() req: Request,
    @Param('companyKey') companyKey: string,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.removeByKey(companyKey, authHeader);
    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }
}
