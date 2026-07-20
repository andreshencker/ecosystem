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

import { EventCatalogueCommunicationsClient } from './event-catalogue.client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/event-catalogue')
export class EventCatalogueController {
  constructor(private readonly client: EventCatalogueCommunicationsClient) {}

  // ==========================
  // Helpers

  // ==========================
  @Roles(UserRole.ADMIN)
  @Get()
  async list(
    @Req() req: Request,
    @Query('domainCatalogueId') domainCatalogueId: string,
    @Query('active') active?: string,
    @Query('populateDomainCatalogue') populateDomainCatalogue?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.list(
      {
        domainCatalogueId,
        active: this.toBool(active),
        populateDomainCatalogue: this.toBool(populateDomainCatalogue) ?? true,
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  // ==========================
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;
    const res = await this.client.getById(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ==========================
  // LIST

  // ==========================
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Req() req: Request, @Body() dto: any) {
    const authHeader = req.headers.authorization;
    const res = await this.client.create(dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  // ==========================
  // GET BY ID

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

  // ==========================
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
