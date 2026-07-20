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
  DomainCatalogueCommunicationsClient,
  type DomainChannel,
} from './domain-catalogue.client';

import type { HttpResult } from '../communications-http.client';

@Controller('communications/domain-catalogue')
export class DomainCatalogueController {
  constructor(private readonly client: DomainCatalogueCommunicationsClient) {}

  // ==========================
  // BULK
  // ==========================
  @Roles(UserRole.ADMIN)
  @Patch('bulk/credentials')
  async bulkUpdateCredentials(
    @Req() req: Request,
    @Body()
    body: {
      companyId: string;
      domainIds: string[];
      channel: DomainChannel;
      providerCredentialsId: string;
    },
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.bulkUpdateCredentials({
      companyId: String(body?.companyId ?? ''),
      domainIds: Array.isArray(body?.domainIds) ? body.domainIds : [],
      channel: this.normalizeChannel(body?.channel),
      providerCredentialsId: String(body?.providerCredentialsId ?? ''),
      authHeader,
    });

    return this.unwrapOrThrow(res);
  }

  // ==========================
  // CREDENTIALS
  // These routes must be before :id routes
  // ==========================
  @Roles(UserRole.ADMIN)
  @Get(':id/credentials')
  async getCredentials(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;

    const res = await this.client.getCredentials(id, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/credentials/:channel')
  async updateCredential(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('channel') channel: string,
    @Body() body: { providerCredentialsId: string },
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.updateCredential({
      domainId: id,
      channel: this.normalizeChannel(channel),
      providerCredentialsId: String(body?.providerCredentialsId ?? ''),
      authHeader,
    });

    return this.unwrapOrThrow(res);
  }

  // ==========================
  // CRUD
  // ==========================
  @Roles(UserRole.ADMIN)
  @Get()
  async list(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('active') active?: string,
  ) {
    const authHeader = req.headers.authorization;

    const res = await this.client.list(
      {
        companyId: String(companyId ?? ''),
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
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const authHeader = req.headers.authorization;

    const res = await this.client.getById(id, authHeader);
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

  // ==========================
  // Helpers
  // ==========================
  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;

    throw new HttpException(
      res.message ?? 'Communications upstream error',
      res.status || 502,
    );
  }

  private toBool(v?: string): boolean | undefined {
    if (typeof v !== 'string') return undefined;

    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1';
  }

  private normalizeChannel(v: any): DomainChannel {
    const s = String(v ?? '')
      .toLowerCase()
      .trim();

    if (s !== 'email' && s !== 'sms') {
      throw new HttpException('Invalid channel. Use email or sms.', 400);
    }

    return s;
  }
}
